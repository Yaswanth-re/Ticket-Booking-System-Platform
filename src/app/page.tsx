'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function RoleSelectionPage() {
  const router = useRouter();

  return (
    <div style={outerContainerStyle}>
      <div style={innerContainerStyle}>
        <header style={headerStyle}>
          <h1 style={titleStyle}>Ticket<span style={{ color: 'var(--accent)' }}>Hold</span></h1>
          <p style={subtitleStyle}>Welcome to Ticket Booking Platform. Choose how you want to continue.</p>
        </header>

        <div style={cardsGridStyle}>
          {/* Card 1: Customer */}
          <div style={cardStyle}>
            <div style={iconContainerStyle}>🎟️</div>
            <h2 style={cardTitleStyle}>Customer</h2>
            <p style={cardDescStyle}>Discover events, select seats from visual maps, and book tickets instantly.</p>
            <button
              onClick={() => router.push('/customer/login')}
              className="btn btn-primary"
              style={btnStyle}
            >
              Continue as Customer
            </button>
          </div>

          {/* Card 2: Organiser */}
          <div style={cardStyle}>
            <div style={iconContainerStyle}>💼</div>
            <h2 style={cardTitleStyle}>Organiser</h2>
            <p style={cardDescStyle}>Host events, configure categories, set prices, and track live booking stats.</p>
            <button
              onClick={() => router.push('/organiser/login')}
              className="btn btn-primary"
              style={{ ...btnStyle, background: 'var(--primary-gradient)' }}
            >
              Continue as Organiser
            </button>
          </div>

          {/* Card 3: Admin */}
          <div style={cardStyle}>
            <div style={iconContainerStyle}>⚙️</div>
            <h2 style={cardTitleStyle}>Admin</h2>
            <p style={cardDescStyle}>Manage system users, build venue seat layouts, and monitor global sales.</p>
            <button
              onClick={() => router.push('/admin/login')}
              className="btn btn-secondary"
              style={btnStyle}
            >
              Admin Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const outerContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, rgba(10, 12, 16, 1) 80%)',
  padding: '40px 20px',
};

const innerContainerStyle = {
  maxWidth: '960px',
  width: '100%',
  textAlign: 'center' as const,
};

const headerStyle = {
  marginBottom: '50px',
};

const titleStyle = {
  fontSize: '48px',
  fontWeight: 900,
  letterSpacing: '-0.02em',
  marginBottom: '12px',
};

const subtitleStyle = {
  fontSize: '16px',
  color: 'var(--text-muted)',
  maxWidth: '500px',
  margin: '0 auto',
};

const cardsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '30px',
  marginTop: '20px',
};

const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  padding: '40px 24px',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  transition: 'transform 0.2s ease, border-color 0.2s ease',
  boxShadow: 'var(--shadow-md)',
};

const iconContainerStyle = {
  fontSize: '44px',
  marginBottom: '20px',
  backgroundColor: 'var(--bg-input)',
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--border-color)',
};

const cardTitleStyle = {
  fontSize: '22px',
  fontWeight: 800,
  color: '#fff',
  marginBottom: '10px',
};

const cardDescStyle = {
  fontSize: '14px',
  color: 'var(--text-muted)',
  marginBottom: '30px',
  lineHeight: 1.5,
  flex: 1,
};

const btnStyle = {
  width: '100%',
  padding: '12px',
  fontSize: '14px',
  fontWeight: 700,
};
