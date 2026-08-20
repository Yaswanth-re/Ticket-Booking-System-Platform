import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PUT /api/admin/users/[id] - Update user role (Admin only)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { role } = await request.json();

    if (!role || !['CUSTOMER', 'ORGANISER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check that we aren't changing the role of the last admin to non-admin
    if (role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });
      const userToModify = await prisma.user.findUnique({
        where: { id },
      });
      if (userToModify && userToModify.role === 'ADMIN' && adminCount <= 1) {
        return NextResponse.json({ error: 'Cannot demote the only remaining Admin' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: 'User role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete a user (Admin only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deleting oneself
    if (admin.id === id) {
      return NextResponse.json({ error: 'Cannot delete your own admin account' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
