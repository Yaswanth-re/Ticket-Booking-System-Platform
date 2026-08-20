import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ORGANISER') {
      return NextResponse.json({ error: 'Forbidden: Organisers only' }, { status: 403 });
    }

    // 1. Get all events created by this organiser
    const events = await prisma.event.findMany({
      where: { organiserId: user.id },
      include: {
        venue: true,
        categories: true,
        eventSeats: {
          select: { status: true, price: true },
        },
        bookings: {
          where: { status: 'CONFIRMED' },
          select: { totalAmount: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    let totalTicketsSold = 0;
    let totalRevenue = 0;
    let totalAvailableSeats = 0;
    let totalCapacity = 0;

    const eventDetails = events.map((event) => {
      const capacity = event.eventSeats.length;
      const sold = event.eventSeats.filter(s => s.status === 'BOOKED').length;
      const available = event.eventSeats.filter(s => s.status === 'AVAILABLE').length;
      const revenue = event.bookings.reduce((sum, b) => sum + b.totalAmount, 0);

      totalTicketsSold += sold;
      totalRevenue += revenue;
      totalAvailableSeats += available;
      totalCapacity += capacity;

      return {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        venueName: event.venue.name,
        capacity,
        sold,
        available,
        revenue,
      };
    });

    return NextResponse.json({
      stats: {
        totalTicketsSold,
        totalRevenue,
        totalAvailableSeats,
        totalCapacity,
        eventsCount: events.length,
      },
      events: eventDetails,
    });
  } catch (error) {
    console.error('Fetch organiser stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
