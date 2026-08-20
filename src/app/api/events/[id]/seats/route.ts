import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { runCleanup } from '@/lib/cleanup';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const user = await getCurrentUser();

    // 1. Run on-demand cleanup first to release expired holds/offers
    await runCleanup();

    // 2. Fetch seats for the event
    const seats = await prisma.eventSeat.findMany({
      where: { eventId },
      orderBy: [
        { rowName: 'asc' },
        { seatNumber: 'asc' },
      ],
      include: {
        category: {
          select: {
            name: true,
            price: true,
          },
        },
      },
    });

    // 3. Fetch active holds for the current user (if logged in) for this event
    let activeHolds: any[] = [];
    if (user) {
      activeHolds = await prisma.seatHold.findMany({
        where: {
          customerId: user.id,
          eventId,
          status: 'ACTIVE',
        },
        select: {
          eventSeatId: true,
          expiresAt: true,
        },
      });
    }

    // 4. Also fetch active waitlist offers for the current user (if any)
    let activeOffers: any[] = [];
    if (user) {
      activeOffers = await prisma.waitlistOffer.findMany({
        where: {
          waitlist: {
            customerId: user.id,
            eventId,
          },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          eventSeatId: true,
          expiresAt: true,
        },
      });
    }

    // Format the response
    const formattedSeats = seats.map((seat) => {
      let status = seat.status;
      let holdsUser = false;
      let offersUser = false;
      let offerId = null;

      // Check if this seat is held by the current user
      const userHold = activeHolds.find((h) => h.eventSeatId === seat.id);
      if (userHold) {
        holdsUser = true;
      }

      // Check if this seat is offered to the current user
      const userOffer = activeOffers.find((o) => o.eventSeatId === seat.id);
      if (userOffer) {
        offersUser = true;
        offerId = userOffer.id;
      }

      return {
        id: seat.id,
        rowName: seat.rowName,
        seatNumber: seat.seatNumber,
        category: seat.category.name,
        price: seat.price,
        status,
        holdsUser,
        offersUser,
        offerId,
      };
    });

    return NextResponse.json({
      seats: formattedSeats,
      activeHolds: activeHolds.map(h => ({
        eventSeatId: h.eventSeatId,
        expiresAt: h.expiresAt.toISOString(),
      })),
      activeOffers: activeOffers.map(o => ({
        id: o.id,
        eventSeatId: o.eventSeatId,
        expiresAt: o.expiresAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Fetch seats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
