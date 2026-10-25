import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../component/authcontext';
import { API_BASE } from '../config';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirm) {
      alert("Passwords don't match");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${API_BASE}/api/v1/users/change-password`,
        {
          oldPassword, // match backend's expected field
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert('Password changed!');
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      console.error(err);
      alert('Password change failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-surface p-6 rounded-lg shadow-md border border-border">
      <h2 className="text-xl font-semibold text-text-primary mb-4">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Current Password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full px-4 py-2 bg-surface-light border border-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 bg-surface-light border border-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-2 bg-surface-light border border-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
            submitting
              ? 'bg-surface-light text-text-secondary cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 text-text-primary'
          }`}
        >
          {submitting ? 'Updating...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}