import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import { Smile, Image as ImageIcon, Send, ArrowLeft, Film } from 'lucide-react';
import { useSocket } from './socketcontext';
import { useAuth } from './authcontext';
import PulseLoader from './PulseLoader';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/v1`;

const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_WIDTH = 320;

export default function ChatWindow() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [friendsList, setFriendsList] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifResults, setGifResults] = useState([]);
  const [gifQuery, setGifQuery] = useState('');
  const [friendTyping, setFriendTyping] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);

  // Resizable sidebar — width persisted in localStorage so the preference
  // survives a page reload, just like a code editor remembering panel sizes.
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('chatSidebarWidth');
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
    return Number.isFinite(parsed) ? parsed : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const friend = friendsList.find((f) => f._id === friendId);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const res = await axios.get(`${API}/friends`, { headers });
        setFriendsList(res.data.data || []);
      } catch (err) {
        console.error('Failed to load friends list:', err);
      } finally {
        setSidebarLoading(false);
      }
    };
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!friendId) {
      setMessages([]);
      return;
    }
    const loadConversation = async () => {
      setConversationLoading(true);
      try {
        const res = await axios.get(`${API}/messages/${friendId}`, { headers });
        setMessages(res.data.data || []);
      } catch (err) {
        console.error('Failed to load conversation:', err);
      } finally {
        setConversationLoading(false);
      }
    };
    loadConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId]);

  useEffect(() => {
    if (!socket) return;

    const handleReceive = (message) => {
      if (message.sender === friendId) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleTyping = ({ senderId }) => {
      if (senderId === friendId) setFriendTyping(true);
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === friendId) setFriendTyping(false);
    };

    socket.on('receive_message', handleReceive);
    socket.on('friend_typing', handleTyping);
    socket.on('friend_stop_typing', handleStopTyping);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('friend_typing', handleTyping);
      socket.off('friend_stop_typing', handleStopTyping);
    };
  }, [socket, friendId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, friendTyping]);

  // --- Drag-to-resize handlers ---
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const containerLeft = containerRef.current.getBoundingClientRect().left;
      const newWidth = e.clientX - containerLeft;
      const clamped = Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
      setSidebarWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setSidebarWidth((current) => {
        localStorage.setItem('chatSidebarWidth', String(current));
        return current;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const sendMessagePayload = async (content, type = 'text', sharedVideo = null) => {
    try {
      const res = await axios.post(
        `${API}/messages/${friendId}`,
        { content, type, sharedVideo },
        { headers }
      );
      const savedMessage = res.data.data;
      setMessages((prev) => [...prev, savedMessage]);

      socket?.emit('send_message', { receiverId: friendId, message: savedMessage });
    } catch (err) {
      console.error('Failed to send message:', err);
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

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
  };

  const handleGifSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.get(`${API}/giphy/search?q=${encodeURIComponent(gifQuery)}`, { headers });
      setGifResults(res.data.data || []);
    } catch (err) {
      console.error('GIF search failed:', err);
    }
  };

  const loadTrendingGifs = async () => {
    try {
      const res = await axios.get(`${API}/giphy/trending`, { headers });
      setGifResults(res.data.data || []);
    } catch (err) {
      console.error('Failed to load trending GIFs:', err);
    }
  };

  const openGifPicker = () => {
    setShowGifPicker((prev) => !prev);
    if (gifResults.length === 0) loadTrendingGifs();
  };

  const sendGif = (gif) => {
    sendMessagePayload(gif.fullUrl, 'gif');
    setShowGifPicker(false);
  };

  return (
      <div ref={containerRef} className="bg-background h-[calc(100vh-6rem)] flex overflow-hidden">
      {/* ===== LEFT: Conversations sidebar — resizable on desktop ===== */}
      <div
        style={{ width: friendId ? undefined : undefined }}
        className={`shrink-0 border-r border-border bg-surface flex flex-col ${
          friendId ? 'hidden md:flex' : 'flex w-full'
        }`}
      >
        <div
          className="hidden md:flex md:flex-col h-full"
          style={{ width: sidebarWidth }}
        >
          <div className="px-4 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-text-primary">Chats</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebarLoading ? (
              <div className="flex items-center justify-center py-12">
                <PulseLoader size={40} />
              </div>
            ) : friendsList.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-12 px-4">
                No friends yet.{' '}
                <Link to="/friends" className="text-primary hover:underline">
                  Find people to chat with
                </Link>
                .
              </p>
            ) : (
              friendsList.map((f) => {
                const isOnline = onlineUsers.has(f._id);
                const isActive = f._id === friendId;
                return (
                  <button
                    key={f._id}
                    onClick={() => navigate(`/chat/${f._id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 ${
                      isActive ? 'bg-surface-light' : 'hover:bg-surface-light'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={f.avatar || 'https://via.placeholder.com/48'}
                        alt={f.fullName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-surface" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary truncate">{f.fullName}</p>
                      <p className="text-xs text-text-muted truncate">
                        {isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile: full-width list, no resize handle (resizing only makes sense on desktop) */}
        <div className="flex md:hidden flex-col h-full w-full">
          <div className="px-4 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-text-primary">Chats</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sidebarLoading ? (
              <div className="flex items-center justify-center py-12">
                <PulseLoader size={40} />
              </div>
            ) : friendsList.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-12 px-4">
                No friends yet.{' '}
                <Link to="/friends" className="text-primary hover:underline">
                  Find people to chat with
                </Link>
                .
              </p>
            ) : (
              friendsList.map((f) => {
                const isOnline = onlineUsers.has(f._id);
                return (
                  <button
                    key={f._id}
                    onClick={() => navigate(`/chat/${f._id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-light border-b border-border/50"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={f.avatar || 'https://via.placeholder.com/48'}
                        alt={f.fullName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-surface" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary truncate">{f.fullName}</p>
                      <p className="text-xs text-text-muted truncate">
                        {isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Drag handle — desktop only, sits between the two panes */}
      {!friendId ? null : null}
      <div
        onMouseDown={handleResizeStart}
        className={`hidden md:block w-1 shrink-0 cursor-col-resize hover:bg-primary transition-colors ${
          isResizing ? 'bg-primary' : 'bg-border'
        }`}
        title="Drag to resize"
      />

      {/* ===== RIGHT: Active conversation ===== */}
      <div className={`flex-1 flex flex-col min-w-0 ${friendId ? 'flex' : 'hidden md:flex'}`}>
        {!friendId ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <p className="text-text-secondary font-medium">Select a conversation</p>
              <p className="text-text-muted text-sm mt-1">Choose a friend from the list to start chatting</p>
            </div>
          </div>
        ) : conversationLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <PulseLoader size={80} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface shrink-0">
              <button
                onClick={() => navigate('/chat')}
                className="text-text-secondary hover:text-text-primary md:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative">
                <img
                  src={friend?.avatar || 'https://via.placeholder.com/40'}
                  alt={friend?.fullName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                {onlineUsers.has(friendId) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-surface" />
                )}
              </div>
              <div>
                <p className="font-semibold text-text-primary">{friend?.fullName}</p>
                <p className="text-xs text-text-muted">
                  {friendTyping ? 'typing...' : onlineUsers.has(friendId) ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg) => {
                const isMine = msg.sender === user._id || msg.sender?._id === user._id;
                return (
                  <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? 'bg-gradient-to-br from-primary to-accent text-on-primary rounded-br-sm'
                          : 'bg-surface border border-border text-text-primary rounded-bl-sm'
                      }`}
                    >
                      {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}

                      {msg.type === 'gif' && (
                        <img src={msg.content} alt="GIF" className="rounded-lg max-w-full" />
                      )}

                      {msg.type === 'video_share' && msg.sharedVideo && (
                        <Link to={`/watch/${msg.sharedVideo._id}`} className="block">
                          <div className="rounded-lg overflow-hidden bg-background/20 w-48">
                            <img
                              src={msg.sharedVideo.thumbnail}
                              alt={msg.sharedVideo.title}
                              className="w-full h-24 object-cover"
                            />
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
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* GIF Picker */}
            {showGifPicker && (
              <div className="border-t border-border bg-surface p-3 max-h-64 overflow-y-auto shrink-0">
                <form onSubmit={handleGifSearch} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={gifQuery}
                    onChange={(e) => setGifQuery(e.target.value)}
                    placeholder="Search GIFs..."
                    className="flex-1 px-3 py-1.5 bg-surface-light border border-border rounded-full text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </form>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="border-t border-border shrink-0">
                <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" width="100%" height={300} />
              </div>
            )}

            {/* Input bar */}
            <form onSubmit={handleSendText} className="flex items-center gap-2 px-4 py-3 border-t border-border bg-surface shrink-0">
              <button
                type="button"
                onClick={() => { setShowEmojiPicker((p) => !p); setShowGifPicker(false); }}
                className="text-text-secondary hover:text-primary transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => { openGifPicker(); setShowEmojiPicker(false); }}
                className="text-text-secondary hover:text-primary transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-surface-light border border-border rounded-full text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
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
      </div>
    </div>
  );
}