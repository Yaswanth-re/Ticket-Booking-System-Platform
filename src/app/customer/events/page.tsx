'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  time: string;
  venue: {
    name: string;
    location: string;
  };
  startingPrice: number;
  availabilityStatus: 'AVAILABLE' | 'LIMITED' | 'SOLD_OUT';
}

export default function CustomerEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [search, setSearch] = useState('');
  const [locationsList, setLocationsList] = useState<string[]>([]);

  useEffect(() => {
    async function loadEvents() {
      try {
        const queryParams = new URLSearchParams();
        if (location) queryParams.set('location', location);
        if (search) queryParams.set('search', search);

        const res = await fetch(`/api/events?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events);

          // Get unique locations list from all events
          if (locationsList.length === 0) {
            const rawRes = await fetch('/api/events');
            if (rawRes.ok) {
              const rawData = await rawRes.json();
              const locs = Array.from(new Set(rawData.events.map((e: any) => e.venue.location))) as string[];
              setLocationsList(locs);
            }
          }
        }
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [location, search, locationsList.length]);

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Search Header */}
      <section style={heroStyle}>
        <div className="container" style={heroContainerStyle}>
          <h1 style={heroTitleStyle} className="hero-title">Discover Events</h1>
          <p style={heroSubStyle}>Search through live concerts, theatrical musicals, movies, and comedy shows.</p>
          
          {/* Search & Location Bar */}
          <div style={searchBarContainerStyle}>
            <div style={searchFieldStyle}>
              <span style={searchIconStyle}>🔍</span>
              <input
                type="text"
                placeholder="Search events, movies, concerts..."
                style={searchInputStyle}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div style={selectFieldStyle}>
              <span style={searchIconStyle}>📍</span>
              <select
                style={selectInputStyle}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">All Locations</option>
                {locationsList.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section style={{ padding: '40px 0' }}>
        <div className="container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Searching catalog...</p>
            </div>
          ) : events.length === 0 ? (
            <div style={emptyStateStyle}>
              <span style={{ fontSize: '48px', marginBottom: '16px' }}>📭</span>
              <h3>No events match your criteria</h3>
              <p>Try resetting the search keywords or location filters.</p>
              <button
                className="btn btn-secondary"
                style={{ marginTop: '16px' }}
                onClick={() => { setSearch(''); setLocation(''); }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div style={eventGridStyle}>
              {events.map((event) => (
                <div key={event.id} className="card" style={eventCardStyle}>
                  <div style={imageContainerStyle}>
                    <img src={event.imageUrl} alt={event.title} style={imageStyle} />
                    <div style={availabilityBadgeStyle}>
                      {event.availabilityStatus === 'AVAILABLE' && (
                        <span className="badge badge-available">Available</span>
                      )}
                      {event.availabilityStatus === 'LIMITED' && (
                        <span className="badge badge-limited">Limited Seats</span>
                      )}
                      {event.availabilityStatus === 'SOLD_OUT' && (
                        <span className="badge badge-soldout">Sold Out</span>
                      )}
                    </div>
                  </div>

                  <div style={eventBodyStyle}>
                    <span style={eventLocationStyle}>📍 {event.venue.name} • {event.venue.location}</span>
                    <h3 style={eventTitleStyle}>{event.title}</h3>
                    <p style={eventDescStyle}>{event.description.substring(0, 100)}...</p>
                    
                    <div style={eventFooterStyle}>
                      <div style={priceGroupStyle}>
                        <span style={priceLabelStyle}>Tickets from</span>
                        <span style={priceValueStyle}>${event.startingPrice.toFixed(2)}</span>
                      </div>
                      <Link href={`/customer/events/${event.id}`} className="btn btn-primary" style={bookBtnStyle}>
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Styling definitions
const heroStyle = {
  background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, rgba(10, 12, 16, 1) 80%)',
  borderBottom: '1px solid var(--border-color)',
  padding: '60px 0',
  textAlign: 'center' as const,
};

const heroContainerStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  maxWidth: '800px',
};

const heroTitleStyle = {
  fontWeight: 800,
  lineHeight: 1.15,
  marginBottom: '10px',
};

const heroSubStyle = {
  fontSize: '15px',
  color: 'var(--text-muted)',
  marginBottom: '24px',
  maxWidth: '600px',
};

const searchBarContainerStyle = {
  display: 'flex',
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  width: '100%',
  maxWidth: '650px',
  padding: '8px',
  boxShadow: 'var(--shadow-md)',
  gap: '8px',
  flexWrap: 'wrap' as const,
};

const searchFieldStyle = {
  display: 'flex',
  alignItems: 'center',
  flex: 2,
  minWidth: '200px',
  backgroundColor: 'var(--bg-input)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
};

const selectFieldStyle = {
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  minWidth: '150px',
  backgroundColor: 'var(--bg-input)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
};

const searchIconStyle = {
  marginRight: '8px',
  fontSize: '16px',
};

const searchInputStyle = {
  border: 'none',
  background: 'transparent',
  color: '#fff',
  width: '100%',
  fontSize: '15px',
  outline: 'none',
};

const selectInputStyle = {
  border: 'none',
  background: 'transparent',
  color: '#fff',
  width: '100%',
  fontSize: '15px',
  outline: 'none',
  cursor: 'pointer',
};

const eventGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '30px',
};

const eventCardStyle = {
  padding: 0,
  display: 'flex',
  flexDirection: 'column' as const,
};

const imageContainerStyle = {
  width: '100%',
  height: '200px',
  position: 'relative' as const,
};

const imageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
};

const availabilityBadgeStyle = {
  position: 'absolute' as const,
  top: '12px',
  left: '12px',
};

const eventBodyStyle = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column' as const,
  flex: 1,
};

const eventLocationStyle = {
  fontSize: '12px',
  color: 'var(--accent)',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  marginBottom: '8px',
};

const eventTitleStyle = {
  fontSize: '20px',
  marginBottom: '10px',
  color: '#fff',
};

const eventDescStyle = {
  fontSize: '14px',
  color: 'var(--text-muted)',
  marginBottom: '20px',
  flex: 1,
};

const eventFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderTop: '1px solid var(--border-color)',
  paddingTop: '16px',
};

const priceGroupStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
};

const priceLabelStyle = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
};

const priceValueStyle = {
  fontSize: '18px',
  fontWeight: 800,
  color: '#fff',
};

const bookBtnStyle = {
  padding: '8px 16px',
  fontSize: '14px',
};

const emptyStateStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 20px',
  textAlign: 'center' as const,
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-card)',
};
