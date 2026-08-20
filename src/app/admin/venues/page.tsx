'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Venue {
  id: string;
  name: string;
  location: string;
  address: string;
  rowsCount: number;
  seatsPerRow: number;
  _count: { venueSeats: number };
}

export default function AdminVenuesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadVenues() {
    try {
      const res = await fetch('/api/venues');
      if (res.ok) {
        const data = await res.json();
        setVenues(data.venues);
      }
    } catch (err) {
      console.error('Error fetching venues:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (user) {
      loadVenues();
    }
  }, [user, authLoading, router]);

  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    const confirmed = confirm(`Are you sure you want to delete the venue "${venueName}"? This will delete all its seats.`);
    if (!confirmed) return;

    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/venues/${venueId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`Venue "${venueName}" deleted successfully.`);
        await loadVenues();
      } else {
        setError(data.error || 'Failed to delete venue.');
      }
    } catch (err) {
      setError('Network error, please try again.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading venues catalog...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <div style={headerStyle}>
        <div>
          <h1>Venue Administration</h1>
          <p>Create and edit venues, and configure row layouts and seat categories.</p>
        </div>
        <Link href="/admin/venues/create" className="btn btn-primary">
          🏗️ Create Venue Builder
        </Link>
      </div>

      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={messageStyle}>{message}</div>}

      {venues.length === 0 ? (
        <div style={emptyStateStyle}>
          <span style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</span>
          <h3>No venues registered</h3>
          <p style={{ margin: '8px 0 16px 0' }}>Add a venue layout to start hosting events.</p>
          <Link href="/admin/venues/create" className="btn btn-primary">
            Create Venue
          </Link>
        </div>
      ) : (
        <div style={venuesGridStyle}>
          {venues.map((venue) => (
            <div key={venue.id} className="card" style={venueCardStyle}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>{venue.name}</h3>
                <span style={venueLocationStyle}>📍 {venue.location}</span>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  {venue.address}
                </p>
                
                <div style={layoutStatsStyle}>
                  <div style={statItemStyle}>
                    <span style={statLabelStyle}>Rows</span>
                    <span style={statValueStyle}>{venue.rowsCount}</span>
                  </div>
                  <div style={statItemStyle}>
                    <span style={statLabelStyle}>Seats / Row</span>
                    <span style={statValueStyle}>{venue.seatsPerRow}</span>
                  </div>
                  <div style={statItemStyle}>
                    <span style={statLabelStyle}>Total Seats</span>
                    <span style={statValueStyle}>{venue.rowsCount * venue.seatsPerRow}</span>
                  </div>
                </div>
              </div>

              <div style={cardActionsStyle}>
                <button
                  onClick={() => handleDeleteVenue(venue.id, venue.name)}
                  className="btn btn-danger"
                  style={btnStyle}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Styles
const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '40px',
  flexWrap: 'wrap' as const,
  gap: '16px',
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

const messageStyle = {
  backgroundColor: 'rgba(16, 185, 129, 0.15)',
  color: 'var(--success)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const venuesGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '24px',
};

const venueCardStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  height: '100%',
};

const venueLocationStyle = {
  fontSize: '11px',
  color: 'var(--accent)',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  backgroundColor: 'rgba(168, 85, 247, 0.1)',
  padding: '4px 8px',
  borderRadius: '4px',
  display: 'inline-block',
};

const layoutStatsStyle = {
  display: 'flex',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '12px',
  marginTop: '20px',
  justifyContent: 'space-between',
};

const statItemStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
};

const statLabelStyle = {
  fontSize: '9px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
};

const statValueStyle = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#fff',
  marginTop: '2px',
};

const cardActionsStyle = {
  display: 'flex',
  marginTop: '24px',
  borderTop: '1px solid var(--border-color)',
  paddingTop: '16px',
  justifyContent: 'flex-end',
};

const btnStyle = {
  padding: '8px 16px',
  fontSize: '13px',
};

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
