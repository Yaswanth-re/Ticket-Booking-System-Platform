import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { runCleanup } from '@/lib/cleanup';

// GET /api/waitlist - Get current customer's waitlist entries
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run cleanups first so we show correct, live statuses
    await runCleanup();

    const waitlistEntries = await prisma.waitlist.findMany({
      where: { customerId: user.id },
      include: {
        event: { include: { venue: true } },
        category: true,
        offers: {
          where: { status: 'ACTIVE' },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    // Recalculate dynamic queue positions for WAITING entries
    const formattedEntries = await Promise.all(
      waitlistEntries.map(async (entry) => {
        if (entry.status !== 'WAITING') {
          return {
            ...entry,
            currentQueuePosition: 0,
            activeOffer: entry.offers[0] || null,
          };
        }

        // Count how many WAITING users joined before this user
        const aheadCount = await prisma.waitlist.count({
          where: {
            eventId: entry.eventId,
            categoryId: entry.categoryId,
            status: 'WAITING',
            joinedAt: { lt: entry.joinedAt },
          },
        });

        return {
          ...entry,
          currentQueuePosition: aheadCount + 1,
          activeOffer: null,
        };
      })
    );

    return NextResponse.json({ waitlist: formattedEntries });
  } catch (error) {
    console.error('Fetch waitlist error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/waitlist - Join the waitlist for a ticket category
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, categoryId } = await request.json();

    if (!eventId || !categoryId) {
      return NextResponse.json({ error: 'Event ID and Category ID are required' }, { status: 400 });
    }

    // Run cleanups first
    await runCleanup();

    // 1. Check if the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventSeats: {
          where: { categoryId },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 2. Check if the category exists and verify it is indeed sold out
    const category = await prisma.ticketCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const availableSeatsCount = event.eventSeats.filter(s => s.status === 'AVAILABLE').length;
    if (availableSeatsCount > 0) {
      return NextResponse.json({
        error: 'Tickets are still available in this category. You must select and book them directly.',
      }, { status: 400 });
    }

    // 3. Prevent duplicate active waitlist entry
    const existingActiveEntry = await prisma.waitlist.findFirst({
      where: {
        customerId: user.id,
        eventId,
        categoryId,
        status: { in: ['WAITING', 'OFFERED'] },
      },
    });

    if (existingActiveEntry) {
      return NextResponse.json({
        error: 'You are already in the waitlist for this category.',
      }, { status: 400 });
    }

    // 4. Calculate queue position (count active entries in waitlist)
    const currentQueueCount = await prisma.waitlist.count({
      where: {
        eventId,
        categoryId,
        status: 'WAITING',
      },
    });

    const newWaitlistEntry = await prisma.waitlist.create({
      data: {
        customerId: user.id,
        eventId,
        categoryId,
        queuePosition: currentQueueCount + 1,
        status: 'WAITING',
      },
    });

    return NextResponse.json({
      message: 'Joined waitlist successfully',
      waitlist: newWaitlistEntry,
      queuePosition: currentQueueCount + 1,
    });
  } catch (error) {
    console.error('Join waitlist error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
