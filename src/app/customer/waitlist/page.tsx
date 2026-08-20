'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface WaitlistEntry {
  id: string;
  eventId: string;
  status: 'WAITING' | 'OFFERED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  currentQueuePosition: number;
  joinedAt: string;
  event: { title: string; date: string; time: string; venue: { name: string; location: string } };
  category: { name: string; price: number };
  offers: Array<{
    id: string;
    eventSeatId: string;
    expiresAt: string;
    status: 'ACTIVE' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED';
    eventSeat: { rowName: string; seatNumber: number; price: number };
  }>;
}

function CustomerWaitlistPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightOfferId = searchParams.get('offerId');

  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Expiry & Countdown state
  const [activeOffer, setActiveOffer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Simulated Checkout Form inside Waitlist Offer
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [confirmedRef, setConfirmedRef] = useState('');

  async function loadWaitlist() {
    try {
      const res = await fetch('/api/waitlist');
      if (res.ok) {
        const data = await res.json();
        setWaitlist(data.waitlist);

        // Find active offer
        let foundOffer = null;
        for (const entry of data.waitlist) {
          if (entry.status === 'OFFERED') {
            const active = entry.offers.find((o: any) => o.status === 'ACTIVE');
            if (active) {
              foundOffer = {
                ...active,
                eventTitle: entry.event.title,
                eventDate: entry.event.date,
                eventTime: entry.event.time,
                venueName: entry.event.venue.name,
                categoryName: entry.category.name,
                waitlistId: entry.id,
              };
              break;
            }
          }
        }
        
        // If we have a highlighted offer via URL param, prioritize that or set it
        setActiveOffer(foundOffer);
      }
    } catch (err) {
      console.error('Error loading waitlist:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'CUSTOMER')) {
      router.push('/login');
      return;
    }
    if (user) {
      loadWaitlist();
    }
  }, [user, authLoading, router]);

  // Offer timer countdown
  useEffect(() => {
    if (activeOffer) {
      const expiry = new Date(activeOffer.expiresAt).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const distance = expiry - now;

        if (distance <= 0) {
          setTimeLeft('EXPIRED');
          setActiveOffer(null);
          loadWaitlist(); // reload waitlists
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          const pad = (n: number) => (n < 10 ? '0' + n : n);
          setTimeLeft(`${pad(minutes)}:${pad(seconds)}`);
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setTimeLeft('');
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeOffer]);

  // Accept Offer
  const handleAcceptOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOffer || timeLeft === 'EXPIRED') return;

    setMessage('');
    setCheckoutSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: activeOffer.id }),
      });

      const data = await res.json();
      if (res.ok) {
        setCheckoutSuccess(true);
        setConfirmedRef(data.bookingReference);
        await loadWaitlist();
      } else {
        setMessage(data.error || 'Failed to complete booking.');
      }
    } catch (err) {
      setMessage('Network error during checkout.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Decline Offer
  const handleDeclineOffer = async () => {
    if (!activeOffer) return;

    setMessage('');
    const confirmed = confirm('Are you sure you want to decline this ticket offer? It will immediately pass to the next person.');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/waitlist/offers/${activeOffer.id}/decline`, {
        method: 'POST',
      });

      if (res.ok) {
        setMessage('Offer declined successfully. Seat passed to the next customer.');
        setActiveOffer(null);
        await loadWaitlist();
      } else {
        const data = await res.json();
        setMessage(data.error || 'Failed to decline offer.');
      }
    } catch (err) {
      setMessage('Network error, please try again.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading waitlists...</p>
      </div>
    );
  }

  if (checkoutSuccess) {
    return (
      <div className="container" style={successContainerStyle}>
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center', margin: 'auto' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🎉</span>
          <h2 style={{ color: 'var(--success)', marginBottom: '16px' }}>Offer Accepted!</h2>
          <p style={{ marginBottom: '24px' }}>Your booking has been confirmed successfully. We have sent a confirmation email containing your QR Code tickets.</p>
          
          <div style={bookingRefBoxStyle}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reference Code</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'block', marginTop: '4px' }}>{confirmedRef}</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '30px' }}>
            <Link href="/customer/bookings" className="btn btn-primary">
              🎟️ View My Tickets
            </Link>
            <Link href="/" className="btn btn-secondary">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeQueues = waitlist.filter((w) => w.status === 'WAITING' || w.status === 'OFFERED');
  const pastQueues = waitlist.filter((w) => w.status !== 'WAITING' && w.status !== 'OFFERED');

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1 style={{ marginBottom: '10px' }}>My Waitlists & Offers</h1>
      <p style={{ marginBottom: '30px' }}>Track your queue status and claim ticket offers for sold-out events.</p>

      {message && <div style={messageStyle}>{message}</div>}

      <div style={layoutGridStyle}>
        {/* Left pane: Active Offer (if any) */}
        {activeOffer ? (
          <div className="card" style={activeOfferCardStyle}>
            <div style={offerHeaderStyle}>
              <h2 style={{ color: 'var(--warning)' }}>⏱️ Claim Your Ticket Offer!</h2>
              <span style={timerLabelStyle}>Offer Expires in: <strong style={{ color: 'var(--warning)', fontSize: '20px' }}>{timeLeft}</strong></span>
            </div>
            
            <p style={{ marginTop: '10px', fontSize: '15px' }}>
              A ticket has become available from the waitlist for this event! Fill out the billing details to book it.
            </p>

            <div style={offerDetailsBoxStyle}>
              <p style={{ color: '#fff', fontWeight: 600 }}>{activeOffer.eventTitle}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📍 {activeOffer.venueName} • 📅 {activeOffer.eventDate} at {activeOffer.eventTime}</p>
              
              <div style={seatBoxStyle}>
                <span>Seat: <strong>Row {activeOffer.eventSeat.rowName}, Seat {activeOffer.eventSeat.seatNumber}</strong> ({activeOffer.categoryName})</span>
                <span style={{ fontWeight: 800, color: 'var(--success)' }}>${activeOffer.eventSeat.price.toFixed(2)}</span>
              </div>
            </div>

            {/* Simulated Checkout Form */}
            <form onSubmit={handleAcceptOffer} style={checkoutFormStyle}>
              <h3 style={{ color: '#fff', marginBottom: '16px' }}>Checkout Payment</h3>
              
              <div className="form-group">
                <label className="form-label" htmlFor="cardName">Cardholder Name</label>
                <input
                  id="cardName"
                  type="text"
                  className="form-input"
                  placeholder="Jane Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cardNumber">Card Number</label>
                <input
                  id="cardNumber"
                  type="text"
                  className="form-input"
                  placeholder="4111 2222 3333 4444"
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="cardExpiry">Expiry Date</label>
                  <input
                    id="cardExpiry"
                    type="text"
                    className="form-input"
                    placeholder="MM/YY"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="cardCvv">CVV</label>
                  <input
                    id="cardCvv"
                    type="password"
                    className="form-input"
                    placeholder="123"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={checkoutSubmitting}
                >
                  {checkoutSubmitting ? 'Confirming...' : `Pay $${activeOffer.eventSeat.price.toFixed(2)} & Confirm`}
                </button>
                <button
                  type="button"
                  onClick={handleDeclineOffer}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Decline
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card" style={noOfferCardStyle}>
            <span style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</span>
            <h3>No pending ticket offers</h3>
            <p style={{ marginTop: '8px' }}>When a booking is cancelled, the first person on the waitlist will receive a ticket offer with a 10-minute countdown here.</p>
          </div>
        )}

        {/* Right pane: Waitlist Queue lists */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active waitlists */}
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>Active Waitlist Queues</h2>
            {activeQueues.length === 0 ? (
              <p style={emptyTextStyle}>You are not currently waiting in any queues.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeQueues.map((entry) => (
                  <div key={entry.id} style={queueItemBoxStyle}>
                    <div>
                      <h4 style={{ color: '#fff' }}>{entry.event.title}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Category: {entry.category.name} | Joined: {new Date(entry.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {entry.status === 'OFFERED' ? (
                        <span className="badge badge-limited">Offered</span>
                      ) : (
                        <span style={posBadgeStyle}>Queue Pos: #{entry.currentQueuePosition}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past waitlist activity */}
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>Waitlist Activity Log</h2>
            {pastQueues.length === 0 ? (
              <p style={emptyTextStyle}>No historical waitlist entries found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pastQueues.map((entry) => (
                  <div key={entry.id} style={historyRowStyle}>
                    <div>
                      <strong>{entry.event.title}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Category: {entry.category.name}
                      </span>
                    </div>
                    <div>
                      {entry.status === 'COMPLETED' && <span className="badge badge-available">Booked</span>}
                      {entry.status === 'EXPIRED' && <span className="badge badge-soldout">Expired</span>}
                      {entry.status === 'CANCELLED' && <span className="badge badge-soldout">Declined</span>}
                    </div>
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

// Styles
const messageStyle = {
  border: '1px solid',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  marginBottom: '24px',
  textAlign: 'center' as const,
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  color: 'var(--primary)',
  borderColor: 'rgba(59, 130, 246, 0.3)',
};

const layoutGridStyle = {
  display: 'flex',
  gap: '30px',
  flexWrap: 'wrap' as const,
};

const activeOfferCardStyle = {
  flex: 1.2,
  minWidth: '350px',
  border: '2px solid var(--warning)',
  background: 'linear-gradient(to bottom, rgba(245, 158, 11, 0.05) 0%, rgba(18, 22, 31, 1) 100%)',
};

const offerHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap' as const,
  gap: '12px',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '16px',
};

const timerLabelStyle = {
  fontSize: '13px',
  color: 'var(--text-muted)',
};

const offerDetailsBoxStyle = {
  backgroundColor: 'var(--bg-input)',
  padding: '16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)',
  margin: '20px 0',
};

const seatBoxStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '12px',
  borderTop: '1px solid rgba(255,255,255,0.05)',
  paddingTop: '12px',
  fontSize: '15px',
};

const checkoutFormStyle = {
  borderTop: '1px solid var(--border-color)',
  paddingTop: '20px',
};

const noOfferCardStyle = {
  flex: 1.2,
  minWidth: '350px',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center' as const,
  color: 'var(--text-muted)',
  padding: '80px 20px',
  height: 'fit-content',
};

const queueItemBoxStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
};

const posBadgeStyle = {
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  color: 'var(--primary)',
  padding: '6px 12px',
  borderRadius: '4px',
  fontWeight: 700,
  fontSize: '13px',
};

const historyRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const emptyTextStyle = {
  color: 'var(--text-muted)',
  textAlign: 'center' as const,
  padding: '20px 0',
  fontSize: '14px',
};

const successContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 20px',
  minHeight: 'calc(100vh - 170px)',
};

const bookingRefBoxStyle = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
  margin: '20px 0',
};

export default function CustomerWaitlistPage() {
  return (
    <Suspense fallback={
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading waitlists...</p>
      </div>
    }>
      <CustomerWaitlistPageContent />
    </Suspense>
  );
}
