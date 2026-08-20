'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Venue {
  id: string;
  name: string;
  location: string;
  rowsCount: number;
  seatsPerRow: number;
}

export default function CreateEventPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venueId, setVenueId] = useState('');
  
  // Ticket Prices
  const [pricePremium, setPricePremium] = useState('120');
  const [priceStandard, setPriceStandard] = useState('75');
  const [priceEconomy, setPriceEconomy] = useState('45');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ORGANISER')) {
      router.push('/organiser/login');
      return;
    }

    async function loadVenues() {
      try {
        const res = await fetch('/api/venues');
        if (res.ok) {
          const data = await res.json();
          setVenues(data.venues);
          if (data.venues.length > 0) {
            setVenueId(data.venues[0].id);
          }
        }
      } catch (err) {
        setError('Failed to fetch venues list.');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadVenues();
    }
  }, [user, authLoading, router]);

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!title || !description || !imageUrl) {
        setError('Please fill in all event details.');
        return;
      }
    }
    if (step === 2) {
      if (!venueId || !date || !time) {
        setError('Please select a venue, date, and showtime.');
        return;
      }
    }
    if (step === 3) {
      const premium = parseFloat(pricePremium);
      const standard = parseFloat(priceStandard);
      const economy = parseFloat(priceEconomy);
      if (isNaN(premium) || isNaN(standard) || isNaN(economy) || premium < 0 || standard < 0 || economy < 0) {
        setError('Please assign valid ticket pricing rules.');
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const premium = parseFloat(pricePremium);
    const standard = parseFloat(priceStandard);
    const economy = parseFloat(priceEconomy);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          imageUrl,
          date,
          time,
          venueId,
          ticketPrices: {
            Premium: premium,
            Standard: standard,
            Economy: economy,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Event created successfully! Redirecting...');
        setTimeout(() => {
          router.push('/organiser/dashboard');
        }, 1500);
      } else {
        setError(data.error || 'Failed to create event.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading layout configuration...</p>
      </div>
    );
  }

  const selectedVenue = venues.find(v => v.id === venueId);

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '750px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/organiser/dashboard" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Step Indicators */}
      <div style={stepIndicatorContainerStyle}>
        <div style={{ ...stepDotStyle, backgroundColor: step >= 1 ? 'var(--primary)' : 'var(--bg-input)' }}>1</div>
        <div style={stepConnectorStyle}></div>
        <div style={{ ...stepDotStyle, backgroundColor: step >= 2 ? 'var(--primary)' : 'var(--bg-input)' }}>2</div>
        <div style={stepConnectorStyle}></div>
        <div style={{ ...stepDotStyle, backgroundColor: step >= 3 ? 'var(--primary)' : 'var(--bg-input)' }}>3</div>
        <div style={stepConnectorStyle}></div>
        <div style={{ ...stepDotStyle, backgroundColor: step >= 4 ? 'var(--primary)' : 'var(--bg-input)' }}>4</div>
      </div>

      <div className="card">
        <h1 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          {step === 1 && 'Step 1: Event Information'}
          {step === 2 && 'Step 2: Location & Venue'}
          {step === 3 && 'Step 3: Ticket Pricing'}
          {step === 4 && 'Step 4: Review & Publish'}
        </h1>

        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        {/* STEP 1: Basic Event Information */}
        {step === 1 && (
          <div>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Event Title</label>
              <input
                id="title"
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Rock On The Beach Summer Festival"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Event Description</label>
              <textarea
                id="description"
                className="form-textarea"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of the event, itinerary, artist details..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="imageUrl">Banner Image URL</label>
              <input
                id="imageUrl"
                type="url"
                className="form-input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={nextStep} type="button" className="btn btn-primary">
                Next: Venue Details &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Location & Venue details */}
        {step === 2 && (
          <div>
            <div className="form-group">
              <label className="form-label" htmlFor="venue">Venue Selection</label>
              {venues.length === 0 ? (
                <div style={{ color: 'var(--error)', fontSize: '14px' }}>
                  No venues configured. Please ask an Admin to create a venue first.
                </div>
              ) : (
                <select
                  id="venue"
                  className="form-select"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.location}) — Layout: {v.rowsCount}x{v.seatsPerRow} ({v.rowsCount * v.seatsPerRow} seats)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                <label className="form-label" htmlFor="date">Show Date</label>
                <input
                  id="date"
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                <label className="form-label" htmlFor="time">Show Time</label>
                <input
                  id="time"
                  type="time"
                  className="form-input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button onClick={prevStep} type="button" className="btn btn-secondary">
                &larr; Back
              </button>
              <button onClick={nextStep} type="button" className="btn btn-primary" disabled={venues.length === 0}>
                Next: Pricing &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Pricing config */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Define pricing policies for the three standard zones. Seats will be mapped based on the venue's template layout.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="pricePremium">👑 Premium Price ($)</label>
                <input
                  id="pricePremium"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={pricePremium}
                  onChange={(e) => setPricePremium(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="priceStandard">⭐ Standard Price ($)</label>
                <input
                  id="priceStandard"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={priceStandard}
                  onChange={(e) => setPriceStandard(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="priceEconomy">🎫 Economy Price ($)</label>
                <input
                  id="priceEconomy"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={priceEconomy}
                  onChange={(e) => setPriceEconomy(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button onClick={prevStep} type="button" className="btn btn-secondary">
                &larr; Back
              </button>
              <button onClick={nextStep} type="button" className="btn btn-primary">
                Next: Review &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Submit */}
        {step === 4 && (
          <div>
            <div style={reviewCardStyle}>
              {imageUrl && <img src={imageUrl} alt="Event Preview" style={reviewImageStyle} />}
              <div style={{ padding: '20px' }}>
                <h3 style={{ color: '#fff', fontSize: '22px', marginBottom: '8px' }}>{title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 700 }}>📅 {date} at {time}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>📍 Venue: {selectedVenue?.name} ({selectedVenue?.location})</p>
                
                <p style={{ fontSize: '14px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {description.substring(0, 150)}...
                </p>

                <div style={reviewPricingGridStyle}>
                  <div style={reviewPricingItemStyle}>
                    <span>Premium Price</span>
                    <strong>${parseFloat(pricePremium).toFixed(2)}</strong>
                  </div>
                  <div style={reviewPricingItemStyle}>
                    <span>Standard Price</span>
                    <strong>${parseFloat(priceStandard).toFixed(2)}</strong>
                  </div>
                  <div style={reviewPricingItemStyle}>
                    <span>Economy Price</span>
                    <strong>${parseFloat(priceEconomy).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button onClick={prevStep} type="button" className="btn btn-secondary" disabled={submitting}>
                &larr; Back
              </button>
              <button onClick={handleSubmit} type="button" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating Show...' : '🚀 Create & Publish Event'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Styling definitions
const stepIndicatorContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '30px',
  gap: '12px',
};

const stepDotStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '14px',
};

const stepConnectorStyle = {
  width: '40px',
  height: '2px',
  backgroundColor: 'var(--border-color)',
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

const successStyle = {
  backgroundColor: 'rgba(16, 185, 129, 0.15)',
  color: 'var(--success)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const reviewCardStyle = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
};

const reviewImageStyle = {
  width: '100%',
  height: '200px',
  objectFit: 'cover' as const,
};

const reviewPricingGridStyle = {
  display: 'flex',
  gap: '16px',
  marginTop: '20px',
  borderTop: '1px solid rgba(255,255,255,0.05)',
  paddingTop: '16px',
  flexWrap: 'wrap' as const,
};

const reviewPricingItemStyle = {
  flex: 1,
  backgroundColor: 'rgba(255,255,255,0.02)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  padding: '10px',
  textAlign: 'center' as const,
  minWidth: '100px',
};
