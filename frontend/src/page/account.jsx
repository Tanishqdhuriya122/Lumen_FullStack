import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../component/authcontext';
import { API_BASE } from '../config';

export default function PersonalInfo() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get(`${API_BASE}/api/v1/users/current-user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFullName(res.data.data.fullName);
        setEmail(res.data.data.email);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetch();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE}/api/v1/users/update-account`,
        { fullName, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Profile updated!');
    } catch (err) {
      alert('Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-surface p-6 rounded-lg shadow-lg space-y-6 border border-border"
    >
      <h2 className="text-xl font-semibold text-text-primary">Update Account Information</h2>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-2 rounded bg-surface-light text-text-primary border border-border focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded bg-surface-light text-text-primary border border-border focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className={`w-full px-4 py-2 rounded font-semibold transition ${
          saving ? 'bg-surface-light cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500'
        } text-text-primary`}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}