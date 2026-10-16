import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function EditPlaylist() {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch existing playlist data
  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/api/v1/playlist/${playlistId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setName(res.data.data.name);
        setDescription(res.data.data.description);
      } catch (err) {
        console.error('❌ Failed to fetch playlist:', err);
        setError('Failed to load playlist');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      alert('Both name and description are required.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE}/api/v1/playlist/${playlistId}`,
        { name, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('✅ Playlist updated successfully!');
      navigate('/profile');
    } catch (err) {
      console.error('❌ Update failed:', err);
      alert('❌ Failed to update playlist.');
    }
  };

  if (loading) return <div className="text-text-primary p-10">Loading...</div>;
  if (error) return <div className="text-red-400 p-10">{error}</div>;

  return (
    <div className="	bg-background min-h-screen flex items-center justify-center text-text-primary px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-surface p-8 rounded-lg shadow-lg w-full max-w-xl"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Edit Playlist</h2>

        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium">Playlist Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-light border border-border p-2 rounded text-text-primary focus:outline-none focus:ring focus:ring-purple-500"
            placeholder="Enter playlist name"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1 text-sm font-medium">Description</label>
          <textarea
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surface-light border border-border p-2 rounded text-text-primary focus:outline-none focus:ring focus:ring-purple-500"
            placeholder="Enter description"
          />
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="cursor-pointer bg-surface-light hover:bg-gray-600 text-text-primary px-4 py-2 rounded-full"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cursor-pointer bg-purple-600 hover:bg-purple-500 text-text-primary px-6 py-2 rounded-full font-semibold"
          >
            Update Playlist
          </button>
        </div>
      </form>
    </div>
  );
}