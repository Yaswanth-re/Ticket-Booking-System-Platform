'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateVenuePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [rowsCount, setRowsCount] = useState(5);
  const [seatsPerRow, setSeatsPerRow] = useState(6);
  
  // Row category mapping state: e.g. { 'A': 'Premium', 'B': 'Standard' }
  const [rowCategories, setRowCategories] = useState<Record<string, string>>({});
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Regenerate rowCategories state when rowsCount changes
  useEffect(() => {
    const newMapping: Record<string, string> = {};
    for (let r = 0; r < rowsCount; r++) {
      const rowName = String.fromCharCode(65 + r); // A, B, C...
      // Provide a reasonable default
      if (rowName === 'A') {
        newMapping[rowName] = 'Premium';
      } else if (rowName === 'B' || rowName === 'C') {
        newMapping[rowName] = 'Standard';
      } else {
        newMapping[rowName] = 'Economy';
      }
    }
    setRowCategories(newMapping);
  }, [rowsCount]);

  const handleCategoryChange = (row: string, category: string) => {
    setRowCategories((prev) => ({
      ...prev,
      [row]: category,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !location || !address || !rowsCount || !seatsPerRow) {
      setError('All fields are required.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location,
          address,
          rowsCount,
          seatsPerRow,
          seatCategories: rowCategories,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Venue and seat layout generated successfully! Redirecting...');
        setTimeout(() => {
          router.push('/admin/venues');
        }, 1500);
      } else {
        setError(data.error || 'Failed to create venue.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verifying admin session...</p>
      </div>
    );
  }

  // Generate array for list rendering of rows configuration
  const rowsList = Array.from({ length: rowsCount }, (_, i) => String.fromCharCode(65 + i));

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '750px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/venues" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          &larr; Back to Venues List
        </Link>
      </div>

      <div className="card">
        <h1 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          🏗️ Venue Layout Builder
        </h1>

        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        <form onSubmit={handleSubmit}>
          
          {/* Basic Venue Details */}
          <div className="form-group">
            <label className="form-label" htmlFor="name">Venue Name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Madison Square Garden Cinema"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label" htmlFor="location">City / Location</label>
              <input
                id="location"
                type="text"
                className="form-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New York"
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1.5, minWidth: '250px' }}>
              <label className="form-label" htmlFor="address">Address</label>
              <input
                id="address"
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 4 Pennsylvania Plaza, NY"
                required
              />
            </div>
          </div>

          {/* Seat Grid Sizing */}
          <h3 style={{ margin: '24px 0 12px 0', color: '#fff', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            Grid Layout Scale
          </h3>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="rowsCount">Number of Rows</label>
              <select
                id="rowsCount"
                className="form-select"
                value={rowsCount}
                onChange={(e) => setRowsCount(parseInt(e.target.value))}
              >
                {[...Array(15)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1} Rows ({String.fromCharCode(65)} to {String.fromCharCode(65 + i)})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="seatsPerRow">Seats Per Row</label>
              <select
                id="seatsPerRow"
                className="form-select"
                value={seatsPerRow}
                onChange={(e) => setSeatsPerRow(parseInt(e.target.value))}
              >
                {[...Array(15)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1} Seats</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row Categories Configuration */}
          <h3 style={{ margin: '24px 0 12px 0', color: '#fff', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            Row Ticket Categories
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Assign seat categories for each row zone.
          </p>

          <div style={categoriesConfigBoxStyle}>
            {rowsList.map((row) => (
              <div key={row} style={rowCategoryConfigRowStyle}>
                <span style={{ fontWeight: 700, fontSize: '16px', color: '#fff', width: '40px' }}>
                  Row {row}
                </span>
                
                <select
                  className="form-select"
                  style={{ width: '200px' }}
                  value={rowCategories[row] || 'Standard'}
                  onChange={(e) => handleCategoryChange(row, e.target.value)}
                >
                  <option value="Premium">👑 Premium Category</option>
                  <option value="Standard">⭐ Standard Category</option>
                  <option value="Economy">🎫 Economy Category</option>
                </select>

                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Generates {seatsPerRow} seats: {row}1 to {row}{seatsPerRow}
                </span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: '24px' }}
            disabled={submitting}
          >
            {submitting ? 'Generating Venue layout...' : '🏗️ Generate Venue & Seats'}
          </button>
        </form>
      </div>
    </div>
  );
}

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

const categoriesConfigBoxStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
};

const rowCategoryConfigRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  paddingBottom: '8px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};
