import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from './authcontext';
import axios from 'axios';
import { Pencil, Video, Users, UserCheck, ListVideo, Plus, Trash2, Play } from 'lucide-react';
import PulseLoader from './PulseLoader';

const panel = 'rounded-2xl border border-border bg-surface/80 backdrop-blur-md shadow-xl shadow-black/20';

export default function ProfilePage() {
  const { user } = useAuth();
  const { userName } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Videos');
  const [videos, setVideos] = useState([]);
  const [subscribedTo, setSubscribedTo] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    if (!user || !user._id) {
      setError('No user data available. Please log in.');
      setLoading(false);
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    const profileToFetch = userName || user?.userName;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/users/channel/${user.userName}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const text = await res.text();
          let errorMessage = `HTTP ${res.status}: Failed to fetch profile`;
          try {
            const result = JSON.parse(text);
            errorMessage = result.message || errorMessage;
          } catch {
            errorMessage = res.status === 404 ? 'Channel does not exist' : 'Server returned non-JSON response';
          }
          throw new Error(errorMessage);
        }

        const result = await res.json();
        setProfile(result.data);
        setIsOwnProfile(result.data._id === user._id);
      } catch (err) {
        console.error('❌ Profile fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchVideos = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/videos/`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { userId: user._id, sortBy: 'createdAt', sortType: 'desc' },
        });
        setVideos(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch videos', err);
      }
    };

    const fetchSubscribedChannels = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/subscriptions/c/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubscribedTo(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch subscribed channels', err);
      }
    };

    // NEW: who is subscribed to me (same endpoint pattern as above,
    // just hitting the /u/:channelId route instead of /c/:channelId).
    const fetchSubscribers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/subscriptions/u/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubscribers(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch subscribers', err);
      }
    };

    const fetchPlaylists = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/playlist/user/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            userId: userName ? profile?._id : user._id,
          },
        });
        setPlaylists(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch playlists', err);
      }
    };

    fetchProfile();
    fetchSubscribedChannels();
    fetchSubscribers();
    fetchVideos();
    fetchPlaylists();
  }, [user, navigate, userName]);

  const handleDeletePlaylist = async (playlistId) => {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/api/v1/playlist/${playlistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlaylists((prev) => prev.filter((pl) => pl._id !== playlistId));
      alert("✅ Playlist deleted.");
    } catch (err) {
      console.error("❌ Failed to delete playlist:", err);
      alert("❌ Could not delete playlist.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <p className="text-text-secondary">Please log in to view your profile.</p>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <PulseLoader size={64} />
      </div>
    );
  }

  const tabs = [
    { key: 'Videos', icon: Video },
    { key: 'Subscribers', icon: UserCheck },
    { key: 'Following', icon: Users },
    { key: 'Playlist', icon: ListVideo },
  ];

  return (
    <div className="min-h-screen pb-16">
      {/* Cover */}
      <div className="relative">
        {profile.coverImage ? (
          <div
            className="h-40 sm:h-56 md:h-64 bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.coverImage})` }}
          />
        ) : (
          <div className="h-40 sm:h-56 md:h-64 bg-gradient-to-br from-primary/30 via-surface-light to-surface" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="px-4 sm:px-6 lg:px-10 -mt-14 sm:-mt-16">
        {/* Identity card */}
        <div className={`p-5 sm:p-6 ${panel}`}>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <img
              src={profile.avatar || 'https://via.placeholder.com/128'}
              alt="Avatar"
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-surface object-cover shadow-lg shrink-0 -mt-10 sm:mt-0"
            />

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary truncate">{profile.fullName}</h1>
              <p className="text-sm text-text-muted truncate">{profile.email}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setActiveTab('Subscribers')}
                  className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-light border border-border px-3 py-1 rounded-full transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {profile.subscribersCount} Subscribers
                </button>
                <button
                  onClick={() => setActiveTab('Following')}
                  className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-light border border-border px-3 py-1 rounded-full transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  {profile.channelsSubscribedToCount} Subscribed
                </button>
              </div>
            </div>

            {isOwnProfile ? (
              <Link
                to="/edit"
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm px-5 py-2.5 rounded-full transition-colors shrink-0"
              >
                <Pencil className="w-4 h-4" />
                Edit profile
              </Link>
            ) : (
              <button
                disabled
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-border bg-surface-light text-text-muted cursor-not-allowed shrink-0"
              >
                Subscribe
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center sm:justify-start mt-5">
          <div className="inline-flex gap-1 bg-surface-light/80 border border-border p-1 rounded-full overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                    active ? 'bg-primary text-on-primary' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.key}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'Videos' && (
            <div>
              {isOwnProfile && (
                <div className="flex justify-end mb-5">
                  <Link
                    to="/upload"
                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm py-2 px-4 rounded-full transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Upload video
                  </Link>
                </div>
              )}

              {videos.length === 0 ? (
                <div className={`flex flex-col items-center text-center py-16 px-4 ${panel}`}>
                  <div className="w-14 h-14 rounded-full bg-surface-light flex items-center justify-center mb-3">
                    <Video className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="text-text-secondary font-medium">No videos uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {videos.map((video) => (
                    <div
                      key={video._id}
                      className={`group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${panel}`}
                    >
                      <Link to={`/watch/${video._id}`} className="block relative">
                        <div className="aspect-video bg-background overflow-hidden">
                          <img
                            src={video.thumbnail || 'https://via.placeholder.com/320x180'}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="white" />
                        </div>
                      </Link>
                      <div className="p-3.5">
                        <h3 className="text-text-primary font-semibold text-sm truncate">{video.title}</h3>
                        <p className="text-text-muted text-xs mt-1 line-clamp-2">{video.description}</p>
                        {isOwnProfile && (
                          <div className="mt-3 flex justify-between gap-2">
                            <Link to={`/edit-video/${video._id}`} className="flex-1">
                              <button className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold px-3 py-2 rounded-full transition-colors">
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                            </Link>
                            <Link to={`/delete-video/${video._id}`} className="flex-1">
                              <button className="w-full flex items-center justify-center gap-1.5 bg-danger hover:bg-danger-hover text-on-primary text-xs font-semibold px-3 py-2 rounded-full transition-colors">
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Subscribers' && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                People subscribed to you
              </h2>
              {subscribers.length === 0 ? (
                <div className={`flex flex-col items-center text-center py-16 px-4 ${panel}`}>
                  <div className="w-14 h-14 rounded-full bg-surface-light flex items-center justify-center mb-3">
                    <UserCheck className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="text-text-secondary font-medium">No subscribers yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {subscribers.map((s) => (
                    <Link
                      to={`/channel/${s.subscriber.userName}`}
                      key={s.subscriber._id}
                      className={`flex items-center gap-3 p-4 transition-colors hover:border-primary/40 ${panel}`}
                    >
                      <img
                        src={s.subscriber.avatar || 'https://via.placeholder.com/64'}
                        alt="Avatar"
                        className="h-12 w-12 rounded-full object-cover shrink-0 ring-1 ring-border"
                      />
                      <div className="min-w-0">
                        <p className="text-text-primary font-semibold text-sm truncate">{s.subscriber.fullName}</p>
                        <p className="text-xs text-text-muted truncate">@{s.subscriber.userName}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Following' && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Channels you follow</h2>
              {subscribedTo.length === 0 ? (
                <div className={`flex flex-col items-center text-center py-16 px-4 ${panel}`}>
                  <div className="w-14 h-14 rounded-full bg-surface-light flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="text-text-secondary font-medium">You haven't followed any channels yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {subscribedTo.map((s) => (
                    <Link
                      to={`/channel/${s.channel.userName}`}
                      key={s.channel._id}
                      className={`flex items-center gap-3 p-4 transition-colors hover:border-primary/40 ${panel}`}
                    >
                      <img
                        src={s.channel.avatar || 'https://via.placeholder.com/64'}
                        alt="Avatar"
                        className="h-12 w-12 rounded-full object-cover shrink-0 ring-1 ring-border"
                      />
                      <div className="min-w-0">
                        <p className="text-text-primary font-semibold text-sm truncate">{s.channel.fullName}</p>
                        <p className="text-xs text-text-muted truncate">{s.channel.email}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Playlist' && (
            <div>
              {playlists.length === 0 ? (
                <div className={`flex flex-col items-center text-center py-16 px-4 ${panel}`}>
                  <div className="w-14 h-14 rounded-full bg-surface-light flex items-center justify-center mb-3">
                    <ListVideo className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="text-text-secondary font-medium mb-4">No playlists created yet</p>
                  {isOwnProfile && (
                    <Link
                      to="/create-playlist"
                      className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm py-2 px-4 rounded-full transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create playlist
                    </Link>
                  )}
                </div>
              ) : (
                <div>
                  {isOwnProfile && (
                    <div className="flex justify-end mb-5">
                      <Link
                        to="/create-playlist"
                        className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm py-2 px-4 rounded-full transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create playlist
                      </Link>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {playlists.map((playlist) => (
                      <div key={playlist._id} className={`p-4 transition-all hover:-translate-y-1 hover:shadow-2xl ${panel}`}>
                        <Link to={`/playlist/${playlist._id}`}>
                          <h3 className="text-text-primary font-semibold text-sm truncate hover:text-primary transition-colors">
                            {playlist.name}
                          </h3>
                        </Link>
                        <p className="text-text-muted text-xs mt-1 line-clamp-2 mb-3">{playlist.description}</p>

                        {playlist.videos && playlist.videos.length > 0 ? (
                          <div className="space-y-2.5 mb-3">
                            {playlist.videos.slice(0, 3).map((video) => (
                              <Link to={`/watch/${video._id}`} key={video._id} className="flex items-center gap-2.5 group">
                                <img
                                  src={video.thumbnail || 'https://via.placeholder.com/120x80'}
                                  alt={video.title}
                                  className="h-12 w-20 object-cover rounded-md border border-border shrink-0"
                                />
                                <span className="text-text-secondary text-xs font-medium group-hover:text-text-primary transition-colors truncate">
                                  {video.title}
                                </span>
                              </Link>
                            ))}
                            {playlist.videos.length > 3 && (
                              <p className="text-xs text-text-muted pl-[86px]">+{playlist.videos.length - 3} more</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-text-muted text-xs italic mb-3">No videos in this playlist</p>
                        )}

                        {isOwnProfile && (
                          <div className="flex justify-between gap-2 pt-1">
                            <Link to={`/edit-playlist/${playlist._id}`} className="flex-1">
                              <button className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold px-3 py-2 rounded-full transition-colors">
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                            </Link>
                            <button
                              onClick={() => handleDeletePlaylist(playlist._id)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-danger hover:bg-danger-hover text-on-primary text-xs font-semibold px-3 py-2 rounded-full transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}