'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/customer/login' || pathname === '/customer/register') {
      return;
    }
    if (!loading && (!user || user.role !== 'CUSTOMER')) {
      router.push('/customer/login');
    }
  }, [user, loading, router, pathname]);

  if (pathname === '/customer/login' || pathname === '/customer/register') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verifying session details...</p>
      </div>
    );
  }

  if (!user || user.role !== 'CUSTOMER') {
    return null; // Redirects via useEffect
  }

  return <>{children}</>;
}

