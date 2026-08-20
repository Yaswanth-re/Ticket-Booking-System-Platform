'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface BookingSeat {
  id: string;
  price: number;
  eventSeat: {
    rowName: string;
    seatNumber: number;
    category: { name: string };
  };
}

interface BookingDetails {
  id: string;
  bookingReference: string;
  totalAmount: number;
  status: 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  qrDataUrl: string;
  customer: { name: string; email: string };
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    venue: { name: string; location: string; address: string };
  };
  bookingSeats: BookingSeat[];
}

export default function BookingDetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id: bookingId } = useParams();

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Cancellation state
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  async function loadBookingDetails() {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
      } else {
        setError('Booking not found or access denied.');
      }
    } catch (err) {
      setError('Error loading ticket details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadBookingDetails();
    }
  }, [user, authLoading, bookingId, router]);

  const handleCancelBooking = async () => {
    setCancelling(true);
    setCancelMessage('');
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setCancelMessage('Booking cancelled successfully. Releasing seats...');
        setShowCancelConfirm(false);
        // Reload details to reflect new state
        await loadBookingDetails();
      } else {
        setCancelMessage(data.error || 'Failed to cancel booking.');
      }
    } catch (err) {
      setCancelMessage('Connection error. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading ticket details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--error)' }}>{error || 'Ticket details not found'}</h2>
        <Link href="/customer/bookings" className="btn btn-secondary" style={{ marginTop: '20px' }}>
          Back to My Bookings
        </Link>
      </div>
    );
  }

  const isConfirmed = booking.status === 'CONFIRMED';
  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/customer/bookings" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          &larr; Back to My Bookings
        </Link>
      </div>

      {cancelMessage && (
        <div style={{
          ...messageStyle,
          backgroundColor: cancelMessage.includes('successfully') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: cancelMessage.includes('successfully') ? 'var(--success)' : 'var(--error)',
          borderColor: cancelMessage.includes('successfully') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        }}>
          {cancelMessage}
        </div>
      )}

      {/* Ticket Wrapper Layout */}
      <div className="card" style={ticketCardStyle}>
        
        {/* Ticket Header Banner */}
        <div style={{
          ...ticketHeaderStyle,
          background: isCancelled 
            ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' 
            : 'var(--primary-gradient)',
        }}>
          <div>
            <span style={ticketCategoryLabelStyle}>E-TICKET ENTRY PASS</span>
            <h2 style={{ color: '#fff', fontSize: '24px', marginTop: '6px' }}>{booking.event.title}</h2>
            <p style={{ opacity: 0.8, fontSize: '14px', marginTop: '4px' }}>
              📍 {booking.event.venue.name} • {booking.event.venue.location}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={refBadgeStyle}>{booking.bookingReference}</span>
            <span style={dateBadgeStyle}>{booking.event.date}</span>
          </div>
        </div>

        {/* Ticket Body Details */}
        <div style={ticketBodyStyle}>
          {/* Main Info */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Customer Details */}
            <div>
              <h4 style={sectionHeaderStyle}>Ticket Holder</h4>
              <p style={valueTextStyle}>{booking.customer.name}</p>
              <p style={{ ...valueTextStyle, fontSize: '14px', color: 'var(--text-muted)' }}>
                {booking.customer.email}
              </p>
            </div>

            {/* Venue Address */}
            <div>
              <h4 style={sectionHeaderStyle}>Event Venue</h4>
              <p style={valueTextStyle}>{booking.event.venue.name}</p>
              <p style={{ ...valueTextStyle, fontSize: '14px', color: 'var(--text-muted)' }}>
                {booking.event.venue.address}
              </p>
              <p style={{ ...valueTextStyle, fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Show Starts: {booking.event.time}
              </p>
            </div>

            {/* Seats Table */}
            <div>
              <h4 style={sectionHeaderStyle}>Reserved Seats</h4>
              <div style={seatsListBoxStyle}>
                {booking.bookingSeats.map((bs) => (
                  <div key={bs.id} style={seatItemRowStyle}>
                    <span>
                      Seat <strong>{bs.eventSeat.rowName}{bs.eventSeat.seatNumber}</strong> 
                      <span style={seatCategoryStyle}> ({bs.eventSeat.category.name})</span>
                    </span>
                    <span style={{ fontWeight: 600 }}>${bs.price.toFixed(2)}</span>
                  </div>
                ))}
                <div style={totalRowStyle}>
                  <span>Total Amount Paid</span>
                  <span>${booking.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="qr-container">
            {isCancelled ? (
              <div style={cancelledStampStyle}>
                <span style={{ fontSize: '32px' }}>❌</span>
                <span style={{ fontSize: '18px', fontWeight: 800 }}>CANCELLED</span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>Seats Released</span>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <img src={booking.qrDataUrl} alt="Ticket QR Code" style={qrImageStyle} />
                <span style={scanTipStyle}>Scan at the entrance</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        {isConfirmed && (
          <div style={actionsPanelStyle}>
            {showCancelConfirm ? (
              <div style={confirmBoxStyle}>
                <p style={{ color: '#fff', fontWeight: 600, marginBottom: '12px' }}>
                  Are you absolutely sure you want to cancel this booking? This action is permanent and will release your seats.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleCancelBooking}
                    className="btn btn-danger"
                    disabled={cancelling}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Keep Tickets
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="btn btn-danger"
                style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '14px' }}
              >
                🗑️ Cancel Booking & Release Seats
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const messageStyle = {
  border: '1px solid',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const ticketCardStyle = {
  padding: 0,
  overflow: 'hidden',
};

const ticketHeaderStyle = {
  padding: '30px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  color: 'white',
  flexWrap: 'wrap' as const,
  gap: '20px',
};

const ticketCategoryLabelStyle = {
  fontSize: '10px',
  fontWeight: 800,
  letterSpacing: '0.15em',
  opacity: 0.8,
  textTransform: 'uppercase' as const,
};

const refBadgeStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  padding: '4px 10px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 700,
  display: 'block',
  marginBottom: '6px',
};

const dateBadgeStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  padding: '4px 10px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 700,
  display: 'block',
};

const ticketBodyStyle = {
  padding: '30px',
  display: 'flex',
  gap: '40px',
  flexWrap: 'wrap' as const,
};

const sectionHeaderStyle = {
  fontSize: '11px',
  color: 'var(--accent)',
  textTransform: 'uppercase' as const,
  fontWeight: 800,
  letterSpacing: '0.05em',
  marginBottom: '6px',
};

const valueTextStyle = {
  color: '#fff',
  fontWeight: 600,
};

const seatsListBoxStyle = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
  marginTop: '8px',
};

const seatItemRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '14px',
  paddingBottom: '8px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  marginBottom: '8px',
};

const seatCategoryStyle = {
  color: 'var(--text-muted)',
  fontSize: '12px',
};

const totalRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontWeight: 700,
  color: '#fff',
  fontSize: '15px',
  marginTop: '4px',
};

const qrContainerStyle = {};

const qrImageStyle = {
  width: '180px',
  height: '180px',
  backgroundColor: '#fff',
  padding: '8px',
  borderRadius: '8px',
};

const scanTipStyle = {
  display: 'block',
  fontSize: '12px',
  color: 'var(--text-muted)',
  marginTop: '8px',
};

const cancelledStampStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  border: '3px solid var(--error)',
  color: 'var(--error)',
  padding: '20px 40px',
  borderRadius: '8px',
  transform: 'rotate(-5deg)',
  backgroundColor: 'rgba(239, 68, 68, 0.05)',
};

const actionsPanelStyle = {
  padding: '24px 30px',
  backgroundColor: 'rgba(255,255,255,0.01)',
  borderTop: '1px solid var(--border-color)',
};

const confirmBoxStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.05)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  padding: '16px',
  borderRadius: 'var(--radius-md)',
};
