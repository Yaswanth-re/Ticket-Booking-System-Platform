import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { releaseSeatToWaitlistOrAvailable } from '@/lib/cleanup';

export async function POST(request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { offerId } = await params;

    const offer = await prisma.waitlistOffer.findUnique({
      where: { id: offerId },
      include: {
        waitlist: {
          select: {
            customerId: true,
            eventId: true,
            categoryId: true,
          },
        },
        eventSeat: true,
      },
    });

    if (!offer || offer.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Offer is invalid or has already been processed.' }, { status: 404 });
    }

    if (offer.waitlist.customerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: This offer does not belong to you' }, { status: 403 });
    }

    // Process decline in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark offer as DECLINED
      await tx.waitlistOffer.update({
        where: { id: offerId },
        data: { status: 'DECLINED' },
      });

      // 2. Mark waitlist entry as CANCELLED (user declined)
      await tx.waitlist.update({
        where: { id: offer.waitlistId },
        data: { status: 'CANCELLED' },
      });

      // 3. Release seat to next in queue
      await releaseSeatToWaitlistOrAvailable(
        tx,
        offer.eventSeatId,
        offer.waitlist.eventId,
        offer.waitlist.categoryId
      );
    });

    return NextResponse.json({ message: 'Offer declined successfully.' });
  } catch (error) {
    console.error('Decline offer error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
