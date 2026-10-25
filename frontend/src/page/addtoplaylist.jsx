import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config';

export default function AddToPlaylist() {
  const { videoId } = useParams();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlaylists = async () => {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));

      try {
        const res = await axios.get(`${API_BASE}/api/v1/playlist/user/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPlaylists(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch playlists:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  const handleAddToPlaylist = async (playlistId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(
        `${API_BASE}/api/v1/playlist/add/${videoId}/${playlistId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('✅ Video added to playlist!');
      navigate(-1); // Go back
    } catch (err) {
      console.error('Failed to add video:', err);
      alert('❌ Failed to add video to playlist.');
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newName || !newDesc) return alert('Please fill in both name and description.');

    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        `${API_BASE}/api/v1/playlist/`,
        { name: newName, description: newDesc },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newPlaylist = res.data.data;
      setPlaylists((prev) => [...prev, newPlaylist]);
      setNewName('');
      setNewDesc('');
      alert('✅ Playlist created!');
    } catch (err) {
      console.error('Playlist creation failed:', err);
      alert('❌ Failed to create playlist.');
    }
  };

  if (loading) return <div className="text-text-primary p-6">Loading playlists...</div>;

  return (
    <div className="	bg-background min-h-screen text-text-primary px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add to Playlist</h1>

      <div className="space-y-4 mb-8">
        {playlists.length === 0 ? (
          <p className="text-text-secondary">No playlists found.</p>
        ) : (
          playlists.map((pl) => {
            const alreadyAdded = pl.videos?.includes(videoId); // Check if video is in playlist
            return (
              <div
                key={pl._id}
                className="bg-surface-light px-4 py-3 rounded-lg flex justify-between items-center hover:bg-surface-light transition"
              >
                <div>
                  <h2 className="font-semibold">{pl.name}</h2>
                  <p className="text-sm text-text-secondary">{pl.description}</p>
                </div>
                {alreadyAdded ? (
                  <span className="text-green-400 font-semibold text-sm">✅ Already added</span>
                ) : (
                  <button
                    onClick={() => handleAddToPlaylist(pl._id)}
                    className="bg-blue-600 hover:bg-blue-500 text-sm px-4 py-2 rounded-full font-semibold cursor-pointer"
                  >
                    ➕ Add
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xl font-semibold mb-2">Create New Playlist</h2>
        <input
          type="text"
          placeholder="Playlist Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full mb-2 px-4 py-2 rounded bg-surface text-text-primary border border-border"
        />
        <textarea
          placeholder="Playlist Description"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="w-full mb-2 px-4 py-2 rounded bg-surface text-text-primary border border-border"
        />
        <button
          onClick={handleCreatePlaylist}
          className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-full font-semibold cursor-pointer"
        >
          ➕ Create Playlist
        </button>
      </div>
    </div>
  );
}