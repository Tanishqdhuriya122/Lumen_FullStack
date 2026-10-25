import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, X, Image as ImageIcon } from 'lucide-react';
import CircularCarousel from './CircularCarousel';
import { useAuth } from './authcontext';
import { useToast } from './ToastContext';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/v1/playlist`;

export default function Playlist() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPlaylists = async () => {
    if (!user?._id) return;
    try {
      const res = await axios.get(`${API}/user/${user._id}`, { headers });
      setPlaylists(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [user?._id]);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCoverImage(null);
    setCoverPreview(null);
    setError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Playlist name is required.');
      return;
    }

    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      if (coverImage) formData.append('coverImage', coverImage);

      await axios.post(API + '/', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });

      resetForm();
      setShowCreateModal(false);
      await fetchPlaylists();
      resetForm();
      setShowCreateModal(false);
      await fetchPlaylists();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create playlist.');
    } finally {
      setCreating(false);
    }
  };

  // Priority: custom cover image > first video's thumbnail > placeholder
  const carouselItems = playlists.map((p) => ({
    src:
      p.coverImage ||
      p.videos?.[0]?.thumbnail ||
      'https://via.placeholder.com/400x400?text=No+Videos',
    alt: p.name,
    title: p.name,
    subtitle: `${p.videos?.length || 0} video${p.videos?.length === 1 ? '' : 's'}`,
    _id: p._id,
  }));

  const handleItemClick = (item) => {
    navigate(`/playlist/${item._id}`);
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <p className="text-text-muted">Loading playlists...</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-text-primary px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold">Your Playlists</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold px-4 py-2 rounded-full transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
          <p className="text-text-secondary font-medium">No playlists yet</p>
          <p className="text-text-muted text-sm max-w-xs">
            Create your first playlist to start organizing videos you love.
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', height: '480px', position: 'relative' }} className="max-w-5xl mx-auto">
          <CircularCarousel
            items={carouselItems}
            preset="cylinder"
            intro="rise"
            cardWidth={200}
            aspectRatio={1}
            speed={10}
            captions
            onItemClick={handleItemClick}
          />
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={() => { setShowCreateModal(false); resetForm(); }}
        >
          <div
            className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-xl shadow-black/40 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-lg">Create Playlist</h3>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && <p className="text-danger text-sm">{error}</p>}

              {/* Cover image picker */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Cover Image <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <label
                  htmlFor="coverImage"
                  className="flex items-center justify-center gap-2 w-full aspect-video bg-surface-light border border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors overflow-hidden"
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-text-muted text-sm">
                      <ImageIcon className="w-6 h-6" />
                      Click to upload a cover
                    </span>
                  )}
                </label>
                <input
                  id="coverImage"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Playlist Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-light text-text-primary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="e.g. My Chill Vibes"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-surface-light text-text-primary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                  placeholder="What is this playlist about?"
                
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary font-semibold py-2.5 rounded-full transition-colors"
              >
                {creating ? 'Creating...' : 'Create Playlist'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}