import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { releaseSeatToWaitlistOrAvailable } from '@/lib/cleanup';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookingId } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingSeats: {
          include: {
            eventSeat: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Authorization: Only the customer who owns it, or an Admin can cancel
    if (user.role !== 'ADMIN' && booking.customerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this booking' }, { status: 403 });
    }

    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Booking cannot be cancelled (already cancelled or expired)' }, { status: 400 });
    }

    // Cancel in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update Booking status to CANCELLED
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      // 2. Release each seat
      for (const bs of booking.bookingSeats) {
        // Use our helper to assign to waitlist or set to AVAILABLE
        await releaseSeatToWaitlistOrAvailable(
          tx,
          bs.eventSeatId,
          booking.eventId,
          bs.eventSeat.categoryId
        );
      }
    });

    return NextResponse.json({
      message: 'Booking cancelled successfully, seats released.',
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
