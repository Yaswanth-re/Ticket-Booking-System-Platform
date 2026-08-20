'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await login(email, password, 'ADMIN');
      if (!res.success) {
        setError(res.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Checking administrative session...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div className="card" style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>⚙️</span>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800 }}>Admin Command Center</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Enter credentials to manage the platform infrastructure.</p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Administrative Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@domain.com"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px', fontWeight: 800 }}
            disabled={submitting}
          >
            {submitting ? 'Verifying Secure Tokens...' : '⚡ Secure Admin Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <Link href="/" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
            &larr; Back to Role Selection
          </Link>
        </div>
      </div>
    </div>
  );
}

const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 20px',
  minHeight: '100vh',
  background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.03) 0%, rgba(10, 12, 16, 1) 80%)',
};

const cardStyle = {
  width: '100%',
  maxWidth: '400px',
  border: '1px solid var(--border-color)',
};

const errorStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  color: 'var(--error)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  marginBottom: '20px',
  textAlign: 'center' as const,
};
