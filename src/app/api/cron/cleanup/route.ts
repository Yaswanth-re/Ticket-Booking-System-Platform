import { NextResponse } from 'next/server';
import { runCleanup } from '@/lib/cleanup';

export async function GET() {
  try {
    const result = await runCleanup();
    return NextResponse.json({
      message: 'Cleanup cron job executed successfully',
      result,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
