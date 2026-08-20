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
  bookingSeats: Array<{
    id: string;
    price: number;
    eventSeat: { rowName: string; seatNumber: number; category: string };
  }>;
}

interface WaitlistEntry {
  id: string;
  eventId: string;
  status: 'WAITING' | 'OFFERED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  currentQueuePosition: number;
  event: { title: string; date: string; time: string };
  category: { name: string };
  activeOffer: { id: string; expiresAt: string } | null;
}

interface Event {
  id: string;
  title: string;
  imageUrl: string;
  date: string;
  time: string;
  venue: { name: string; location: string };
  startingPrice: number;
}

export default function CustomerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [recommended, setRecommended] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'CUSTOMER')) {
      router.push('/customer/login');
      return;
    }

    async function loadDashboardData() {
      try {
        const bookingsRes = await fetch('/api/bookings');
        const waitlistRes = await fetch('/api/waitlist');
        const eventsRes = await fetch('/api/events');
        
        if (bookingsRes.ok && waitlistRes.ok && eventsRes.ok) {
          const bData = await bookingsRes.json();
          const wData = await waitlistRes.json();
          const eData = await eventsRes.json();
          
          setBookings(bData.bookings);
          setWaitlist(wData.waitlist);
          // Pick first 3 events as recommendations
          setRecommended(eData.events.slice(0, 3));
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
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
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Filter bookings
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.event.date) >= new Date()
  );
  
  const activeOffers = waitlist.filter((w) => w.status === 'OFFERED' && w.activeOffer);

  // Get most recent booking for upcoming feature card
  const mainUpcoming = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      {/* Welcome Banner */}
      <div style={welcomeHeaderStyle}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Welcome back, {user?.name}!</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Discover shows, manage your reservations, and check waitlist priority.</p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div style={quickActionsGridStyle}>
        <Link href="/customer/events" style={actionCardStyle}>
          <span style={actionIconStyle}>🔍</span>
          <div>
            <strong style={{ color: '#fff', display: 'block' }}>Browse Events</strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Explore live concerts and screenings</span>
          </div>
        </Link>
        <Link href="/customer/bookings" style={actionCardStyle}>
          <span style={actionIconStyle}>🎟️</span>
          <div>
            <strong style={{ color: '#fff', display: 'block' }}>My Bookings</strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>View orders and scan ticket QR codes</span>
          </div>
        </Link>
        <Link href="/customer/waitlist" style={actionCardStyle}>
          <span style={actionIconStyle}>⏳</span>
          <div>
            <strong style={{ color: '#fff', display: 'block' }}>Join Waitlist</strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Request alerts for sold-out events</span>
          </div>
        </Link>
      </div>

      {/* Active Offers Alert Panel */}
      {activeOffers.length > 0 && (
        <div className="card" style={offerAlertCardStyle}>
          <h3 style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔔 Ticket Offer Available!
          </h3>
          <p style={{ color: '#fff', margin: '8px 0 16px 0', fontSize: '15px' }}>
            A seat has freed up for an event you waitlisted. Claim it before the timer expires!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeOffers.map((offer) => (
              <div key={offer.id} style={offerItemStyle}>
                <div>
                  <strong>{offer.event.title}</strong>
                  <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Category: {offer.category.name}
                  </span>
                </div>
                <Link
                  href={`/customer/waitlist?offerId=${offer.activeOffer?.id}`}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  ⚡ Claim Offer
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div style={gridStyle}>
        {/* Left Column: Upcoming Bookings & Recommended */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Upcoming Ticket details */}
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>🎟️ Upcoming Booking</h2>
            {mainUpcoming ? (
              <div style={upcomingTicketCardStyle}>
                <div style={{ flex: 1.5 }}>
                  <span className="badge badge-available">Confirmed</span>
                  <h3 style={{ color: '#fff', fontSize: '22px', margin: '12px 0 8px 0' }}>{mainUpcoming.event.title}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>📍 {mainUpcoming.event.venue.name}</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>📅 {mainUpcoming.event.date} at {mainUpcoming.event.time}</p>
                  
                  <div style={seatsBoxStyle}>
                    <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Seats</span>
                    <strong style={{ display: 'block', color: '#fff', fontSize: '16px', marginTop: '4px' }}>
                      {mainUpcoming.bookingSeats.map(bs => `Row ${bs.eventSeat.rowName}-${bs.eventSeat.seatNumber}`).join(', ')}
                    </strong>
                  </div>

                  <div style={{ marginTop: '24px' }}>
                    <Link href={`/customer/bookings/${mainUpcoming.id}`} className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '13px' }}>
                      View QR Ticket Detail
                    </Link>
                  </div>
                </div>
                <div style={qrSideBoxStyle}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent((typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') + '/tickets/' + mainUpcoming.bookingReference)}`}
                    alt="Booking QR Code"
                    style={{ width: '130px', height: '130px', backgroundColor: '#fff', padding: '6px', borderRadius: '4px' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Ref: {mainUpcoming.bookingReference}</span>
                </div>
              </div>
            ) : (
              <div style={emptySectionStyle}>
                <span style={{ fontSize: '48px' }}>🎫</span>
                <h3>No upcoming reservations</h3>
                <p style={{ margin: '8px 0 16px 0' }}>Explore upcoming concerts, movies, and theater shows now.</p>
                <Link href="/customer/events" className="btn btn-primary">
                  Explore Events
                </Link>
              </div>
            )}
          </div>

          {/* Recommended Events */}
          <div>
            <h2 style={{ marginBottom: '20px' }}>⭐ Recommended Events</h2>
            <div style={recommendedGridStyle}>
              {recommended.map((evt) => (
                <div key={evt.id} className="card" style={recCardStyle}>
                  <img src={evt.imageUrl} alt={evt.title} style={recImageStyle} />
                  <div style={{ padding: '16px' }}>
                    <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '6px' }}>{evt.title}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📅 {evt.date} at {evt.time}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📍 {evt.venue.location}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent)' }}>${evt.startingPrice.toFixed(2)}</span>
                      <Link href={`/customer/events/${evt.id}`} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Waitlists & Recent Activity */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Waitlist Positions */}
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>⏳ My Waitlists</h2>
            {waitlist.filter(w => w.status === 'WAITING' || w.status === 'OFFERED').length === 0 ? (
              <div style={emptySectionStyle}>
                <span style={{ fontSize: '32px' }}>⏳</span>
                <p style={{ marginTop: '8px' }}>You are not waiting on any ticket queues.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {waitlist
                  .filter((w) => w.status === 'WAITING' || w.status === 'OFFERED')
                  .slice(0, 3)
                  .map((w) => (
                    <div key={w.id} style={waitlistRowStyle}>
                      <div>
                        <h4 style={{ color: '#fff', fontSize: '14px' }}>{w.event.title}</h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Category: {w.category.name}</span>
                      </div>
                      <div>
                        {w.status === 'OFFERED' ? (
                          <span className="badge badge-limited" style={{ fontSize: '9px' }}>Offered</span>
                        ) : (
                          <span style={queueBadgeStyle}>Pos #{w.currentQueuePosition}</span>
                        )}
                      </div>
                    </div>
                  ))}
                <Link href="/customer/waitlist" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '13px', textAlign: 'center', marginTop: '8px' }}>
                  Manage Waitlists &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Recent Activity Logs */}
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>⏰ Recent Activity</h2>
            {bookings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>No bookings or cancellation logs found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {bookings.slice(0, 4).map((b) => (
                  <div key={b.id} style={activityRowStyle}>
                    <span style={{ fontSize: '14px', color: '#fff' }}>
                      {b.status === 'CONFIRMED' ? '🎟️ Ticket Booked' : '❌ Ticket Cancelled'}
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {b.event.title} • {new Date(b.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// Styling definitions
const welcomeHeaderStyle = {
  marginBottom: '30px',
};

const quickActionsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '20px',
  marginBottom: '40px',
};

const actionCardStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  textDecoration: 'none',
  transition: 'transform 0.2s ease, border-color 0.2s ease',
};

const actionIconStyle = {
  fontSize: '28px',
  backgroundColor: 'var(--bg-input)',
  width: '50px',
  height: '50px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--border-color)',
};

const gridStyle = {
  display: 'flex',
  gap: '30px',
  flexWrap: 'wrap' as const,
};

const offerAlertCardStyle = {
  border: '2px solid var(--warning)',
  background: 'linear-gradient(to right, rgba(245, 158, 11, 0.05) 0%, rgba(18, 22, 31, 1) 100%)',
  marginBottom: '30px',
};

const offerItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px',
  backgroundColor: 'rgba(255,255,255,0.03)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
};

const upcomingTicketCardStyle = {
  display: 'flex',
  gap: '30px',
  flexWrap: 'wrap' as const,
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '24px',
};

const seatsBoxStyle = {
  marginTop: '16px',
  backgroundColor: 'rgba(255,255,255,0.02)',
  padding: '10px 14px',
  borderRadius: '4px',
  border: '1px solid var(--border-color)',
  display: 'inline-block',
};

const qrSideBoxStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255,255,255,0.01)',
  border: '1px dashed var(--border-color)',
  borderRadius: '8px',
  padding: '16px',
  minWidth: '180px',
};

const recommendedGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '20px',
};

const recCardStyle = {
  padding: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column' as const,
};

const recImageStyle = {
  width: '100%',
  height: '110px',
  objectFit: 'cover' as const,
};

const waitlistRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 0',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const queueBadgeStyle = {
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  color: 'var(--primary)',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 700,
};

const activityRowStyle = {
  paddingBottom: '10px',
  borderBottom: '1px solid rgba(255,255,255,0.03)',
};

const emptySectionStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  color: 'var(--text-muted)',
  textAlign: 'center' as const,
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-sm)',
};
