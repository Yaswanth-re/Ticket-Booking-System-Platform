'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrganiserRegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'ORGANISER') {
        router.push('/organiser/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await register(name, email, password, 'ORGANISER');
      if (!res.success) {
        setError(res.error || 'Registration failed');
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
        <p>Checking organiser session...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div className="card" style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>💼</span>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800 }}>Register Organiser</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Create an organiser account to publish shows and track sales.</p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Company / Organiser Name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. LiveNation Events"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
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
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', background: 'var(--primary-gradient)' }}
            disabled={submitting}
          >
            {submitting ? 'Registering...' : 'Register Organiser'}
          </button>
        </form>

        <p style={loginPromptStyle}>
          Already have an organiser account?{' '}
          <Link href="/organiser/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Sign In here
          </Link>
        </p>

        <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
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
  background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05) 0%, rgba(10, 12, 16, 1) 80%)',
};

const cardStyle = {
  width: '100%',
  maxWidth: '400px',
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

const loginPromptStyle = {
  textAlign: 'center' as const,
  marginTop: '20px',
  fontSize: '14px',
};
