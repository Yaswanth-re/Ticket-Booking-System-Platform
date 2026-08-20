import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/admin/emails - Get list of email logs (Admin only)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const emailLogs = await prisma.emailLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 100, // Limit to last 100 logs
    });

    return NextResponse.json({ emailLogs });
  } catch (error) {
    console.error('Fetch email logs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
