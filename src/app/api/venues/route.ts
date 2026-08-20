import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/venues - Retrieve all venues
export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        _count: {
          select: { venueSeats: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ venues });
  } catch (error) {
    console.error('Fetch venues error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/venues - Create a new venue with auto-generated seat layout (Admin only)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const { name, location, address, rowsCount, seatsPerRow, seatCategories } = await request.json();

    if (!name || !location || !address || !rowsCount || !seatsPerRow) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const rows = parseInt(rowsCount);
    const seats = parseInt(seatsPerRow);

    if (isNaN(rows) || rows <= 0 || rows > 26) {
      return NextResponse.json({ error: 'Rows count must be between 1 and 26' }, { status: 400 });
    }

    if (isNaN(seats) || seats <= 0 || seats > 50) {
      return NextResponse.json({ error: 'Seats per row must be between 1 and 50' }, { status: 400 });
    }

    // Create the venue and seats in a transaction
    const newVenue = await prisma.$transaction(async (tx) => {
      const venue = await tx.venue.create({
        data: {
          name,
          location,
          address,
          rowsCount: rows,
          seatsPerRow: seats,
        },
      });

      // Prepare seats array
      const seatsData = [];
      for (let r = 0; r < rows; r++) {
        const rowName = String.fromCharCode(65 + r); // A, B, C...
        // Default category assignment if not provided
        let category = 'Standard';
        if (seatCategories && seatCategories[rowName]) {
          category = seatCategories[rowName];
        } else {
          if (rowName === 'A') category = 'Premium';
          else if (rowName === 'B' || rowName === 'C') category = 'Standard';
          else category = 'Economy';
        }

        for (let s = 1; s <= seats; s++) {
          seatsData.push({
            venueId: venue.id,
            rowName,
            seatNumber: s,
            category,
          });
        }
      }

      await tx.venueSeat.createMany({
        data: seatsData,
      });

      return venue;
    });

    return NextResponse.json({
      message: 'Venue created successfully',
      venue: newVenue,
    });
  } catch (error) {
    console.error('Create venue error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
