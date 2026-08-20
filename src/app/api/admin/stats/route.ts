import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // 1. User count breakdown
    const users = await prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });

    const rolesCount = {
      CUSTOMER: 0,
      ORGANISER: 0,
      ADMIN: 0,
    };
    users.forEach((group) => {
      rolesCount[group.role as keyof typeof rolesCount] = group._count._all;
    });

    const totalUsers = rolesCount.CUSTOMER + rolesCount.ORGANISER + rolesCount.ADMIN;

    // 2. Count venues, events, bookings
    const venuesCount = await prisma.venue.count();
    const eventsCount = await prisma.event.count();
    const bookingsCount = await prisma.booking.count();
    
    // 3. Calculate total revenue
    const revenueSum = await prisma.booking.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { totalAmount: true },
    });
    const totalRevenue = revenueSum._sum.totalAmount || 0;

    // 4. Booking status breakdown
    const bookingsStatus = await prisma.booking.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const statusCount = {
      CONFIRMED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
    };
    bookingsStatus.forEach((group) => {
      statusCount[group.status as keyof typeof statusCount] = group._count._all;
    });

    // 5. Fetch last 5 bookings
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, email: true } },
        event: { select: { title: true } },
      },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        roles: rolesCount,
        venuesCount,
        eventsCount,
        bookingsCount,
        status: statusCount,
        totalRevenue,
      },
      recentBookings,
    });
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
