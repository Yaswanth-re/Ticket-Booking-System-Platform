'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface TicketCategory {
  id: string;
  name: string;
  price: number;
  totalSeats: number;
}

interface EventDetails {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  time: string;
  venue: {
    name: string;
    location: string;
    address: string;
  };
  categories: TicketCategory[];
  availableSeats: number;
  totalSeats: number;
  availabilityStatus: 'AVAILABLE' | 'LIMITED' | 'SOLD_OUT';
}

export default function CustomerEventDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Waitlist states
  const [selectedWaitlistCat, setSelectedWaitlistCat] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

  useEffect(() => {
    async function loadEventDetails() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data.event);
          if (data.event.categories.length > 0) {
            setSelectedWaitlistCat(data.event.categories[0].id);
          }
        } else {
          setError('Event not found.');
        }
      } catch (err) {
        setError('Failed to load event details.');
      } finally {
        setLoading(false);
      }
    }
    loadEventDetails();
  }, [id]);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/customer/login');
      return;
    }

    if (user.role !== 'CUSTOMER') {
      setWaitlistStatus({ success: false, message: 'Only customers can join the waitlist.' });
      return;
    }

    setWaitlistStatus(null);
    setWaitlistSubmitting(true);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, categoryId: selectedWaitlistCat }),
      });

      const data = await res.json();
      if (res.ok) {
        setWaitlistStatus({
          success: true,
          message: `Successfully joined the waitlist! You are at position #${data.queuePosition}.`,
        });
      } else {
        setWaitlistStatus({ success: false, message: data.error || 'Failed to join waitlist' });
      }
    } catch (err) {
      setWaitlistStatus({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--error)' }}>{error || 'Event Not Found'}</h2>
        <Link href="/customer/events" className="btn btn-secondary" style={{ marginTop: '20px' }}>
          Back to Events
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      {/* Banner */}
      <div style={bannerContainerStyle}>
        <img src={event.imageUrl} alt={event.title} style={bannerStyle} />
        <div style={bannerOverlayStyle}>
          <div style={bannerTextStyle}>
            <span style={dateBadgeStyle}>📅 {event.date} • {event.time}</span>
            <h1 style={titleStyle}>{event.title}</h1>
            <p style={locationSubtitleStyle}>📍 {event.venue.name} • {event.venue.location}</p>
          </div>
        </div>
      </div>

      <div style={detailsGridStyle}>
        {/* Main Info */}
        <div style={{ flex: 2, minWidth: '300px' }}>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>About the Event</h2>
            <p style={{ fontSize: '16px', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{event.description}</p>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: '16px' }}>Venue Information</h2>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>{event.venue.name}</p>
            <p style={{ marginBottom: '12px' }}>{event.venue.address}</p>
            <div style={mapPlaceholderStyle}>
              <span style={{ fontSize: '20px' }}>🗺️ Venue Location: {event.venue.location}</span>
            </div>
          </div>
        </div>

        {/* Booking / Waitlist Sidebar */}
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div className="card" style={sidebarCardStyle}>
            <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Ticket Details</h3>
            
            {/* Availability Status Badge */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ marginRight: '8px', color: 'var(--text-muted)' }}>Status:</span>
              {event.availabilityStatus === 'AVAILABLE' && (
                <span className="badge badge-available">Tickets Available</span>
              )}
              {event.availabilityStatus === 'LIMITED' && (
                <span className="badge badge-limited">Limited Availability</span>
              )}
              {event.availabilityStatus === 'SOLD_OUT' && (
                <span className="badge badge-soldout">Sold Out</span>
              )}
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                {event.availableSeats} of {event.totalSeats} seats remaining
              </div>
            </div>

            {/* Price List */}
            <div style={pricingListStyle}>
              {event.categories.map((cat) => (
                <div key={cat.id} style={pricingItemStyle}>
                  <span style={{ fontWeight: 600 }}>{cat.name}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 800 }}>${cat.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            {event.availabilityStatus !== 'SOLD_OUT' ? (
              <div style={{ marginTop: '24px' }}>
                <Link
                  href={user ? `/customer/events/${event.id}/book` : `/customer/login?redirect=/customer/events/${event.id}/book`}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px 20px', textAlign: 'center' }}
                >
                  🎟️ Select Seats & Book
                </Link>
                <p style={concurrencyTipStyle}>⚡ Lock seats dynamically for 10 minutes during checkout.</p>
              </div>
            ) : (
              // Waitlist Join Form
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <h4 style={{ marginBottom: '12px', color: '#fff' }}>Join the Waitlist</h4>
                <p style={{ fontSize: '13px', marginBottom: '16px' }}>This event is sold out. Join the waitlist to receive priority ticket offers if bookings are cancelled.</p>
                
                {waitlistStatus && (
                  <div style={{
                    ...statusMessageStyle,
                    backgroundColor: waitlistStatus.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: waitlistStatus.success ? 'var(--success)' : 'var(--error)',
                    borderColor: waitlistStatus.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  }}>
                    {waitlistStatus.message}
                  </div>
                )}

                <form onSubmit={handleJoinWaitlist}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" htmlFor="category">Select Ticket Category</label>
                    <select
                      id="category"
                      className="form-select"
                      value={selectedWaitlistCat}
                      onChange={(e) => setSelectedWaitlistCat(e.target.value)}
                    >
                      {event.categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name} (${cat.price})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={waitlistSubmitting}
                  >
                    {waitlistSubmitting ? 'Joining Queue...' : 'Join Waitlist Queue'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const bannerContainerStyle = {
  width: '100%',
  height: '350px',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  position: 'relative' as const,
  marginBottom: '40px',
  border: '1px solid var(--border-color)',
};

const bannerStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
};

const bannerOverlayStyle = {
  position: 'absolute' as const,
  bottom: 0,
  left: 0,
  right: 0,
  top: 0,
  background: 'linear-gradient(to top, rgba(10, 12, 16, 1) 0%, rgba(10, 12, 16, 0.4) 60%, rgba(0,0,0,0) 100%)',
  display: 'flex',
  alignItems: 'flex-end',
  padding: '40px',
};

const bannerTextStyle = {
  maxWidth: '750px',
};

const dateBadgeStyle = {
  backgroundColor: 'var(--primary)',
  color: 'white',
  padding: '6px 12px',
  borderRadius: '50px',
  fontSize: '13px',
  fontWeight: 700,
  display: 'inline-block',
  marginBottom: '16px',
};

const titleStyle = {
  fontSize: '36px',
  fontWeight: 800,
  marginBottom: '10px',
  color: '#fff',
  lineHeight: '1.2',
};

const locationSubtitleStyle = {
  fontSize: '16px',
  color: 'var(--text-muted)',
};

const detailsGridStyle = {
  display: 'flex',
  gap: '30px',
  flexWrap: 'wrap' as const,
};

const mapPlaceholderStyle = {
  width: '100%',
  height: '180px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-muted)',
};

const sidebarCardStyle = {
  position: 'sticky' as const,
  top: '90px',
};

const pricingListStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
  margin: '20px 0',
  backgroundColor: 'var(--bg-input)',
  padding: '16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)',
};

const pricingItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '15px',
};

const concurrencyTipStyle = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  marginTop: '12px',
  textAlign: 'center' as const,
};

const statusMessageStyle = {
  border: '1px solid',
  padding: '10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '13px',
  marginBottom: '16px',
  lineHeight: '1.4',
};
