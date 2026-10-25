import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config';

export default function WatchLater() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const fetchWatchLater = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/v1/users/watch-later`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVideos(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch Watch Later:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchLater();
  }, []);

  // Reuses the same toggle endpoint the player's gear menu calls — since the
  // video is already in the list, calling it again removes it (that's the
  // "toggle" behavior), so no separate "remove" endpoint is needed.
  const handleRemove = async (videoId) => {
    setRemovingId(videoId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/api/v1/users/watch-later/${videoId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVideos((prev) => prev.filter((v) => v._id !== videoId));
    } catch (err) {
      console.error('Failed to remove from Watch Later:', err);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-video bg-surface rounded-lg" />
              <div className="h-4 bg-surface rounded w-3/4" />
              <div className="h-3 bg-surface rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-text-primary min-h-screen p-4 md:p-6">
      <h1 className="text-xl font-bold mb-5">Watch Later</h1>

      {videos.length === 0 ? (
        <p className="text-text-secondary">
          Nothing saved yet — use the gear menu on any video to add it here.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {videos.map((video) => (
            <div key={video._id} className="group">
              <Link to={`/watch/${video._id}`}>
                <div className="aspect-video bg-surface-light rounded-lg overflow-hidden">
                  <img
                    src={video.thumbnail || 'https://via.placeholder.com/320x180'}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/watch/${video._id}`}>
                    <p className="font-medium text-sm text-text-primary line-clamp-2 group-hover:text-primary transition-colors">
                      {video.title}
                    </p>
                  </Link>
                  <p className="text-xs text-text-secondary mt-1">
                    {video.owner?.fullName || 'Unknown'}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(video._id)}
                  disabled={removingId === video._id}
                  className="text-xs text-text-muted hover:text-danger transition-colors shrink-0 disabled:opacity-50"
                  title="Remove from Watch Later"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
