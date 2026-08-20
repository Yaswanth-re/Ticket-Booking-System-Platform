'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterSelectionPage() {
  const router = useRouter();

  return (
    <div style={containerStyle}>
      <div className="card" style={cardStyle}>
        <h2 style={{ textAlign: 'center', marginBottom: '12px' }}>Create an Account</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px', fontSize: '14px' }}>
          Choose your account type to register
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Customer Choice */}
          <div style={choiceBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#fff', fontSize: '16px' }}>🎟️ Customer Account</strong>
              <button
                onClick={() => router.push('/customer/register')}
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Register
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
              For finding shows, holding seats, and booking tickets.
            </p>
          </div>

          {/* Organiser Choice */}
          <div style={choiceBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#fff', fontSize: '16px' }}>💼 Organiser Account</strong>
              <button
                onClick={() => router.push('/organiser/register')}
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--primary-gradient)' }}
              >
                Register
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
              For hosting events, setting up prices, and managing ticket sales.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <Link href="/" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
            &larr; Back to Selection
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
  minHeight: 'calc(100vh - 170px)',
  background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05) 0%, rgba(10, 12, 16, 1) 80%)',
};

const cardStyle = {
  width: '100%',
  maxWidth: '450px',
};

const choiceBoxStyle = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
};
