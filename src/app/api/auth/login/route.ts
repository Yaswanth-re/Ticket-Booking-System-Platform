import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password, targetRole } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !comparePassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (targetRole && user.role !== targetRole) {
      if (targetRole === 'ADMIN') {
        return NextResponse.json({ error: 'This account does not have administrator access. Please use Customer Login.' }, { status: 403 });
      }
      if (targetRole === 'ORGANISER') {
        return NextResponse.json({ error: 'This account does not have organiser access. Please use Organiser Login.' }, { status: 403 });
      }
      if (targetRole === 'CUSTOMER') {
        return NextResponse.json({ error: 'This account does not have customer access. Please use Customer Login.' }, { status: 403 });
      }
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
