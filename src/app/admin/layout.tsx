'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/admin/login') {
      return;
    }
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.push('/admin/login');
    }
  }, [user, loading, router, pathname]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Authorizing access to command center...</p>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null; // Redirects via useEffect
  }

  return <>{children}</>;
}

