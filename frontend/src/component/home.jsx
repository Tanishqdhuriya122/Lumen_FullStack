import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SplashScreen from './SplashScreen';

export default function HomePage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenuId, setShowMenuId] = useState(null);
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('hasSeenSplash');
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  useEffect(() => {
    const fetchAllVideos = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/videos/public`);
        const fetchedVideos = res.data.data?.videos;
        setVideos(Array.isArray(fetchedVideos) ? fetchedVideos : []);
      } catch (err) {
        console.error('Error fetching videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllVideos();
  }, []);

  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => {
          sessionStorage.setItem('hasSeenSplash', 'true');
          setShowSplash(false);
        }}
      />
    );
  }

  return (
    <div className="bg-background min-h-screen text-text-primary px-4 sm:px-6 py-6">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full aspect-video rounded-xl bg-surface" />
              <div className="flex gap-3 mt-3">
                <div className="w-9 h-9 rounded-full bg-surface shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface rounded w-full" />
                  <div className="h-3 bg-surface rounded w-2/3" />
                  <div className="h-3 bg-surface rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium">No videos yet</p>
          <p className="text-text-muted text-sm max-w-xs">Videos uploaded by the community will show up here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
          {videos.map((video) => (
            <div key={video._id} className="group cursor-pointer relative">
              {/* Thumbnail */}
              <Link to={`/watch/${video._id}`}>
                <div className="w-full aspect-video bg-surface-light rounded-xl overflow-hidden">
                  <img
                    src={video.thumbnail || 'https://via.placeholder.com/320x180'}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
              </Link>

              {/* Info row: avatar + title/channel/meta */}
              <div className="flex gap-3 mt-3">
                <Link to={`/channel/${video.owner?.userName}`} className="shrink-0">
                  <img
                    src={video.owner?.avatar || 'https://via.placeholder.com/36'}
                    alt={video.owner?.fullName}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0 relative">
                  <Link to={`/watch/${video._id}`}>
                    <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 pr-6">
                      {video.title}
                    </h3>
                  </Link>
                  <Link to={`/channel/${video.owner?.userName}`}>
                    <p className="text-xs text-text-secondary mt-1 hover:text-text-primary transition-colors truncate">
                      {video.owner?.fullName || 'Unknown Creator'}
                    </p>
                  </Link>
                  <p className="text-xs text-text-muted mt-0.5">
                    {video.view || 0} views • {formatDate(video.createdAt)}
                  </p>

                  {/* 3-dot menu */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowMenuId((prev) => (prev === video._id ? null : video._id));
                    }}
                    className="absolute top-0 right-0 w-6 h-6 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors opacity-0 group-hover:opacity-100"
                  >
                    ⋯
                  </button>
                  {showMenuId === video._id && (
                    <div className="absolute right-0 top-6 bg-surface-light text-text-primary rounded-lg shadow-xl border border-border overflow-hidden z-20">
                      <Link
                        to={`/add-to-playlist/${video._id}`}
                        className="whitespace-nowrap px-4 py-2.5 text-sm hover:bg-primary/10 block transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenuId(null);
                        }}
                      >
                        ➕ Add to Playlist
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}