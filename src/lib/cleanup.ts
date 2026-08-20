import prisma from './db';
import { sendEmail } from './email';
import { getAppUrl } from './config';

// Helper to assign a released seat to the next waitlisted user or make it available
export async function releaseSeatToWaitlistOrAvailable(tx: any, eventSeatId: string, eventId: string, categoryId: string) {
  // Find the first WAITING entry in the waitlist for this event & category, ordered by queue position
  const nextWaitlist = await tx.waitlist.findFirst({
    where: {
      eventId,
      categoryId,
      status: 'WAITING',
    },
    orderBy: { queuePosition: 'asc' },
  });

  if (nextWaitlist) {
    const now = new Date();
    // Default offer expiry: 10 minutes
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    // Create the waitlist offer
    const offer = await tx.waitlistOffer.create({
      data: {
        waitlistId: nextWaitlist.id,
        eventSeatId,
        offeredAt: now,
        expiresAt,
        status: 'ACTIVE',
      },
    });

    // Mark waitlist entry as OFFERED
    await tx.waitlist.update({
      where: { id: nextWaitlist.id },
      data: { status: 'OFFERED' },
    });

    // Update seat status to HELD (reserved for waitlisted user)
    await tx.eventSeat.update({
      where: { id: eventSeatId },
      data: { status: 'HELD' },
    });

    // Fetch details for email notification
    const event = await tx.event.findUnique({
      where: { id: eventId },
      include: { venue: true },
    });
    
    const customer = await tx.user.findUnique({
      where: { id: nextWaitlist.customerId },
    });

    const category = await tx.ticketCategory.findUnique({
      where: { id: categoryId },
    });

    if (customer && event && category) {
      const claimLink = `${getAppUrl()}/customer/waitlist?offerId=${offer.id}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #0070f3;">Good News! A Seat is Available</h2>
          <p>Dear ${customer.name},</p>
          <p>A seat has become available for <strong>${event.title}</strong> in your waitlisted category (<strong>${category.name}</strong>).</p>
          <p>As the next person in the queue, we have reserved this seat for you temporarily.</p>
          <div style="background-color: #f7f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Event:</strong> ${event.title}</p>
            <p style="margin: 5px 0;"><strong>Venue:</strong> ${event.venue.name} (${event.venue.location})</p>
            <p style="margin: 5px 0;"><strong>Date/Time:</strong> ${event.date} at ${event.time}</p>
            <p style="margin: 5px 0;"><strong>Category:</strong> ${category.name}</p>
            <p style="margin: 5px 0;"><strong>Price:</strong> $${category.price.toFixed(2)}</p>
          </div>
          <p style="color: #e53e3e; font-weight: bold;">IMPORTANT: You have 10 minutes to complete your booking. If you do not claim it, this offer will expire and pass to the next person in line.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${claimLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Claim Your Ticket Now</a>
          </div>
          <p style="font-size: 12px; color: #888;">If you do not want this ticket, you can decline it on your dashboard or let the timer run out.</p>
        </div>
      `;

      // Trigger email non-blocking
      sendEmail({
        to: customer.email,
        subject: `Waitlist Ticket Offer: ${event.title}`,
        html: emailHtml,
      }).catch(err => console.error('Error in sendEmail during waitlist offer:', err));
    }
  } else {
    // If no one is on the waitlist, update the event seat to AVAILABLE
    await tx.eventSeat.update({
      where: { id: eventSeatId },
      data: { status: 'AVAILABLE' },
    });
  }
}

// Main clean up routine. Expires holds and waitlist offers that have timed out.
export async function runCleanup() {
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // 1. Find all ACTIVE seat holds that have expired
    const expiredHolds = await tx.seatHold.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      include: {
        eventSeat: true,
      },
    });

    for (const hold of expiredHolds) {
      // Mark hold as EXPIRED
      await tx.seatHold.update({
        where: { id: hold.id },
        data: { status: 'EXPIRED' },
      });

      // Release seat (check waitlist or make available)
      await releaseSeatToWaitlistOrAvailable(
        tx,
        hold.eventSeatId,
        hold.eventId,
        hold.eventSeat.categoryId
      );
    }

    // 2. Find all ACTIVE waitlist offers that have expired
    const expiredOffers = await tx.waitlistOffer.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      include: {
        eventSeat: true,
        waitlist: true,
      },
    });

    for (const offer of expiredOffers) {
      // Mark offer as EXPIRED
      await tx.waitlistOffer.update({
        where: { id: offer.id },
        data: { status: 'EXPIRED' },
      });

      // Mark waitlist queue entry as EXPIRED
      await tx.waitlist.update({
        where: { id: offer.waitlistId },
        data: { status: 'EXPIRED' },
      });

      // Release seat (assigns to the next waitlisted user or makes it available)
      await releaseSeatToWaitlistOrAvailable(
        tx,
        offer.eventSeatId,
        offer.waitlist.eventId,
        offer.waitlist.categoryId
      );
    }

    return {
      expiredHoldsCount: expiredHolds.length,
      expiredOffersCount: expiredOffers.length,
    };
  });
}
