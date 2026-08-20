import React from 'react';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import Link from 'next/link';

// Instantiate client in Server Component
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface PageProps {
  params: Promise<{ reference: string }>;
}

export default async function PublicTicketPage({ params }: PageProps) {
  const { reference } = await params;

  // Retrieve booking details
  const booking = await prisma.booking.findUnique({
    where: { bookingReference: reference },
    include: {
      customer: { select: { name: true, email: true } },
      event: { include: { venue: true } },
      bookingSeats: {
        include: {
          eventSeat: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return (
      <div className="container" style={outerStyle}>
        <div className="card" style={{ maxWidth: '500px', margin: 'auto', textAlign: 'center' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>⚠️</span>
          <h2 style={{ color: 'var(--error)', marginBottom: '12px' }}>Invalid Ticket</h2>
          <p style={{ color: 'var(--text-muted)' }}>The ticket code <code>{reference}</code> could not be verified in our records.</p>
          <div style={{ marginTop: '24px' }}>
            <Link href="/" className="btn btn-secondary">Go to Homepage</Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="container" style={outerStyle}>
      <div className="card" style={ticketCardStyle}>
        {/* Verification Status Header */}
        <div style={{
          ...statusHeaderStyle,
          backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          borderColor: isCancelled ? 'var(--error)' : 'var(--success)',
          color: isCancelled ? 'var(--error)' : 'var(--success)',
        }}>
          <span style={{ fontSize: '28px' }}>{isCancelled ? '❌' : '✅'}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
              {isCancelled ? 'TICKET INVALID / CANCELLED' : 'VERIFIED VALID TICKET'}
            </h3>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>
              Booking Reference: {booking.bookingReference}
            </span>
          </div>
        </div>

        {/* Event Details */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>🎭 Event Details</h4>
          <h2 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>{booking.event.title}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            📅 {booking.event.date} at {booking.event.time}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            📍 {booking.event.venue.name} — {booking.event.venue.address}, {booking.event.venue.location}
          </p>
        </div>

        {/* Ticket Holder Details */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>👤 Ticket Holder</h4>
          <p style={{ color: '#fff', fontWeight: 600 }}>{booking.customer.name}</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{booking.customer.email}</p>
        </div>

        {/* Seat Layout Details */}
        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          <h4 style={sectionTitleStyle}>💺 Booked Seats</h4>
          <div style={seatsGridStyle}>
            {booking.bookingSeats.map((bs) => (
              <div key={bs.id} style={seatBadgeStyle}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
                  {bs.eventSeat.category.name}
                </span>
                <strong style={{ fontSize: '16px', color: '#fff' }}>
                  Row {bs.eventSeat.rowName}, Seat {bs.eventSeat.seatNumber}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            TicketHold Security Gate System — Verified on {new Date().toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// Styling
const outerStyle = {
  padding: '60px 20px',
  minHeight: 'calc(100vh - 170px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const ticketCardStyle = {
  maxWidth: '550px',
  width: '100%',
  border: '1px solid var(--border-color)',
  background: 'linear-gradient(to bottom, rgba(255,255,255,0.01) 0%, rgba(10, 12, 16, 1) 100%)',
};

const statusHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid',
  marginBottom: '24px',
};

const sectionStyle = {
  paddingBottom: '20px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  marginBottom: '20px',
};

const sectionTitleStyle = {
  fontSize: '11px',
  color: 'var(--accent)',
  textTransform: 'uppercase' as const,
  fontWeight: 700,
  letterSpacing: '0.05em',
  marginBottom: '8px',
};

const seatsGridStyle = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap' as const,
  marginTop: '8px',
};

const seatBadgeStyle = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 16px',
  minWidth: '100px',
};
