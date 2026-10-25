import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config';

export default function LikedVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);

    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${formattedDate} at ${formattedTime}`;
  };

  useEffect(() => {
    const fetchLikedVideos = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view liked videos.');
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/api/v1/likes/videos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVideos(res.data.data || []);
      } catch (err) {
        console.error('Error fetching liked videos:', err);
        setError('Failed to load liked videos.');
      } finally {
        setLoading(false);
      }
    };

    fetchLikedVideos();
  }, []);

  if (loading) return <div className="text-text-primary p-10">Loading liked videos...</div>;
  if (error) return <div className="text-red-500 p-10">{error}</div>;

  return (
    <div className="	bg-background min-h-screen text-text-primary px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6"> Liked Videos</h1>

      {videos.length === 0 ? (
        <p className="text-text-secondary">You haven’t liked any videos yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <Link
              key={video._id}
              to={`/watch/${video._id}`}
              className="bg-surface rounded-lg overflow-hidden shadow-md hover:shadow-xl transition transform hover:-translate-y-1 duration-300 group cursor-pointer"
            >
              <div className="w-full h-48 bg-surface-light">
                <img
                  src={video.thumbnail || 'https://via.placeholder.com/320x180'}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold truncate">{video.title}</h3>

                {/* Avatar + Creator Name */}
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={video.owner?.avatar || 'https://via.placeholder.com/32'}
                    alt="avatar"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <p className="text-sm text-text-secondary truncate">
                    {video.owner?.fullName || 'Unknown Creator'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-text-muted mt-2">
                  <span> {video.view || 0} views</span>
                  <span>{formatDate(video.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}