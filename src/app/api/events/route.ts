import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/events - Browse, search and filter events
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const location = searchParams.get('location') || '';
    const date = searchParams.get('date') || '';
    const priceLimit = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null;

    // Build Prisma query filters
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (location) {
      whereClause.venue = {
        location: { equals: location, mode: 'insensitive' },
      };
    }

    if (date) {
      whereClause.date = date; // Expecting YYYY-MM-DD
    }

    if (priceLimit !== null && !isNaN(priceLimit)) {
      whereClause.categories = {
        some: {
          price: { lte: priceLimit },
        },
      };
    }

    // Fetch events
    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        venue: true,
        categories: true,
        eventSeats: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Format events with dynamic seat availability status
    const formattedEvents = events.map((event) => {
      const totalSeats = event.eventSeats.length;
      const availableSeats = event.eventSeats.filter((s) => s.status === 'AVAILABLE').length;

      let availabilityStatus = 'AVAILABLE';
      if (availableSeats === 0) {
        availabilityStatus = 'SOLD_OUT';
      } else if (availableSeats <= 5 || availableSeats / totalSeats <= 0.1) {
        availabilityStatus = 'LIMITED';
      }

      // Starting price is the minimum price category
      const startingPrice = event.categories.length > 0 
        ? Math.min(...event.categories.map((c) => c.price)) 
        : 0;

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        date: event.date,
        time: event.time,
        venue: event.venue,
        categories: event.categories,
        totalSeats,
        availableSeats,
        availabilityStatus,
        startingPrice,
      };
    });

    return NextResponse.json({ events: formattedEvents });
  } catch (error) {
    console.error('Fetch events error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/events - Create a new event and instantiate event seats (Organiser & Admin only)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ORGANISER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Organisers and Admins only' }, { status: 403 });
    }

    const { title, description, imageUrl, date, time, venueId, ticketPrices } = await request.json();

    if (!title || !description || !imageUrl || !date || !time || !venueId || !ticketPrices) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { venueSeats: true },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 400 });
    }

    if (venue.venueSeats.length === 0) {
      return NextResponse.json({ error: 'Venue does not have a configured seat layout' }, { status: 400 });
    }

    // Set prices for categories: e.g. ticketPrices = { Premium: 150, Standard: 80, Economy: 50 }
    const premiumPrice = parseFloat(ticketPrices.Premium || 0);
    const standardPrice = parseFloat(ticketPrices.Standard || 0);
    const economyPrice = parseFloat(ticketPrices.Economy || 0);

    const newEvent = await prisma.$transaction(async (tx) => {
      // 1. Create the event
      const event = await tx.event.create({
        data: {
          title,
          description,
          imageUrl,
          date,
          time,
          venueId,
          organiserId: user.id,
        },
      });

      // 2. Count seats per category in the venue layout
      const premiumCount = venue.venueSeats.filter(s => s.category === 'Premium').length;
      const standardCount = venue.venueSeats.filter(s => s.category === 'Standard').length;
      const economyCount = venue.venueSeats.filter(s => s.category === 'Economy').length;

      // 3. Create TicketCategory records
      const categoriesData = [
        { eventId: event.id, name: 'Premium', price: premiumPrice, totalSeats: premiumCount },
        { eventId: event.id, name: 'Standard', price: standardPrice, totalSeats: standardCount },
        { eventId: event.id, name: 'Economy', price: economyPrice, totalSeats: economyCount },
      ];
      await tx.ticketCategory.createMany({ data: categoriesData });
      
      const createdCategories = await tx.ticketCategory.findMany({
        where: { eventId: event.id },
      });

      const catMap = createdCategories.reduce((acc, cat) => {
        acc[cat.name] = cat;
        return acc;
      }, {} as Record<string, any>);

      // 4. Create EventSeat records linked to the Venue Seats
      const eventSeatsData = venue.venueSeats.map((vs) => {
        const cat = catMap[vs.category];
        return {
          eventId: event.id,
          venueSeatId: vs.id,
          categoryId: cat.id,
          price: cat.price,
          status: 'AVAILABLE' as const,
          rowName: vs.rowName,
          seatNumber: vs.seatNumber,
        };
      });

      await tx.eventSeat.createMany({
        data: eventSeatsData,
      });

      return event;
    });

    return NextResponse.json({
      message: 'Event created successfully',
      event: newEvent,
    });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
