import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PUT /api/venues/[id] - Edit venue details (Admin only)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const { id } = await params;
    const { name, location, address } = await request.json();

    if (!name || !location || !address) {
      return NextResponse.json({ error: 'Name, location, and address are required' }, { status: 400 });
    }

    const updatedVenue = await prisma.venue.update({
      where: { id },
      data: { name, location, address },
    });

    return NextResponse.json({
      message: 'Venue updated successfully',
      venue: updatedVenue,
    });
  } catch (error) {
    console.error('Update venue error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/venues/[id] - Delete a venue (Admin only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const { id } = await params;

    // Check if venue has upcoming events
    const eventCount = await prisma.event.count({
      where: { venueId: id },
    });

    if (eventCount > 0) {
      return NextResponse.json({ error: 'Cannot delete venue: It has active events associated with it' }, { status: 400 });
    }

    await prisma.venue.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Venue deleted successfully',
    });
  } catch (error) {
    console.error('Delete venue error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
