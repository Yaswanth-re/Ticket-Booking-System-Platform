import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import qrcode from 'qrcode';
import { getAppUrl } from '@/lib/config';

// GET /api/bookings/[id] - Fetch single booking details with QR code
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        event: { include: { venue: true } },
        bookingSeats: {
          include: {
            eventSeat: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Role protection: Customer can only view their own booking
    if (user.role === 'CUSTOMER' && booking.customerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Organiser can only view their own event's bookings
    if (user.role === 'ORGANISER' && booking.event.organiserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate QR Code image on the fly if not stored in DB (backward compatibility)
    const appUrl = getAppUrl();
    const qrDataUrl = await qrcode.toDataURL(`${appUrl}/tickets/${booking.bookingReference}`);

    return NextResponse.json({
      booking: {
        ...booking,
        qrDataUrl,
      },
    });
  } catch (error) {
    console.error('Fetch booking error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
