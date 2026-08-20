'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EventStat {
  id: string;
  title: string;
  date: string;
  time: string;
  venueName: string;
  capacity: number;
  sold: number;
  available: number;
  revenue: number;
}

interface OrganiserStats {
  totalTicketsSold: number;
  totalRevenue: number;
  totalAvailableSeats: number;
  totalCapacity: number;
  eventsCount: number;
}

export default function OrganiserDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<OrganiserStats | null>(null);
  const [events, setEvents] = useState<EventStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ORGANISER')) {
      router.push('/login');
      return;
    }

    async function loadStats() {
      try {
        const res = await fetch('/api/organiser/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setEvents(data.events);
        }
      } catch (err) {
        console.error('Error loading organiser stats:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadStats();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <div style={headerStyle}>
        <div>
          <h1>Organiser Dashboard</h1>
          <p>Manage your events, analyze tickets sold, and track revenue statistics.</p>
        </div>
        <Link href="/organiser/events/create" className="btn btn-primary">
          ➕ Host New Event
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={statsGridStyle}>
          <div className="card" style={statCardStyle}>
            <span style={statIconStyle}>📅</span>
            <div>
              <span style={statLabelStyle}>Active Events</span>
              <span style={statValueStyle}>{stats.eventsCount}</span>
            </div>
          </div>

          <div className="card" style={statCardStyle}>
            <span style={statIconStyle}>🎟️</span>
            <div>
              <span style={statLabelStyle}>Tickets Sold</span>
              <span style={statValueStyle}>{stats.totalTicketsSold} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-muted)' }}>/ {stats.totalCapacity}</span></span>
            </div>
          </div>

          <div className="card" style={statCardStyle}>
            <span style={statIconStyle}>💰</span>
            <div>
              <span style={statLabelStyle}>Total Revenue</span>
              <span style={{ ...statValueStyle, color: 'var(--success)' }}>${stats.totalRevenue.toFixed(2)}</span>
            </div>
          </div>

          <div className="card" style={statCardStyle}>
            <span style={statIconStyle}>💺</span>
            <div>
              <span style={statLabelStyle}>Available Seats</span>
              <span style={statValueStyle}>{stats.totalAvailableSeats}</span>
            </div>
          </div>
        </div>
      )}

      {/* Events List Table */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ marginBottom: '16px' }}>Manage My Events</h2>
        
        {events.length === 0 ? (
          <div style={emptyStateStyle}>
            <span style={{ fontSize: '48px', marginBottom: '16px' }}>🎭</span>
            <h3>No events created yet</h3>
            <p style={{ margin: '8px 0 16px 0' }}>Get started by creating your first event page.</p>
            <Link href="/organiser/events/create" className="btn btn-primary">
              Create Event Now
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Event Details</th>
                  <th>Date/Time</th>
                  <th>Capacity Status</th>
                  <th>Tickets Sold</th>
                  <th>Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <strong style={{ color: '#fff', fontSize: '15px' }}>{event.title}</strong>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        📍 {event.venueName}
                      </span>
                    </td>
                    <td>
                      <span>{event.date}</span>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {event.time}
                      </span>
                    </td>
                    <td>
                      <div style={progressContainerStyle}>
                        <div style={{
                          ...progressBarStyle,
                          width: `${(event.sold / event.capacity) * 100}%`,
                          backgroundColor: event.available === 0 ? 'var(--error)' : 'var(--primary)',
                        }}></div>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {event.available} seats left
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#fff' }}>{event.sold}</strong> / {event.capacity}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--success)' }}>${event.revenue.toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '24px',
};

const statCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  padding: '24px',
};

const statIconStyle = {
  fontSize: '36px',
  backgroundColor: 'var(--bg-input)',
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--border-color)',
};

const statLabelStyle = {
  display: 'block',
  fontSize: '13px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
  fontWeight: 600,
  letterSpacing: '0.05em',
};

const statValueStyle = {
  display: 'block',
  fontSize: '24px',
  fontWeight: 800,
  color: '#fff',
  marginTop: '4px',
};

const progressContainerStyle = {
  width: '120px',
  height: '6px',
  backgroundColor: 'var(--bg-input)',
  borderRadius: '10px',
  overflow: 'hidden',
  marginBottom: '6px',
  border: '1px solid var(--border-color)',
};

const progressBarStyle = {
  height: '100%',
  transition: 'width 0.3s ease',
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
