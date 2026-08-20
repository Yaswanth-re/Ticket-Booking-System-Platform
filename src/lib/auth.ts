import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';

const JWT_SECRET = process.env.AUTH_SECRET || 'fallback-secret-key-12345';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: { id: string; role: string; email: string; name: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: string; role: string; email: string; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (e) {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    
    const payload = verifyToken(token);
    if (!payload) return null;

    // Check if the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });
    if (!user) return null;

    return {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };
  } catch (e) {
    return null;
  }
}

