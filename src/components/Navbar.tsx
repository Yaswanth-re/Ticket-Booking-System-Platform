'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setMenuOpen(!menuOpen);

  // Hide navbar on landing, login, and registration pages
  const noNavbarRoutes = [
    '/',
    '/login',
    '/register',
    '/customer/login',
    '/customer/register',
    '/organiser/login',
    '/organiser/register',
    '/admin/login',
  ];

  if (noNavbarRoutes.includes(pathname)) {
    return null;
  }

  // Determine logo redirect path based on role
  let logoHref = '/';
  if (user) {
    if (user.role === 'ADMIN') logoHref = '/admin/dashboard';
    else if (user.role === 'ORGANISER') logoHref = '/organiser/dashboard';
    else logoHref = '/customer/dashboard';
  }

  return (
    <header style={styles.header}>
      <div className="container" style={styles.navContainer}>
        <div style={styles.logoGroup}>
          <Link href={logoHref} style={styles.logo}>
            Ticket<span style={styles.logoAccent}>Hold</span>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button onClick={toggleMenu} style={styles.menuToggle} className="navbar-menu-toggle" aria-label="Toggle menu">
          <div style={{ ...styles.bar, transform: menuOpen ? 'rotate(45deg) translate(5px, 6px)' : 'none' }}></div>
          <div style={{ ...styles.bar, opacity: menuOpen ? 0 : 1 }}></div>
          <div style={{ ...styles.bar, transform: menuOpen ? 'rotate(-45deg) translate(5px, -6px)' : 'none' }}></div>
        </button>

        <nav style={styles.nav} className={`navbar-nav ${menuOpen ? 'active-menu' : ''}`}>
          {!loading && (
            <>
              {user ? (
                <>
                  {user.role === 'CUSTOMER' && (
                    <>
                      <Link href="/customer/dashboard" style={styles.navLink} onClick={() => setMenuOpen(false)}>
                        🏠 Dashboard
                      </Link>
                      <Link href="/customer/events" style={styles.navLink} onClick={() => setMenuOpen(false)}>
                        🔍 Discover Events
                      </Link>
                      <Link href="/customer/bookings" style={styles.navLink} onClick={() => setMenuOpen(false)}>
                        🎟️ My Bookings
                      </Link>
                      <Link href="/customer/waitlist" style={styles.navLink} onClick={() => setMenuOpen(false)}>
                        ⏳ Waitlist & Offers
                      </Link>
                    </>
                  )}

                  {user.role === 'ORGANISER' && (
                    <>
                      <Link href="/organiser/dashboard" style={styles.navLink} onClick={() => setMenuOpen(false)}>
                        📊 Dashboard
                      </Link>
                      <Link href="/organiser/events/create" style={styles.navLink} onClick={() => setMenuOpen(false)}>
                        ➕ Host Event
                      </Link>
                    </>
                  )}

                  {user.role === 'ADMIN' && (
                    <>
                      <Link href="/admin/dashboard" style={styles.navLink} onClick={() => setMenuOpen(false)}>
                        ⚡ Control Center
                      </Link>
                      <Link href="/admin/venues" style={styles.navLink} onClick={() => setMenuOpen(false)}>
                        🏢 Venues
                      </Link>
                      <Link href="/admin/users" style={styles.navLink} onClick={() => setMenuOpen(false)}>
                        👥 Users
                      </Link>
                    </>
                  )}

                  <div style={styles.userSection}>
                    <span style={styles.userName}>{user.name}</span>
                    <span style={styles.userRole}>{user.role.toLowerCase()}</span>
                  </div>

                  <button onClick={() => { logout(); setMenuOpen(false); }} className="btn btn-secondary" style={styles.logoutBtn}>
                    Logout
                  </button>
                </>
              ) : (
                <div style={styles.authButtons}>
                  <Link href="/" className="btn btn-secondary" style={styles.authBtn} onClick={() => setMenuOpen(false)}>
                    Select Role
                  </Link>
                </div>
              )}
            </>
          )}
        </nav>
      </div>
      <style jsx global>{`
        @media (max-width: 768px) {
          .active-menu {
            display: flex !important;
            flex-direction: column;
            position: absolute;
            top: 70px;
            left: 0;
            right: 0;
            background-color: var(--bg-card);
            border-bottom: 1px solid var(--border-color);
            padding: 20px;
            gap: 16px;
            z-index: 1000;
          }
        }
      `}</style>
    </header>
  );
}

const styles = {
  header: {
    height: '70px',
    backgroundColor: 'rgba(18, 22, 31, 0.8)',
    borderBottom: '1px solid var(--border-color)',
    backdropFilter: 'blur(12px)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-0.03em',
  },
  logoAccent: {
    background: 'var(--accent-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  menuToggle: {
    display: 'none',
    flexDirection: 'column' as const,
    justifyContent: 'space-around',
    width: '24px',
    height: '20px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    zIndex: 1001,
  },
  bar: {
    width: '24px',
    height: '2px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    transition: 'all 0.3s linear',
    position: 'relative' as const,
    transformOrigin: '1px',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  navLink: {
    fontSize: '15px',
    fontWeight: 550,
    color: 'var(--text-muted)',
    transition: 'var(--transition)',
    cursor: 'pointer',
    ':hover': {
      color: '#fff',
    },
  } as any,
  userSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    borderLeft: '1px solid var(--border-color)',
    paddingLeft: '16px',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
  },
  userRole: {
    fontSize: '11px',
    color: 'var(--accent)',
    textTransform: 'uppercase' as const,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  logoutBtn: {
    padding: '8px 16px',
    fontSize: '14px',
  },
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  authBtn: {
    padding: '8px 16px',
    fontSize: '14px',
  },
};
