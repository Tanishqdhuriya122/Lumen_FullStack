import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Check, Send } from 'lucide-react';
import { useSocket } from './socketcontext';

const API = `${API_BASE}/api/v1`;

export default function ShareVideoModal({ video, onClose }) {
  const { socket } = useSocket();
  const [friends, setFriends] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState(new Set());

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await axios.get(`${API}/friends`, { headers });
        setFriends(res.data.data || []);
      } catch (err) {
        console.error('Failed to load friends:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, []);

  const toggleSelect = (friendId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(friendId) ? next.delete(friendId) : next.add(friendId);
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);

    try {
      // Send to each selected friend — one message per recipient
      await Promise.all(
        Array.from(selectedIds).map(async (friendId) => {
          const res = await axios.post(
            `${API}/messages/${friendId}`,
            {
              content: `Shared a video: ${video.title}`,
              type: 'video_share',
              sharedVideo: video._id,
            },
            { headers }
          );
          // Push it in real-time if the friend is online
          socket?.emit('send_message', { receiverId: friendId, message: res.data.data });
        })
      );
      setSentTo(selectedIds);
      setTimeout(onClose, 900); // brief confirmation pause, then close
    } catch (err) {
      console.error('Failed to share video:', err);
      alert('Failed to share video. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">Share video</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video preview */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <img src={video.thumbnail} alt={video.title} className="w-16 h-10 object-cover rounded" />
          <p className="text-sm text-text-secondary line-clamp-2">{video.title}</p>
        </div>

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="text-text-muted text-sm text-center py-8">Loading friends...</p>
          ) : friends.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">
              You don't have any friends yet to share with.
            </p>
          ) : (
            friends.map((friend) => {
              const isSelected = selectedIds.has(friend._id);
              const wasSent = sentTo.has(friend._id);
              return (
                <button
                  key={friend._id}
                  onClick={() => !wasSent && toggleSelect(friend._id)}
                  disabled={wasSent}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-light transition-colors text-left disabled:opacity-60"
                >
                  <img
                    src={friend.avatar || 'https://via.placeholder.com/40'}
                    alt={friend.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{friend.fullName}</p>
                    <p className="text-xs text-text-muted truncate">@{friend.userName}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      wasSent
                        ? 'bg-green-500 border-green-500'
                        : isSelected
                        ? 'bg-primary border-primary'
                        : 'border-border'
                    }`}
                  >
                    {(isSelected || wasSent) && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Send button */}
        {friends.length > 0 && (
          <div className="px-5 py-4 border-t border-border">
            <button
              onClick={handleSend}
              disabled={selectedIds.size === 0 || sending}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-text-primary font-semibold py-2.5 rounded-full transition-colors"
            >
              <Send className="w-4 h-4" />
              {sending
                ? 'Sending...'
                : selectedIds.size > 0
                ? `Send to ${selectedIds.size} friend${selectedIds.size > 1 ? 's' : ''}`
                : 'Select friends to send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}