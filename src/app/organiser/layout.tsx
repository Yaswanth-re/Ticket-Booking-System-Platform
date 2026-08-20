'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function OrganiserLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/organiser/login' || pathname === '/organiser/register') {
      return;
    }
    if (!loading && (!user || user.role !== 'ORGANISER')) {
      router.push('/organiser/login');
    }
  }, [user, loading, router, pathname]);

  if (pathname === '/organiser/login' || pathname === '/organiser/register') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verifying organiser dashboard details...</p>
      </div>
    );
  }

  if (!user || user.role !== 'ORGANISER') {
    return null; // Redirects via useEffect
  }

  return <>{children}</>;
}

