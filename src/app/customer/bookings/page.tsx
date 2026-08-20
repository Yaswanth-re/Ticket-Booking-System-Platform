'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Booking {
  id: string;
  bookingReference: string;
  totalAmount: number;
  status: 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    venue: { name: string; location: string };
  };
}

export default function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'CUSTOMER')) {
      router.push('/login');
      return;
    }

    async function loadBookings() {
      try {
        const res = await fetch('/api/bookings');
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings);
        }
      } catch (err) {
        console.error('Error loading bookings:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadBookings();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your tickets...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1 style={{ marginBottom: '10px' }}>My Bookings</h1>
      <p style={{ marginBottom: '30px' }}>View details, print QR tickets, or cancel reservations.</p>

      {bookings.length === 0 ? (
        <div style={emptyStateStyle}>
          <span style={{ fontSize: '64px', marginBottom: '16px' }}>🎟️</span>
          <h2>No bookings found</h2>
          <p style={{ margin: '8px 0 24px 0' }}>It looks like you haven't bought any tickets yet.</p>
          <Link href="/events" className="btn btn-primary">
            Browse Live Events
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'CONFIRMED';
            const isCancelled = booking.status === 'CANCELLED';
            const isExpired = booking.status === 'EXPIRED';

            return (
              <div key={booking.id} className="card" style={bookingCardStyle}>
                <div style={bookingHeaderStyle}>
                  <div>
                    <span style={eventDateStyle}>📅 {booking.event.date} • {booking.event.time}</span>
                    <h3 style={{ fontSize: '20px', color: '#fff', marginTop: '6px' }}>{booking.event.title}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                      📍 {booking.event.venue.name} • {booking.event.venue.location}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isConfirmed && <span className="badge badge-available">Confirmed</span>}
                    {isCancelled && <span className="badge badge-soldout">Cancelled</span>}
                    {isExpired && <span className="badge badge-limited">Expired</span>}
                  </div>
                </div>

                <div style={bookingFooterStyle}>
                  <div style={detailsBoxStyle}>
                    <div style={detailItemStyle}>
                      <span style={detailLabelStyle}>Reference</span>
                      <span style={detailValueStyle}>{booking.bookingReference}</span>
                    </div>
                    <div style={detailItemStyle}>
                      <span style={detailLabelStyle}>Booked On</span>
                      <span style={detailValueStyle}>{new Date(booking.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={detailItemStyle}>
                      <span style={detailLabelStyle}>Price Paid</span>
                      <span style={{ ...detailValueStyle, color: 'var(--primary)', fontWeight: 800 }}>
                        ${booking.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div style={btnGroupStyle}>
                    <Link href={`/customer/bookings/${booking.id}`} className="btn btn-primary" style={btnStyle}>
                      🎫 View Ticket & QR
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Styles
const emptyStateStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 20px',
  textAlign: 'center' as const,
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-card)',
};

const bookingCardStyle = {
  padding: '24px',
};

const bookingHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '16px',
  flexWrap: 'wrap' as const,
  gap: '16px',
};

const eventDateStyle = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--accent)',
};

const bookingFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: '20px',
  flexWrap: 'wrap' as const,
  gap: '20px',
};

const detailsBoxStyle = {
  display: 'flex',
  gap: '32px',
  flexWrap: 'wrap' as const,
};

const detailItemStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
};

const detailLabelStyle = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
};

const detailValueStyle = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#fff',
  marginTop: '4px',
};

const btnGroupStyle = {
  display: 'flex',
  gap: '12px',
};

const btnStyle = {
  padding: '10px 20px',
  fontSize: '14px',
};
