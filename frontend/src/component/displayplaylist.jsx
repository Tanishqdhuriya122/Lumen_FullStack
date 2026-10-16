import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, X, Search, Check, Trash2 } from 'lucide-react';
import { useAuth } from './authcontext';
import { useToast } from './ToastContext';

export default function ParticularPlaylist() {
  const navigate = useNavigate();
  const { playlistId } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [playlist, setPlaylist] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);

  const [showDeletePlaylistModal, setShowDeletePlaylistModal] = useState(false);
  const [deletingPlaylist, setDeletingPlaylist] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [myVideos, setMyVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPlaylist = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/playlist/${playlistId}`, { headers });
      setPlaylist(res.data.data);
    } catch (err) {
      console.error('Failed to fetch playlist:', err);
      setError('Unable to fetch playlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, [playlistId]);

  const handleDelete = async (videoId) => {
    setDeleting(videoId);
    try {
      await axios.patch(
        `${API_BASE}/api/v1/playlist/remove/${videoId}/${playlistId}`,
        {},
        { headers }
      );
      setPlaylist((prev) => ({
        ...prev,
        videos: prev.videos.filter((v) => v._id !== videoId),
      }));
      showToast('Video removed from playlist', 'success');
    } catch (err) {
      console.error('Failed to remove video:', err);
      showToast('Failed to remove video.', 'error');
    } finally {
      setDeleting(null);
      setShowModal(false);
      setVideoToDelete(null);
    }
  };

  const handleDeletePlaylist = async () => {
    setDeletingPlaylist(true);
    try {
      await axios.delete(`${API_BASE}/api/v1/playlist/${playlistId}`, { headers });
      navigate('/create-playlist');
    } catch (err) {
      console.error('Failed to delete playlist:', err);
      showToast('Failed to delete playlist.', 'error');
      setDeletingPlaylist(false);
      setShowDeletePlaylistModal(false);
    }
  };

  const fetchMyVideos = async (query = '') => {
    if (!user?._id) return;
    setLoadingVideos(true);
    try {
      const params = new URLSearchParams({ userId: user._id, limit: 30 });
      if (query.trim()) params.append('query', query.trim());

      const res = await axios.get(
        `${API_BASE}/api/v1/videos?${params.toString()}`,
        { headers }
      );
      setMyVideos(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch your videos:', err);
      setMyVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setSearchQuery('');
    fetchMyVideos();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMyVideos(searchQuery);
  };

  const handleAddVideo = async (video) => {
    setAddingId(video._id);
    try {
      await axios.patch(
        `${API_BASE}/api/v1/playlist/add/${video._id}/${playlistId}`,
        {},
        { headers }
      );
      setPlaylist((prev) => ({
        ...prev,
        videos: [...prev.videos, video],
      }));
      showToast(`Added "${video.title}" to playlist`, 'success');
    } catch (err) {
      console.error('Failed to add video:', err);
      showToast('Failed to add video.', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const isAlreadyInPlaylist = (videoId) =>
    playlist?.videos?.some((v) => v._id === videoId);

  if (loading) return <div className="text-text-primary p-10">Loading playlist...</div>;
  if (error) return <div className="text-red-500 p-10">{error}</div>;
  if (!playlist) return null;

  return (
    <div className="bg-background min-h-screen text-text-primary pb-10 relative">
      {/* Cover banner */}
      {playlist.coverImage ? (
        <div className="w-full h-48 sm:h-64 overflow-hidden relative">
          <img
            src={playlist.coverImage}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-accent/20" />
      )}

      <div className="max-w-4xl mx-auto px-6 -mt-10 relative">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-3xl font-bold">{playlist.name}</h1>
            {playlist.description && (
              <p className="text-text-secondary mt-1">{playlist.description}</p>
            )}
            <p className="text-text-muted text-sm mt-1">
              {playlist.videos.length} video{playlist.videos.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-text-primary text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Video
            </button>
            <button
              onClick={() => setShowDeletePlaylistModal(true)}
              className="flex items-center gap-2 bg-surface-light hover:bg-danger border border-border hover:border-danger text-text-secondary hover:text-text-primary text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Playlist
            </button>
          </div>
        </div>

        {playlist.videos.length === 0 ? (
          <p className="text-text-muted text-center py-12">
            No videos in this playlist yet — click "Add Video" to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {playlist.videos.map((video) => (
              <div
                key={video._id}
                className="bg-surface-light rounded-lg overflow-hidden shadow-md hover:shadow-xl transition"
              >
                <Link to={`/watch/${video._id}`}>
                  <img
                    src={video.thumbnail || 'https://via.placeholder.com/320x180'}
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                </Link>
                <div className="p-4">
                  <h3 className="text-text-primary font-semibold text-lg truncate">{video.title}</h3>
                  <p className="text-text-secondary text-sm mt-1 line-clamp-2">{video.description}</p>

                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={() => {
                        setShowModal(true);
                        setVideoToDelete(video._id);
                      }}
                      disabled={deleting === video._id}
                      className={`flex items-center gap-2 border border-red-400 text-sm px-5 py-2.5 rounded-full transition-all ${
                        deleting === video._id
                          ? 'bg-red-800 text-text-secondary cursor-not-allowed'
                          : 'bg-danger hover:bg-danger-hover text-text-primary cursor-pointer'
                      }`}
                    >
                      {deleting === video._id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remove video confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-surface-light p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
            <h2 className="text-text-primary text-xl font-semibold mb-4">Remove Video</h2>
            <p className="text-text-secondary mb-6">Are you sure you want to remove this video from the playlist?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleDelete(videoToDelete)}
                className="bg-danger hover:bg-danger-hover text-text-primary font-semibold px-4 py-2 rounded-full"
              >
                Yes, Remove
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setVideoToDelete(null);
                }}
                className="bg-gray-600 hover:bg-gray-500 text-text-primary font-semibold px-4 py-2 rounded-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete playlist confirmation modal */}
      {showDeletePlaylistModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-surface-light p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
            <h2 className="text-text-primary text-xl font-semibold mb-4">Delete Playlist</h2>
            <p className="text-text-secondary mb-6">
              This will permanently delete "{playlist.name}" and cannot be undone.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleDeletePlaylist}
                disabled={deletingPlaylist}
                className="bg-danger hover:bg-danger-hover disabled:opacity-50 text-text-primary font-semibold px-4 py-2 rounded-full"
              >
                {deletingPlaylist ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeletePlaylistModal(false)}
                disabled={deletingPlaylist}
                className="bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-text-primary font-semibold px-4 py-2 rounded-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Video modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Add a video</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-secondary hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="px-5 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your videos..."
                  className="w-full pl-9 pr-3 py-2 bg-surface-light border border-border rounded-full text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </form>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loadingVideos ? (
                <p className="text-text-muted text-sm text-center py-8">Loading your videos...</p>
              ) : myVideos.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8">
                  No videos found. Upload some first!
                </p>
              ) : (
                myVideos.map((video) => {
                  const alreadyAdded = isAlreadyInPlaylist(video._id);
                  return (
                    <div
                      key={video._id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-light transition-colors"
                    >
                      <img
                        src={video.thumbnail || 'https://via.placeholder.com/80x45'}
                        alt={video.title}
                        className="w-20 h-11 object-cover rounded shrink-0"
                      />
                      <p className="flex-1 min-w-0 text-sm text-text-primary truncate">{video.title}</p>
                      <button
                        onClick={() => !alreadyAdded && handleAddVideo(video)}
                        disabled={alreadyAdded || addingId === video._id}
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          alreadyAdded
                            ? 'bg-green-500/20 text-green-500 cursor-default'
                            : 'bg-primary hover:bg-primary-hover text-text-primary'
                        }`}
                      >
                        {alreadyAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}