'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, targetRole: 'CUSTOMER' | 'ORGANISER' | 'ADMIN') => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role: 'CUSTOMER' | 'ORGANISER') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Error fetching auth session:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string, targetRole: 'CUSTOMER' | 'ORGANISER' | 'ADMIN') => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, targetRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        // Redirect based on role
        if (data.user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else if (data.user.role === 'ORGANISER') {
          router.push('/organiser/dashboard');
        } else {
          router.push('/customer/dashboard');
        }
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (e) {
      return { success: false, error: 'Network error, please try again' };
    }
  };

  const register = async (name: string, email: string, password: string, role: 'CUSTOMER' | 'ORGANISER') => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        if (data.user.role === 'ORGANISER') {
          router.push('/organiser/dashboard');
        } else {
          router.push('/customer/dashboard');
        }
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (e) {
      return { success: false, error: 'Network error, please try again' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshSession: fetchSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
