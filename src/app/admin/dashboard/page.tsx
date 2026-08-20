'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BookingStat {
  id: string;
  bookingReference: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  customer: { name: string; email: string };
  event: { title: string };
}

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  sentAt: string;
}

interface SystemStats {
  totalUsers: number;
  roles: { CUSTOMER: number; ORGANISER: number; ADMIN: number };
  venuesCount: number;
  eventsCount: number;
  bookingsCount: number;
  status: { CONFIRMED: number; CANCELLED: number; EXPIRED: number };
  totalRevenue: number;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [bookings, setBookings] = useState<BookingStat[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }

    async function loadDashboardData() {
      try {
        const statsRes = await fetch('/api/admin/stats');
        const emailsRes = await fetch('/api/admin/emails');
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
          setBookings(statsData.recentBookings);
        }

        if (emailsRes.ok) {
          const emailsData = await emailsRes.json();
          setEmails(emailsData.emailLogs);
        }
      } catch (err) {
        console.error('Error loading admin dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading system analytics...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <div style={headerStyle}>
        <div>
          <h1>Admin Command Center</h1>
          <p>Global system overview, user roles administration, and seat booking audits.</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={statsGridStyle}>
          <div className="card" style={statCardStyle}>
            <span style={statIconStyle}>👥</span>
            <div>
              <span style={statLabelStyle}>Total Users</span>
              <span style={statValueStyle}>{stats.totalUsers}</span>
              <span style={statSubLabelStyle}>
                Cust: {stats.roles.CUSTOMER} | Org: {stats.roles.ORGANISER}
              </span>
            </div>
          </div>

          <div className="card" style={statCardStyle}>
            <span style={statIconStyle}>🏢</span>
            <div>
              <span style={statLabelStyle}>Venues</span>
              <span style={statValueStyle}>{stats.venuesCount}</span>
            </div>
          </div>

          <div className="card" style={statCardStyle}>
            <span style={statIconStyle}>🎬</span>
            <div>
              <span style={statLabelStyle}>Live Events</span>
              <span style={statValueStyle}>{stats.eventsCount}</span>
            </div>
          </div>

          <div className="card" style={statCardStyle}>
            <span style={statIconStyle}>💰</span>
            <div>
              <span style={statLabelStyle}>System Revenue</span>
              <span style={{ ...statValueStyle, color: 'var(--success)' }}>${stats.totalRevenue.toFixed(2)}</span>
              <span style={statSubLabelStyle}>
                Confirmed: {stats.status.CONFIRMED}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Audit grids */}
      <div style={auditGridStyle}>
        
        {/* Recent bookings list */}
        <div style={{ flex: 1.5, minWidth: '350px' }}>
          <h2 style={{ marginBottom: '16px' }}>🎟️ Recent Ticket Bookings</h2>
          {bookings.length === 0 ? (
            <p style={emptyTextStyle}>No ticket bookings audit history found.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Event</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.customer.name}</strong>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {booking.customer.email}
                        </span>
                      </td>
                      <td>{booking.event.title}</td>
                      <td><code>{booking.bookingReference}</code></td>
                      <td>
                        {booking.status === 'CONFIRMED' && <span className="badge badge-available">Confirmed</span>}
                        {booking.status === 'CANCELLED' && <span className="badge badge-soldout">Cancelled</span>}
                      </td>
                      <td>${booking.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent email notifications log */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h2 style={{ marginBottom: '16px' }}>✉️ Email Logs</h2>
          {emails.length === 0 ? (
            <p style={emptyTextStyle}>No email logs recorded yet.</p>
          ) : (
            <div style={emailLogsListStyle}>
              {emails.map((log) => (
                <div key={log.id} style={emailLogItemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '13px', color: '#fff' }}>{log.recipient}</strong>
                    <span style={{
                      ...emailStatusStyle,
                      color: log.status === 'SENT' ? 'var(--success)' : 'var(--error)',
                      backgroundColor: log.status === 'SENT' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    }}>{log.status}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {log.subject}
                  </p>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    {new Date(log.sentAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

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
  fontSize: '12px',
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

const statSubLabelStyle = {
  display: 'block',
  fontSize: '11px',
  color: 'var(--text-muted)',
  marginTop: '4px',
};

const auditGridStyle = {
  display: 'flex',
  gap: '30px',
  marginTop: '45px',
  flexWrap: 'wrap' as const,
};

const emailLogsListStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
  maxHeight: '400px',
  overflowY: 'auto' as const,
  border: '1px solid var(--border-color)',
  padding: '16px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-card)',
};

const emailLogItemStyle = {
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  paddingBottom: '10px',
};

const emailStatusStyle = {
  fontSize: '9px',
  fontWeight: 800,
  padding: '2px 6px',
  borderRadius: '3px',
  textTransform: 'uppercase' as const,
};

const emptyTextStyle = {
  color: 'var(--text-muted)',
  textAlign: 'center' as const,
  padding: '40px 0',
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-card)',
};
