import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import {
  Smile, Image as ImageIcon, Send, ArrowLeft, Film, Search,
  UserPlus, UserMinus, Check, X, MessageCircle,
} from 'lucide-react';
import { useSocket } from './socketcontext';
import { useAuth } from './authcontext';
import { useTheme } from './themecontext';
import { useToast } from './ToastContext';
import PulseLoader from './PulseLoader';

const API = `${API_BASE}/api/v1`;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const TABS = ['chats', 'requests', 'find'];

export default function ChatWindow() {
  const { friendId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { theme } = useTheme();
  const { showToast } = useToast();

  // Sidebar
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.includes(tabParam) ? tabParam : 'chats');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [unread, setUnread] = useState({});
  const [filter, setFilter] = useState('');
  const [findQuery, setFindQuery] = useState('');
  const [findResults, setFindResults] = useState([]);
  const [finding, setFinding] = useState(false);

  // Conversation
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifResults, setGifResults] = useState([]);
  const [gifQuery, setGifQuery] = useState('');
  const [friendTyping, setFriendTyping] = useState(false);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [showRemove, setShowRemove] = useState(false);

  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const friend = friends.find((f) => f._id === friendId);

  // ---------- data loaders ----------
  const loadFriends = async () => {
    try {
      const res = await axios.get(`${API}/friends`, { headers: authHeaders() });
      setFriends(res.data.data || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await axios.get(`${API}/friends/requests/pending`, { headers: authHeaders() });
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  };

  const loadUnread = async () => {
    try {
      const res = await axios.get(`${API}/messages/unread`, { headers: authHeaders() });
      const map = {};
      (res.data.data || []).forEach((u) => {
        map[u._id] = u.count;
      });
      setUnread(map);
    } catch (err) {
      console.error('Failed to load unread counts:', err);
    }
  };

  useEffect(() => {
    loadFriends();
    loadRequests();
    loadUnread();
  }, []);

  // A notification link like /chat?tab=requests should switch the tab
  useEffect(() => {
    if (TABS.includes(tabParam)) setTab(tabParam);
  }, [tabParam]);

  // Load the conversation whenever the selected friend changes
  useEffect(() => {
    setMessages([]);
    setInput('');
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setFriendTyping(false);
    if (!friendId) return;

    const loadConversation = async () => {
      setLoadingConvo(true);
      try {
        const res = await axios.get(`${API}/messages/${friendId}`, { headers: authHeaders() });
        setMessages(res.data.data || []);
        setUnread((prev) => ({ ...prev, [friendId]: 0 })); // backend marks them read on fetch
      } catch (err) {
        console.error('Failed to load conversation:', err);
      } finally {
        setLoadingConvo(false);
      }
    };
    loadConversation();
  }, [friendId]);

  // Live search in the Find tab
  useEffect(() => {
    if (tab !== 'find') return;
    const q = findQuery.trim();
    if (!q) {
      setFindResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setFinding(true);
        const res = await axios.get(`${API}/friends/search`, { params: { q }, headers: authHeaders() });
        setFindResults(res.data.data || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setFinding(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [findQuery, tab]);

  // ---------- real-time ----------
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (message) => {
      const senderId = message.sender?._id || message.sender;
      if (senderId === friendId) {
        setMessages((prev) => [...prev, message]);
      } else {
        setUnread((prev) => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
      }
    };
    const handleTyping = ({ senderId }) => senderId === friendId && setFriendTyping(true);
    const handleStopTyping = ({ senderId }) => senderId === friendId && setFriendTyping(false);

    socket.on('receive_message', handleReceive);
    socket.on('friend_typing', handleTyping);
    socket.on('friend_stop_typing', handleStopTyping);
    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('friend_typing', handleTyping);
      socket.off('friend_stop_typing', handleStopTyping);
    };
  }, [socket, friendId]);

  // New friend request arrives: refresh the Requests tab instantly
  useEffect(() => {
    if (!socket) return;
    const handle = (n) => n?.type === 'friend_request' && loadRequests();
    socket.on('new_notification', handle);
    return () => socket.off('new_notification', handle);
  }, [socket]);

  // Scroll only the message list, never the page
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, friendTyping, showEmojiPicker, showGifPicker]);

  // ---------- friend actions ----------
  const sendRequest = async (userId) => {
    try {
      const res = await axios.post(`${API}/friends/request/${userId}`, {}, { headers: authHeaders() });
      const autoAccepted = /accepted/i.test(res.data.message || '');
      setFindResults((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, relationStatus: autoAccepted ? 'friends' : 'pending-sent' } : u
        )
      );
      if (autoAccepted) {
        loadFriends();
        loadRequests();
        showToast('You are now friends', 'success');
      } else {
        showToast('Friend request sent', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send request', 'error');
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await axios.post(`${API}/friends/accept/${requestId}`, {}, { headers: authHeaders() });
      await Promise.all([loadFriends(), loadRequests()]);
      showToast('Friend added', 'success');
    } catch (err) {
      showToast('Failed to accept request', 'error');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await axios.post(`${API}/friends/reject/${requestId}`, {}, { headers: authHeaders() });
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (err) {
      showToast('Failed to reject request', 'error');
    }
  };

  const removeFriend = async () => {
    try {
      await axios.delete(`${API}/friends/${friendId}`, { headers: authHeaders() });
      setFriends((prev) => prev.filter((f) => f._id !== friendId));
      setShowRemove(false);
      showToast('Friend removed', 'success');
      navigate('/chat');
    } catch (err) {
      showToast('Failed to remove friend', 'error');
    }
  };

  // ---------- messaging ----------
  const sendMessagePayload = async (content, type = 'text', sharedVideo = null) => {
    try {
      const res = await axios.post(
        `${API}/messages/${friendId}`,
        { content, type, sharedVideo },
        { headers: authHeaders() }
      );
      const saved = res.data.data;
      setMessages((prev) => [...prev, saved]);
      socket?.emit('send_message', { receiverId: friendId, message: saved });
    } catch (err) {
      console.error('Failed to send message:', err);
      showToast('Failed to send message', 'error');
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessagePayload(input.trim(), 'text');
    setInput('');
    socket?.emit('stop_typing', { receiverId: friendId });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    socket?.emit('typing', { receiverId: friendId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('stop_typing', { receiverId: friendId });
    }, 1500);
  };

  const handleGifSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.get(`${API}/giphy/search?q=${encodeURIComponent(gifQuery)}`, {
        headers: authHeaders(),
      });
      setGifResults(res.data.data || []);
    } catch (err) {
      console.error('GIF search failed:', err);
    }
  };

  const openGifPicker = async () => {
    setShowGifPicker((prev) => !prev);
    if (gifResults.length === 0) {
      try {
        const res = await axios.get(`${API}/giphy/trending`, { headers: authHeaders() });
        setGifResults(res.data.data || []);
      } catch (err) {
        console.error('Failed to load trending GIFs:', err);
      }
    }
  };

  const sendGif = (gif) => {
    sendMessagePayload(gif.fullUrl, 'gif');
    setShowGifPicker(false);
  };

  // ---------- derived ----------
  const filteredFriends = friends.filter((f) =>
    `${f.fullName} ${f.userName}`.toLowerCase().includes(filter.trim().toLowerCase())
  );
  const isFriendOnline = onlineUsers.has(friendId);

  const tabs = [
    { key: 'chats', label: 'Chats', icon: MessageCircle },
    { key: 'requests', label: 'Requests', icon: UserPlus, badge: requests.length },
    { key: 'find', label: 'Find', icon: Search },
  ];

  const panel =
    'rounded-2xl overflow-hidden border border-border bg-surface/80 backdrop-blur-md shadow-xl shadow-black/20';

  const Avatar = ({ src, alt, online, size = 'w-11 h-11' }) => (
    <div className="relative shrink-0">
      <img src={src || 'https://via.placeholder.com/44'} alt={alt} className={`${size} rounded-full object-cover`} />
      {online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-surface" />}
    </div>
  );

  // Height: 100dvh minus navbar (4rem), dock space (6rem) and top padding (0.75rem)
  return (
    <div className="px-3 sm:px-4 pt-3">
      <div className="mx-auto max-w-[1600px] h-[calc(100dvh-10.75rem)] flex gap-3">
        {/* ================= LEFT PANEL ================= */}
        <aside
          className={`${friendId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 shrink-0 flex-col ${panel}`}
        >
          {/* Tabs */}
          <div className="shrink-0 p-3 border-b border-border">
            <div className="flex gap-1 bg-surface-light/80 p-1 rounded-full">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      active ? 'bg-primary text-on-primary' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                    {t.badge > 0 && (
                      <span
                        className={`min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold ${
                          active ? 'bg-white/25 text-on-primary' : 'bg-danger text-white'
                        }`}
                      >
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CHATS */}
          {tab === 'chats' && (
            <>
              <div className="shrink-0 p-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search your friends..."
                    className="w-full pl-9 pr-3 py-2 bg-surface-light border border-border rounded-full text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
                {filteredFriends.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <p className="text-sm text-text-muted">
                      {friends.length === 0 ? 'No friends yet' : 'No matches'}
                    </p>
                    {friends.length === 0 && (
                      <button
                        onClick={() => setTab('find')}
                        className="mt-3 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
                      >
                        Find people to add
                      </button>
                    )}
                  </div>
                ) : (
                  filteredFriends.map((f) => {
                    const active = f._id === friendId;
                    const count = unread[f._id] || 0;
                    return (
                      <Link
                        key={f._id}
                        to={`/chat/${f._id}`}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                          active ? 'bg-primary/15' : 'hover:bg-surface-light'
                        }`}
                      >
                        <Avatar src={f.avatar} alt={f.fullName} online={onlineUsers.has(f._id)} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate text-text-primary ${count > 0 || active ? 'font-semibold' : 'font-medium'}`}>
                            {f.fullName}
                          </p>
                          <p className="text-xs text-text-muted truncate">@{f.userName}</p>
                        </div>
                        {count > 0 && (
                          <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-primary text-on-primary text-[11px] font-bold rounded-full">
                            {count > 9 ? '9+' : count}
                          </span>
                        )}
                      </Link>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* REQUESTS */}
          {tab === 'requests' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              {requests.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-10">No pending requests</p>
              ) : (
                requests.map((r) => (
                  <div key={r._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-light transition-colors">
                    <Avatar src={r.requester?.avatar} alt={r.requester?.fullName} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{r.requester?.fullName}</p>
                      <p className="text-xs text-text-muted truncate">@{r.requester?.userName}</p>
                    </div>
                    <button
                      onClick={() => acceptRequest(r._id)}
                      title="Accept"
                      className="shrink-0 w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-on-primary flex items-center justify-center transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => rejectRequest(r._id)}
                      title="Decline"
                      className="shrink-0 w-8 h-8 rounded-full bg-surface-light hover:bg-danger text-text-secondary hover:text-white flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* FIND */}
          {tab === 'find' && (
            <>
              <div className="shrink-0 p-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    placeholder="Search by name or username..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 bg-surface-light border border-border rounded-full text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
                {!findQuery.trim() ? (
                  <p className="text-sm text-text-muted text-center py-10 px-4">
                    Type a name to find people and send friend requests.
                  </p>
                ) : finding && findResults.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-10">Searching...</p>
                ) : findResults.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-10">No users found</p>
                ) : (
                  findResults.map((u) => (
                    <div key={u._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-light transition-colors">
                      <Avatar src={u.avatar} alt={u.fullName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{u.fullName}</p>
                        <p className="text-xs text-text-muted truncate">@{u.userName}</p>
                      </div>
                      {u.relationStatus === 'none' && (
                        <button
                          onClick={() => sendRequest(u._id)}
                          title="Add friend"
                          className="shrink-0 w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-on-primary flex items-center justify-center transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                      {u.relationStatus === 'pending-sent' && (
                        <span className="shrink-0 text-xs text-text-muted px-3 py-1.5 bg-surface-light rounded-full">Pending</span>
                      )}
                      {u.relationStatus === 'pending-received' && (
                        <button
                          onClick={() => setTab('requests')}
                          className="shrink-0 text-xs font-semibold text-primary px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors"
                        >
                          Respond
                        </button>
                      )}
                      {u.relationStatus === 'friends' && (
                        <Link
                          to={`/chat/${u._id}`}
                          className="shrink-0 text-xs font-semibold text-primary px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors"
                        >
                          Message
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </aside>

        {/* ================= RIGHT PANEL ================= */}
        <section className={`${friendId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col ${panel}`}>
          {!friendId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6">
              <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-text-muted" />
              </div>
              <p className="font-semibold text-text-primary">Select a conversation</p>
              <p className="text-sm text-text-muted max-w-xs">
                Pick a friend from the list, or find new people to start chatting with.
              </p>
              <button
                onClick={() => setTab('find')}
                className="mt-1 bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold px-5 py-2 rounded-full transition-colors"
              >
                Find people
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/90">
                <Link to="/chat" className="md:hidden text-text-secondary hover:text-text-primary transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <Avatar src={friend?.avatar} alt={friend?.fullName} online={isFriendOnline} size="w-10 h-10" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary truncate">{friend?.fullName}</p>
                  <p className="text-xs text-text-muted">
                    {friendTyping ? 'typing...' : isFriendOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                <button
                  onClick={() => setShowRemove(true)}
                  title="Remove friend"
                  className="shrink-0 w-9 h-9 rounded-full text-text-secondary hover:text-white hover:bg-danger flex items-center justify-center transition-colors"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>

              {/* Messages: the only part that scrolls */}
              <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
                {loadingConvo ? (
                  <div className="h-full flex items-center justify-center">
                    <PulseLoader size={64} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-1">
                    <p className="text-sm font-medium text-text-secondary">No messages yet</p>
                    <p className="text-xs text-text-muted">Say hi to {friend?.fullName || 'your friend'} 👋</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender === user._id || msg.sender?._id === user._id;
                    return (
                      <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 ${
                            isMine
                              ? 'bg-gradient-to-br from-primary to-accent text-on-primary rounded-br-sm'
                              : 'bg-surface-light border border-border text-text-primary rounded-bl-sm'
                          }`}
                        >
                          {msg.type === 'text' && (
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                          {msg.type === 'gif' && <img src={msg.content} alt="GIF" className="rounded-lg max-w-full" />}
                          {msg.type === 'video_share' && msg.sharedVideo && (
                            <Link to={`/watch/${msg.sharedVideo._id}`} className="block">
                              <div className="rounded-lg overflow-hidden bg-black/20 w-48">
                                <img src={msg.sharedVideo.thumbnail} alt={msg.sharedVideo.title} className="w-full h-24 object-cover" />
                                <div className="p-2 flex items-center gap-1.5">
                                  <Film className="w-3.5 h-3.5 shrink-0" />
                                  <p className="text-xs font-medium truncate">{msg.sharedVideo.title}</p>
                                </div>
                              </div>
                            </Link>
                          )}
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-on-primary/70' : 'text-text-muted'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* GIF picker */}
              {showGifPicker && (
                <div className="shrink-0 border-t border-border bg-surface/90 p-3 max-h-56 overflow-y-auto">
                  <form onSubmit={handleGifSearch} className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={gifQuery}
                      onChange={(e) => setGifQuery(e.target.value)}
                      placeholder="Search GIFs..."
                      className="flex-1 px-3 py-1.5 bg-surface-light border border-border rounded-full text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </form>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {gifResults.map((gif) => (
                      <img
                        key={gif.id}
                        src={gif.previewUrl}
                        alt={gif.title}
                        onClick={() => sendGif(gif)}
                        className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity w-full h-20 object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Emoji picker */}
              {showEmojiPicker && (
                <div className="shrink-0 border-t border-border">
                  <EmojiPicker
                    onEmojiClick={(d) => setInput((prev) => prev + d.emoji)}
                    theme={theme === 'light' ? 'light' : 'dark'}
                    width="100%"
                    height={280}
                  />
                </div>
              )}

              {/* Input bar */}
              <form
                onSubmit={handleSendText}
                className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-border bg-surface/90"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker((p) => !p);
                    setShowGifPicker(false);
                  }}
                  className="text-text-secondary hover:text-primary transition-colors"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openGifPicker();
                    setShowEmojiPicker(false);
                  }}
                  className="text-text-secondary hover:text-primary transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 px-4 py-2.5 bg-surface-light border border-border rounded-full text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-on-primary p-2.5 rounded-full transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* Remove-friend confirmation. Rendered outside the blurred panels so its
          fixed overlay covers the whole screen. */}
      {showRemove && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center px-4"
          onClick={() => setShowRemove(false)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm text-center shadow-xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-text-primary mb-2">Remove friend</h3>
            <p className="text-sm text-text-secondary mb-5">
              Remove {friend?.fullName} from your friends? You can add them again later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemove(false)}
                className="flex-1 bg-surface-light hover:bg-border border border-border text-text-primary text-sm font-semibold py-2.5 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={removeFriend}
                className="flex-1 bg-danger hover:bg-danger-hover text-white text-sm font-semibold py-2.5 rounded-full transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}