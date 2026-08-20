import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { runCleanup } from '@/lib/cleanup';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized: Customers only' }, { status: 401 });
    }

    const { eventSeatIds, eventId, action } = await request.json();

    if (!eventSeatIds || !Array.isArray(eventSeatIds) || eventSeatIds.length === 0 || !eventId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Default hold duration: 10 minutes
    const HOLD_DURATION_MS = 10 * 60 * 1000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);

    // 1. Run cleanup first to clear expired holds
    await runCleanup();

    if (action === 'hold') {
      try {
        // Run database transaction to hold all seats atomically
        const holds = await prisma.$transaction(async (tx) => {
          const createdHolds = [];

          for (const seatId of eventSeatIds) {
            // Atomic update to lock the row and change status from AVAILABLE to HELD
            const updatedSeats: any[] = await tx.$queryRaw`
              UPDATE "EventSeat"
              SET "status" = 'HELD', "updatedAt" = ${now}
              WHERE "id" = ${seatId} AND "status" = 'AVAILABLE'
              RETURNING *;
            `;

            if (updatedSeats.length === 0) {
              // Seat is no longer available. Fetch seat info to show a clear error
              const seatInfo = await tx.eventSeat.findUnique({
                where: { id: seatId },
              });
              const seatLabel = seatInfo ? `${seatInfo.rowName}${seatInfo.seatNumber}` : 'Selected seat';
              throw new Error(`Seat ${seatLabel} is no longer available.`);
            }

            // Create SeatHold record
            const hold = await tx.seatHold.create({
              data: {
                customerId: user.id,
                eventId,
                eventSeatId: seatId,
                expiresAt,
                status: 'ACTIVE',
              },
            });

            createdHolds.push(hold);
          }

          return createdHolds;
        });

        return NextResponse.json({
          message: 'Seats held successfully',
          holds: holds.map(h => ({
            eventSeatId: h.eventSeatId,
            expiresAt: h.expiresAt.toISOString(),
          })),
        });
      } catch (transactionError: any) {
        return NextResponse.json({ error: transactionError.message || 'Failed to hold seats' }, { status: 409 });
      }
    } else if (action === 'release') {
      // Release held seats
      await prisma.$transaction(async (tx) => {
        for (const seatId of eventSeatIds) {
          // Verify hold belongs to the user
          const hold = await tx.seatHold.findFirst({
            where: {
              eventSeatId: seatId,
              customerId: user.id,
              status: 'ACTIVE',
            },
          });

          if (hold) {
            // Delete/Expire the hold record
            await tx.seatHold.update({
              where: { id: hold.id },
              data: { status: 'RELEASED' },
            });

            // Set seat status back to AVAILABLE (or offer to waitlist if applicable)
            // Query the category first
            const seat = await tx.eventSeat.findUnique({
              where: { id: seatId },
            });

            if (seat && seat.status === 'HELD') {
              // Call releaseSeatToWaitlistOrAvailable from our cleanup module
              const { releaseSeatToWaitlistOrAvailable } = await import('@/lib/cleanup');
              await releaseSeatToWaitlistOrAvailable(tx, seatId, eventId, seat.categoryId);
            }
          }
        }
      });

      return NextResponse.json({ message: 'Seats released successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be "hold" or "release"' }, { status: 400 });
    }
  } catch (error) {
    console.error('Seat hold error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
