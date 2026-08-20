import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { runCleanup } from '@/lib/cleanup';
import { sendEmail } from '@/lib/email';
import qrcode from 'qrcode';
import { getAppUrl } from '@/lib/config';

// GET /api/bookings - Retrieve user booking history
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let bookings;
    if (user.role === 'ADMIN') {
      bookings = await prisma.booking.findMany({
        include: {
          customer: { select: { name: true, email: true } },
          event: { include: { venue: true } },
          bookingSeats: { include: { eventSeat: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'ORGANISER') {
      // Find bookings for events managed by this organiser
      bookings = await prisma.booking.findMany({
        where: {
          event: { organiserId: user.id },
        },
        include: {
          customer: { select: { name: true, email: true } },
          event: { include: { venue: true } },
          bookingSeats: { include: { eventSeat: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Customer
      bookings = await prisma.booking.findMany({
        where: { customerId: user.id },
        include: {
          event: { include: { venue: true } },
          bookingSeats: { include: { eventSeat: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/bookings - Checkout held seats or accept waitlist offer
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventSeatIds, eventId, offerId } = await request.json();

    // 1. Run cleanup on-demand first
    await runCleanup();

    const now = new Date();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const bookingReference = `TBS-${now.getFullYear()}-${rand}`;

    // Handle checkout of a waitlist offer
    if (offerId) {
      const offer = await prisma.waitlistOffer.findUnique({
        where: { id: offerId },
        include: {
          waitlist: {
            include: {
              customer: true,
              event: { include: { venue: true } },
              category: true,
            },
          },
          eventSeat: true,
        },
      });

      if (!offer || offer.status !== 'ACTIVE' || offer.expiresAt < now) {
        return NextResponse.json({ error: 'This offer has expired or is invalid.' }, { status: 400 });
      }

      if (offer.waitlist.customerId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized: This offer does not belong to you.' }, { status: 403 });
      }

      const totalAmount = offer.eventSeat.price;

      // Complete booking in a transaction
      const booking = await prisma.$transaction(async (tx) => {
        // Create booking
        const newBooking = await tx.booking.create({
          data: {
            bookingReference,
            customerId: user.id,
            eventId: offer.waitlist.eventId,
            totalAmount,
            status: 'CONFIRMED',
          },
        });

        // Link seat
        await tx.bookingSeat.create({
          data: {
            bookingId: newBooking.id,
            eventSeatId: offer.eventSeatId,
            price: totalAmount,
          },
        });

        // Set seat status to BOOKED
        await tx.eventSeat.update({
          where: { id: offer.eventSeatId },
          data: { status: 'BOOKED' },
        });

        // Update offer to ACCEPTED
        await tx.waitlistOffer.update({
          where: { id: offerId },
          data: { status: 'ACCEPTED' },
        });

        // Update waitlist entry to COMPLETED
        await tx.waitlist.update({
          where: { id: offer.waitlistId },
          data: { status: 'COMPLETED' },
        });

        return newBooking;
      });

      // Generate QR Code containing verification URL
      const appUrl = getAppUrl();
      const qrDataUrl = await qrcode.toDataURL(`${appUrl}/tickets/${bookingReference}`);

      // Send email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #4caf50;">Booking Confirmed!</h2>
          <p>Dear ${offer.waitlist.customer.name},</p>
          <p>Your ticket booking for <strong>${offer.waitlist.event.title}</strong> is confirmed!</p>
          <div style="background-color: #f7f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Booking Reference:</strong> ${bookingReference}</p>
            <p style="margin: 5px 0;"><strong>Event:</strong> ${offer.waitlist.event.title}</p>
            <p style="margin: 5px 0;"><strong>Venue:</strong> ${offer.waitlist.event.venue.name} (${offer.waitlist.event.venue.location})</p>
            <p style="margin: 5px 0;"><strong>Date/Time:</strong> ${offer.waitlist.event.date} at ${offer.waitlist.event.time}</p>
            <p style="margin: 5px 0;"><strong>Seat:</strong> Row ${offer.eventSeat.rowName}, Seat ${offer.eventSeat.seatNumber}</p>
            <p style="margin: 5px 0;"><strong>Price Paid:</strong> $${totalAmount.toFixed(2)}</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <p><strong>Your QR Ticket:</strong></p>
            <img src="${qrDataUrl}" alt="QR Ticket" style="width: 150px; height: 150px;"/>
          </div>
        </div>
      `;

      sendEmail({
        to: offer.waitlist.customer.email,
        subject: `Booking Confirmed: ${offer.waitlist.event.title} (Ref: ${bookingReference})`,
        html: emailHtml,
      }).catch(err => console.error('Error sending confirmation email:', err));

      return NextResponse.json({
        message: 'Booking confirmed',
        bookingReference,
        bookingId: booking.id,
      });
    }

    // Handle normal seat hold checkout
    if (!eventSeatIds || !Array.isArray(eventSeatIds) || eventSeatIds.length === 0 || !eventId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Fetch details in a transaction
    try {
      const result = await prisma.$transaction(async (tx) => {
        const seatsToBook = [];
        let total = 0;

        for (const seatId of eventSeatIds) {
          // Check hold exists
          const hold = await tx.seatHold.findFirst({
            where: {
              eventSeatId: seatId,
              customerId: user.id,
              status: 'ACTIVE',
              expiresAt: { gte: now },
            },
            include: {
              eventSeat: true,
            },
          });

          if (!hold) {
            throw new Error(`Hold for seat is expired or invalid.`);
          }

          seatsToBook.push(hold.eventSeat);
          total += hold.eventSeat.price;
        }

        // Create booking record
        const newBooking = await tx.booking.create({
          data: {
            bookingReference,
            customerId: user.id,
            eventId,
            totalAmount: total,
            status: 'CONFIRMED',
          },
        });

        // Link seats, update seat statuses, and complete holds
        for (const seat of seatsToBook) {
          await tx.bookingSeat.create({
            data: {
              bookingId: newBooking.id,
              eventSeatId: seat.id,
              price: seat.price,
            },
          });

          await tx.eventSeat.update({
            where: { id: seat.id },
            data: { status: 'BOOKED' },
          });

          await tx.seatHold.update({
            where: { eventSeatId: seat.id },
            data: { status: 'RELEASED' }, // Mark old hold released as it is now booked
          });
        }

        return { newBooking, seatsToBook };
      });

      // Generate QR Code containing verification URL
      const appUrl = getAppUrl();
      const qrDataUrl = await qrcode.toDataURL(`${appUrl}/tickets/${bookingReference}`);

      // Fetch event details for email
      const eventDetails = await prisma.event.findUnique({
        where: { id: eventId },
        include: { venue: true },
      });

      const customerDetails = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (eventDetails && customerDetails) {
        const seatsLabel = result.seatsToBook.map(s => `${s.rowName}${s.seatNumber}`).join(', ');
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #4caf50;">Booking Confirmed!</h2>
            <p>Dear ${customerDetails.name},</p>
            <p>Your tickets for <strong>${eventDetails.title}</strong> have been booked successfully.</p>
            <div style="background-color: #f7f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Booking Reference:</strong> ${bookingReference}</p>
              <p style="margin: 5px 0;"><strong>Event:</strong> ${eventDetails.title}</p>
              <p style="margin: 5px 0;"><strong>Venue:</strong> ${eventDetails.venue.name} (${eventDetails.venue.location})</p>
              <p style="margin: 5px 0;"><strong>Date/Time:</strong> ${eventDetails.date} at ${eventDetails.time}</p>
              <p style="margin: 5px 0;"><strong>Seats:</strong> ${seatsLabel}</p>
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${result.newBooking.totalAmount.toFixed(2)}</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
              <p><strong>Your QR Ticket:</strong></p>
              <img src="${qrDataUrl}" alt="QR Ticket" style="width: 150px; height: 150px;"/>
            </div>
          </div>
        `;

        sendEmail({
          to: customerDetails.email,
          subject: `Booking Confirmed: ${eventDetails.title} (Ref: ${bookingReference})`,
          html: emailHtml,
        }).catch(err => console.error('Error sending confirmation email:', err));
      }

      return NextResponse.json({
        message: 'Booking confirmed successfully',
        bookingReference,
        bookingId: result.newBooking.id,
      });
    } catch (transactionError: any) {
      return NextResponse.json({ error: transactionError.message || 'Booking checkout failed' }, { status: 400 });
    }
  } catch (error) {
    console.error('Booking checkout error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
