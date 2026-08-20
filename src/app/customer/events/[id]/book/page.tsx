'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface Seat {
  id: string;
  rowName: string;
  seatNumber: number;
  category: string;
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  holdsUser: boolean;
  offersUser: boolean;
  offerId: string | null;
}

function BookSeatsPageContent() {
  const router = useRouter();
  const { id: eventId } = useParams();
  const searchParams = useSearchParams();
  const offerIdParam = searchParams.get('offerId'); // If checking out a waitlist offer
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Timer & Holds state
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Checkout state
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [confirmedRef, setConfirmedRef] = useState('');

  // 1. Fetch event metadata and initial seat map
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'CUSTOMER')) {
      router.push(`/customer/login?redirect=/customer/events/${eventId}/book`);
      return;
    }

    async function loadEventData() {
      try {
        const eventRes = await fetch(`/api/events/${eventId}`);
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEvent(eventData.event);
        }

        await fetchSeatMap();
      } catch (err) {
        setError('Failed to load seat layout.');
      } finally {
        setLoading(false);
      }
    }

    loadEventData();
  }, [eventId, user, authLoading, router]);

  // 2. Fetch Seat Map helper (runs on load and every 3 seconds for polling)
  const fetchSeatMap = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/seats`);
      if (res.ok) {
        const data = await res.json();
        setSeats(data.seats);

        // Determine countdown timer based on active holds or offers
        let activeExpiresAt: string | null = null;

        if (offerIdParam) {
          // If booking a waitlist offer, track that offer's expiry
          const userOffer = data.activeOffers.find((o: any) => o.id === offerIdParam);
          if (userOffer) activeExpiresAt = userOffer.expiresAt;
        } else {
          // If normal seat hold checkout, track first active hold's expiry
          if (data.activeHolds.length > 0) {
            activeExpiresAt = data.activeHolds[0].expiresAt;
          }
        }

        if (activeExpiresAt) {
          setExpiryTime(new Date(activeExpiresAt));
        } else {
          setExpiryTime(null);
          setTimeLeft('');
        }
      }
    } catch (err) {
      console.error('Error fetching seat map:', err);
    }
  };

  // 3. Short Polling (Every 3 seconds)
  useEffect(() => {
    if (loading || error || checkoutSuccess) return;

    const interval = setInterval(() => {
      fetchSeatMap();
    }, 3000);

    return () => clearInterval(interval);
  }, [loading, error, checkoutSuccess]);

  // 4. Timer Countdown effect
  useEffect(() => {
    if (expiryTime) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const difference = expiryTime.getTime() - now;

        if (difference <= 0) {
          setTimeLeft('EXPIRED');
          if (timerRef.current) clearInterval(timerRef.current);
          fetchSeatMap(); // trigger immediate seat refresh
        } else {
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
          const pad = (num: number) => (num < 10 ? '0' + num : num);
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
  }, [expiryTime]);

  // 5. Handle seat hold locking transaction
  const handleSeatClick = async (seat: Seat) => {
    // If seat is booked, do nothing
    if (seat.status === 'BOOKED') return;
    
    // If waitlist offer is present, they cannot select ad-hoc seats (must book their offer seat)
    if (offerIdParam) return;

    setError('');
    const action = seat.holdsUser ? 'release' : 'hold';

    try {
      const res = await fetch('/api/seats/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          eventId,
          eventSeatIds: [seat.id],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Failed to ${action} seat.`);
      }

      await fetchSeatMap();
    } catch (err) {
      setError('Network error, please try again.');
    }
  };

  // 6. Handle Checkout Payment Form Submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    setCheckoutSubmitting(true);

    try {
      const body: any = {};
      if (offerIdParam) {
        body.offerId = offerIdParam;
      } else {
        body.eventId = eventId;
        body.eventSeatIds = seats.filter(s => s.holdsUser).map(s => s.id);
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setCheckoutSuccess(true);
        setConfirmedRef(data.bookingReference);
      } else {
        setCheckoutError(data.error || 'Failed to complete transaction.');
      }
    } catch (err) {
      setCheckoutError('Network connection issue. Please try again.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading interactive layout grid...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--error)' }}>{error || 'Seat selection unavailable'}</h2>
        <Link href={`/customer/events/${eventId}`} className="btn btn-secondary" style={{ marginTop: '20px' }}>
          Back to Event details
        </Link>
      </div>
    );
  }

  if (checkoutSuccess) {
    return (
      <div className="container" style={successContainerStyle}>
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center', margin: 'auto' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🎉</span>
          <h2 style={{ color: 'var(--success)', marginBottom: '16px' }}>Booking Confirmed!</h2>
          <p style={{ marginBottom: '24px' }}>Your booking was completed successfully. We have sent a confirmation email containing your QR Code tickets.</p>
          
          <div style={bookingRefBoxStyle}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reference Code</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'block', marginTop: '4px' }}>{confirmedRef}</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '30px' }}>
            <Link href="/customer/bookings" className="btn btn-primary">
              🎟️ View My Tickets
            </Link>
            <Link href="/customer/dashboard" className="btn btn-secondary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedSeats = seats.filter(s => s.holdsUser || (offerIdParam && s.id === seats.find(x => x.offersUser)?.id));
  const subtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const convenienceFee = subtotal > 0 ? 5.00 : 0;
  const total = subtotal + convenienceFee;

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      {/* Event summary header */}
      <div style={headerStyle}>
        <div>
          <Link href={`/customer/events/${eventId}`} style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 600 }}>
            &larr; Back to Event Details
          </Link>
          <h1 style={{ marginTop: '8px' }}>{event.title}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>📍 {event.venue.name} • 📅 {event.date} at {event.time}</p>
        </div>

        {/* Live seat hold countdown timer */}
        {timeLeft && (
          <div style={{
            ...timerBoxStyle,
            borderColor: timeLeft === 'EXPIRED' ? 'var(--error)' : 'var(--warning)',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hold Timer</span>
            <span style={{
              fontSize: '20px',
              fontWeight: 800,
              color: timeLeft === 'EXPIRED' ? 'var(--error)' : 'var(--warning)',
            }}>{timeLeft}</span>
          </div>
        )}
      </div>

      {checkoutError && <div style={errorStyle}>{checkoutError}</div>}

      <div style={layoutGridStyle}>
        {/* Left Side: Seat Map Grid */}
        <div className="card" style={{ flex: 2, minWidth: '350px', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '8px', color: '#fff' }}>STAGE / SCREEN</h3>
          <div style={stageLineStyle}></div>

          {/* Seat Layout Rows */}
          <div style={gridStyle}>
            {seats.reduce((rows, seat) => {
              if (!rows.includes(seat.rowName)) rows.push(seat.rowName);
              return rows;
            }, [] as string[]).map((row) => (
              <div key={row} style={rowStyle}>
                <span style={rowLabelStyle}>Row {row}</span>
                <div style={seatsInRowStyle}>
                  {seats.filter(s => s.rowName === row).map((seat) => {
                    // Determine styling based on seat state
                    let background = 'var(--bg-input)';
                    let border = '1px solid var(--border-color)';
                    let color = '#fff';
                    let cursor = 'pointer';

                    if (seat.status === 'BOOKED') {
                      background = 'rgba(239, 68, 68, 0.15)';
                      border = '1px solid var(--error)';
                      color = 'var(--error)';
                      cursor = 'not-allowed';
                    } else if (seat.holdsUser || (offerIdParam && seat.offersUser)) {
                      background = 'rgba(59, 130, 246, 0.3)';
                      border = '2px solid var(--primary)';
                      color = '#fff';
                    } else if (seat.status === 'HELD') {
                      background = 'rgba(245, 158, 11, 0.1)';
                      border = '1px dashed var(--warning)';
                      color = 'var(--warning)';
                      cursor = 'not-allowed';
                    }

                    return (
                      <button
                        key={seat.id}
                        style={{ ...seatButtonStyle, backgroundColor: background, border, color, cursor }}
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status === 'BOOKED' || (seat.status === 'HELD' && !seat.holdsUser && !seat.offersUser)}
                        title={`Row ${seat.rowName} Seat ${seat.seatNumber} (${seat.category} - $${seat.price})`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={legendContainerStyle}>
            <div style={legendItemStyle}>
              <span style={{ ...legendDotStyle, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}></span>
              <span>Available</span>
            </div>
            <div style={legendItemStyle}>
              <span style={{ ...legendDotStyle, backgroundColor: 'rgba(59, 130, 246, 0.3)', border: '2px solid var(--primary)' }}></span>
              <span>Selected</span>
            </div>
            <div style={legendItemStyle}>
              <span style={{ ...legendDotStyle, backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px dashed var(--warning)' }}></span>
              <span>Held by Others</span>
            </div>
            <div style={legendItemStyle}>
              <span style={{ ...legendDotStyle, backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--error)' }}></span>
              <span>Booked</span>
            </div>
          </div>
        </div>

        {/* Right Side: Order Summary & Checkout Form */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div className="card" style={checkoutCardStyle}>
            <h3 style={{ marginBottom: '16px', color: '#fff' }}>Order Summary</h3>

            {selectedSeats.length === 0 ? (
              <div style={emptyOrderStyle}>
                <span style={{ fontSize: '32px', marginBottom: '8px' }}>💺</span>
                <p>Select seats from the visual grid to start checkout.</p>
              </div>
            ) : (
              <div>
                <div style={orderListStyle}>
                  {selectedSeats.map((s) => (
                    <div key={s.id} style={orderItemStyle}>
                      <span>Row {s.rowName}, Seat {s.seatNumber} ({s.category})</span>
                      <strong style={{ color: '#fff' }}>${s.price.toFixed(2)}</strong>
                    </div>
                  ))}
                  <div style={orderItemStyle}>
                    <span>Convenience Fee</span>
                    <span>${convenienceFee.toFixed(2)}</span>
                  </div>
                  <div style={totalRowStyle}>
                    <span>Total Amount</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Simulated Payment Gateway */}
                {timeLeft !== 'EXPIRED' && (
                  <form onSubmit={handleCheckout} style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <h4 style={{ color: '#fff', marginBottom: '16px' }}>💳 Simulated Checkout</h4>
                    
                    <div className="form-group">
                      <label className="form-label" htmlFor="cardName">Cardholder Name</label>
                      <input
                        id="cardName"
                        type="text"
                        className="form-input"
                        placeholder="John Doe"
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

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '14px', marginTop: '16px' }}
                      disabled={checkoutSubmitting}
                    >
                      {checkoutSubmitting ? 'Confirming payment...' : `Pay $${total.toFixed(2)} & Confirm`}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Styling definitions
const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '32px',
  flexWrap: 'wrap' as const,
  gap: '16px',
};

const timerBoxStyle = {
  border: '1px solid',
  borderRadius: 'var(--radius-md)',
  padding: '8px 16px',
  backgroundColor: 'rgba(10, 12, 16, 0.5)',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  minWidth: '100px',
};

const layoutGridStyle = {
  display: 'flex',
  gap: '30px',
  flexWrap: 'wrap' as const,
};

const stageLineStyle = {
  width: '80%',
  height: '6px',
  background: 'linear-gradient(to right, rgba(99, 102, 241, 0) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(99, 102, 241, 0) 100%)',
  margin: '12px auto 40px auto',
  borderRadius: '10px',
};

const gridStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
  alignItems: 'center',
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  maxWidth: '550px',
};

const rowLabelStyle = {
  width: '70px',
  fontWeight: 700,
  fontSize: '14px',
  textAlign: 'left' as const,
  color: 'var(--text-muted)',
};

const seatsInRowStyle = {
  display: 'flex',
  gap: '8px',
  flex: 1,
  justifyContent: 'center',
};

const seatButtonStyle = {
  width: '32px',
  height: '32px',
  fontSize: '11px',
  fontWeight: 700,
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  transition: 'var(--transition)',
};

const legendContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '16px 24px',
  justifyContent: 'center',
  marginTop: '32px',
  borderTop: '1px solid var(--border-color)',
  paddingTop: '20px',
  width: '100%',
};

const legendItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  color: 'var(--text-muted)',
};

const legendDotStyle = {
  width: '14px',
  height: '14px',
  borderRadius: '3px',
  display: 'inline-block',
};

const checkoutCardStyle = {
  position: 'sticky' as const,
  top: '90px',
};

const emptyOrderStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  padding: '40px 20px',
  textAlign: 'center' as const,
  color: 'var(--text-muted)',
};

const orderListStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
  backgroundColor: 'var(--bg-input)',
  padding: '16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)',
};

const orderItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '14px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  paddingBottom: '8px',
};

const totalRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '16px',
  fontWeight: 700,
  color: '#fff',
  marginTop: '8px',
};

const errorStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  color: 'var(--error)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  padding: '10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '13px',
  marginBottom: '16px',
  textAlign: 'center' as const,
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

export default function BookSeatsPage() {
  return (
    <Suspense fallback={
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading booking details...</p>
      </div>
    }>
      <BookSeatsPageContent />
    </Suspense>
  );
}
