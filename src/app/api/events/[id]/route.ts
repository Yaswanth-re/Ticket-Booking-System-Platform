import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/events/[id] - Fetch single event details
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        categories: {
          orderBy: { price: 'asc' },
        },
        eventSeats: {
          select: {
            id: true,
            status: true,
            price: true,
            rowName: true,
            seatNumber: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const totalSeats = event.eventSeats.length;
    const availableSeats = event.eventSeats.filter((s) => s.status === 'AVAILABLE').length;

    let availabilityStatus = 'AVAILABLE';
    if (availableSeats === 0) {
      availabilityStatus = 'SOLD_OUT';
    } else if (availableSeats <= 5 || availableSeats / totalSeats <= 0.1) {
      availabilityStatus = 'LIMITED';
    }

    return NextResponse.json({
      event: {
        ...event,
        totalSeats,
        availableSeats,
        availabilityStatus,
      },
    });
  } catch (error) {
    console.error('Fetch event details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/events/[id] - Update event details (Organiser or Admin only)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ORGANISER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { title, description, imageUrl, date, time } = await request.json();

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Ensure user is the organiser of the event, or an admin
    if (user.role !== 'ADMIN' && event.organiserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this event' }, { status: 403 });
    }

    if (!title || !description || !imageUrl || !date || !time) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { title, description, imageUrl, date, time },
    });

    return NextResponse.json({
      message: 'Event updated successfully',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Update event error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/events/[id] - Delete an event (Organiser or Admin only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ORGANISER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Ensure user is the organiser of the event, or an admin
    if (user.role !== 'ADMIN' && event.organiserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this event' }, { status: 403 });
    }

    // Check if the event has active bookings
    const bookingCount = await prisma.booking.count({
      where: {
        eventId: id,
        status: 'CONFIRMED',
      },
    });

    if (bookingCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete event: Tickets have already been booked. Please cancel bookings first.',
      }, { status: 400 });
    }

    // Delete event (will cascade delete eventSeats and ticketCategories)
    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
