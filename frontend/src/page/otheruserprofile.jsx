import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../component/authcontext';
import axios from 'axios';
import { API_BASE } from '../config';

export default function OtherProfile() {
  const { user } = useAuth();
  const { userName } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [activeTab, setActiveTab] = useState('Videos');
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/users/channel/${userName}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data.data);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userName]);

  useEffect(() => {
    if (!profile?._id) return;
    const token = localStorage.getItem('token');

    const checkIfSubscribed = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/subscriptions/c/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const alreadySubscribed = res.data.data.some((s) => s.channel._id === profile._id);
        setIsSubscribed(alreadySubscribed);
      } catch (err) {
        console.error('Subscription check failed:', err);
      }
    };

    checkIfSubscribed();
  }, [profile, user]);

  useEffect(() => {
    if (profile?._id) {
      fetchVideos();
    }

    async function fetchVideos() {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get(`${API_BASE}/api/v1/videos/`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { userId: profile._id, sortBy: 'createdAt', sortType: 'desc' },
        });
        setVideos(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch videos', err);
      }
    }
  }, [profile]);

  const handleSubscribeToggle = async () => {
    const token = localStorage.getItem('token');
    setSubscribing(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/v1/subscriptions/c/${profile._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const msg = res.data.message.toLowerCase();
      if (msg.includes("unsubscribed")) {
        setIsSubscribed(false);
        alert("Unsubscribed successfully");
      } else if (msg.includes("subscribed")) {
        setIsSubscribed(true);
        alert("Subscribed successfully");
      }
    } catch (err) {
      console.error('Subscribe toggle failed:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading || !profile) return <div className="text-text-primary p-10">Loading profile...</div>;
  if (error) return <div className="text-red-500 p-10">{error}</div>;

  return (
    <div className="	bg-background min-h-screen text-text-primary">
      {/* Cover */}
      <div
        className="h-48 sm:h-60 md:h-72 bg-cover bg-center"
        style={{ backgroundImage: `url(${profile.coverImage || 'https://via.placeholder.com/1280x300'})` }}
      />

      {/* Profile Info */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 w-full px-6 sm:px-12">
        <div className="flex items-center space-x-4">
          <img
            src={profile.avatar || 'https://via.placeholder.com/128'}
            alt="Avatar"
            className="h-32 w-32 rounded-full border-4 border-white object-cover"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{profile.fullName}</h1>
            <p className="text-text-secondary text-sm">{profile.email}</p>
            <p className="text-sm text-text-secondary mt-1">
              {profile.subscribersCount} Subscribers • {profile.channelsSubscribedToCount} Subscribed
            </p>
          </div>
        </div>

        {user?._id !== profile._id && (
         <button
         onClick={handleSubscribeToggle}
         disabled={subscribing}
         className={`mt-4 sm:mt-0 px-4 py-2 rounded-full text-sm sm:text-base font-semibold border transition-all
           ${isSubscribed
             ? 'bg-surface-light text-text-primary border-gray-400 hover:bg-danger'
             : 'bg-purple-600 text-text-primary border-white hover:bg-purple-500'}
           ${subscribing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
       >
         {subscribing ? 'Processing...' : isSubscribed ? 'Unsubscribe' : 'Subscribe'}
       </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-border px-6 sm:px-12">
        <div className="flex space-x-6 text-text-secondary text-sm font-medium overflow-x-auto">
          {['Videos'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${activeTab === tab ? 'border-b-2 border-purple-500 text-text-primary' : 'hover:text-text-primary'} pb-2`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 sm:px-12 py-12 text-text-secondary">
        {activeTab === 'Videos' && (
          videos.length === 0 ? (
            <p className="text-center text-lg">No videos uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {videos.map((video) => (
                <div key={video._id} className="bg-surface-light rounded-lg overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition duration-300">
                  <Link to={`/watch/${video._id}`}>
                    <div className="w-full h-48 	bg-background">
                      <img
                        src={video.thumbnail || 'https://via.placeholder.com/320x180'}
                        alt={video.title}
                        className="w-full h-full object-contain rounded-t-lg"
                      />
                    </div>
                  </Link>
                  <div className="p-4">
                    <h3 className="text-text-primary font-semibold text-lg truncate">{video.title}</h3>
                    <p className="text-text-secondary text-sm mt-1 line-clamp-2">{video.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'Tweets' && (
          <p className="text-center text-lg">No tweets yet.</p>
        )}
      </div>
    </div>
  );
}
