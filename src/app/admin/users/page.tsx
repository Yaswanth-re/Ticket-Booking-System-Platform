'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user: currentAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && (!currentAdmin || currentAdmin.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    if (currentAdmin) {
      loadUsers();
    }
  }, [currentAdmin, authLoading, router]);

  const handleRoleChange = async (userId: string, newRole: string, userName: string) => {
    setError('');
    setMessage('');
    setUpdatingUserId(userId);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`Role for user "${userName}" updated to ${newRole} successfully.`);
        await loadUsers();
      } else {
        setError(data.error || 'Failed to update role.');
      }
    } catch (err) {
      setError('Connection error, please try again.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmed = confirm(`Are you sure you want to delete user "${userName}"? This will delete all their bookings and holds.`);
    if (!confirmed) return;

    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`User "${userName}" deleted successfully.`);
        await loadUsers();
      } else {
        setError(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      setError('Connection error, please try again.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading users register...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1 style={{ marginBottom: '10px' }}>User Management</h1>
      <p style={{ marginBottom: '30px' }}>Audit system users, promote accounts to event organisers, and configure access permissions.</p>

      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={messageStyle}>{message}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined Date</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = currentAdmin?.id === u.id;
              
              return (
                <tr key={u.id}>
                  <td>
                    <strong style={{ color: '#fff' }}>{u.name}</strong>
                    {isSelf && <span style={{ marginLeft: '6px', fontSize: '10px', verticalAlign: 'middle' }} className="badge badge-available">You</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <select
                      className="form-select"
                      style={{ width: '140px', padding: '6px 10px', fontSize: '13px' }}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value, u.name)}
                      disabled={isSelf || updatingUserId === u.id}
                    >
                      <option value="CUSTOMER">Customer</option>
                      <option value="ORGANISER">Organiser</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      disabled={isSelf}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

const messageStyle = {
  backgroundColor: 'rgba(16, 185, 129, 0.15)',
  color: 'var(--success)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  marginBottom: '20px',
  textAlign: 'center' as const,
};
