import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'TicketHold - Premium Event Ticket Booking System',
  description: 'Book tickets for your favorite movies, concerts, and events with real-time seat selection, locking, and waitlist automation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <footer style={footerStyle}>
            <div className="container" style={footerContainerStyle}>
              <p>&copy; {new Date().getFullYear()} TicketHold. All rights reserved.</p>
              <div style={footerLinksStyle}>
                <span style={{ color: 'var(--text-muted)' }}>Secure Concurrency Protected booking engine.</span>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

const footerStyle = {
  backgroundColor: 'rgba(18, 22, 31, 0.5)',
  borderTop: '1px solid var(--border-color)',
  padding: '24px 0',
  marginTop: '60px',
};

const footerContainerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap' as const,
  gap: '12px',
  fontSize: '14px',
};

const footerLinksStyle = {
  display: 'flex',
  gap: '16px',
};
