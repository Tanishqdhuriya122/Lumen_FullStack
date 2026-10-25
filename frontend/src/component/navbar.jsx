import { Menu, MenuButton, MenuItem, MenuItems, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import {
  Search, Heart, Clock, LayoutDashboard, Bookmark, LogOut, User as UserIcon,
  Bell, Video, UserPlus, StickyNote, Sun, Moon, CheckCheck, Image as ImageIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../component/authcontext';
import { useSocket } from './socketcontext';
import { useTheme } from './themecontext';
import BackgroundPicker from './backgroundpicker';
import NotesStrip from './notesstrip';
import logo from '../assets/logo1.png';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/v1/notifications`;

const typeMeta = {
  new_video: { icon: Video, color: 'bg-primary' },
  friend_request: { icon: UserPlus, color: 'bg-green-500' },
  new_note: { icon: StickyNote, color: 'bg-amber-500' },
};

const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const formatTime = (dateString) => {
  const mins = Math.floor((new Date() - new Date(dateString)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const getLink = (notif) => {
  if (notif.type === 'new_video' && notif.video) return `/watch/${notif.video._id}`;
    if (notif.type === 'friend_request') return '/chat?tab=requests';
  return '/';
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBgPicker, setShowBgPicker] = useState(false);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get(API, { headers: getHeaders() });
      setNotifications(res.data.data.notifications || []);
      setUnreadCount(res.data.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (user) fetchNotifications();
    else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };
    socket.on('new_notification', handleNew);
    return () => socket.off('new_notification', handleNew);
  }, [socket]);

  const markAllRead = async () => {
    try {
      await axios.patch(`${API}/read-all`, {}, { headers: getHeaders() });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const markOneRead = async (id) => {
    try {
      await axios.patch(`${API}/${id}/read`, {}, { headers: getHeaders() });
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const menuItemClass =
    'flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary data-[focus]:bg-surface-light data-[focus]:text-text-primary transition-colors';

  return (
    <>
      <nav className="sticky top-0 z-50 glass-nav">
        <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-3 sm:gap-4">
            {/* LEFT: logo. flex-1 on both outer sides keeps the search bar centered */}
            <div className="flex-1 min-w-0 flex items-center">
              <Link to="/" className="shrink-0 transition-transform hover:scale-105">
                <img className="h-8 sm:h-9 w-auto" src={logo} alt="Lumen" />
              </Link>
            </div>

            {/* CENTER: animated search bar */}
            <div className="group relative w-full max-w-md min-w-0 transition-transform duration-300 ease-out hover:scale-[1.03] focus-within:scale-[1.04]">
              {/* Glow that fades in on hover/focus */}
              <div
                aria-hidden="true"
                className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40 group-focus-within:opacity-60"
              />
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none transition-all duration-300 group-hover:text-primary group-hover:scale-110 group-focus-within:text-primary group-focus-within:scale-110" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search..."
                  className="w-full rounded-full bg-surface-light/90 pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted border border-border group-hover:border-primary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-300"
                />
              </div>
            </div>

            {/* RIGHT: notes strip + bell + profile */}
            <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5 sm:gap-2">
              {!user ? (
                <Link
                  to="/signup"
                  className="bg-primary px-4 py-2 text-sm font-semibold text-white rounded-full hover:bg-primary-hover transition-colors whitespace-nowrap"
                >
                  Signup
                </Link>
              ) : (
                <>
                  <NotesStrip />

                  {/* Notification bell */}
                  <Popover className="relative shrink-0">
                    <PopoverButton className="relative flex items-center justify-center w-10 h-10 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-light data-[open]:bg-surface-light data-[open]:text-text-primary transition-colors focus:outline-none">
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-danger text-white text-[10px] font-bold leading-none rounded-full ring-2 ring-surface">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </PopoverButton>

                    <PopoverPanel
                      anchor={{ to: 'bottom end', gap: 10, padding: 12 }}
                      className="w-[min(24rem,calc(100vw-1.5rem))] bg-surface border border-border rounded-2xl shadow-2xl shadow-black/30 overflow-hidden z-[60] focus:outline-none"
                    >
                      {({ close }) => (
                        <>
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-text-primary">Notifications</h3>
                              {unreadCount > 0 && (
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  {unreadCount} new
                                </span>
                              )}
                            </div>
                            {unreadCount > 0 && (
                              <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Mark all read
                              </button>
                            )}
                          </div>

                          <div className="max-h-[26rem] overflow-y-auto">
                            {notifications.length === 0 ? (
                              <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-2">
                                <div className="w-12 h-12 rounded-full bg-surface-light flex items-center justify-center">
                                  <Bell className="w-5 h-5 text-text-muted" />
                                </div>
                                <p className="text-sm font-medium text-text-secondary">You're all caught up</p>
                                <p className="text-xs text-text-muted">
                                  New videos, friend requests and notes will show up here.
                                </p>
                              </div>
                            ) : (
                              notifications.map((notif) => {
                                const meta = typeMeta[notif.type] || typeMeta.new_video;
                                const Icon = meta.icon;
                                return (
                                  <Link
                                    key={notif._id}
                                    to={getLink(notif)}
                                    onClick={() => {
                                      if (!notif.read) markOneRead(notif._id);
                                      close();
                                    }}
                                    className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-light transition-colors ${
                                      !notif.read ? 'bg-primary/5' : ''
                                    }`}
                                  >
                                    <div className="relative shrink-0">
                                      <img
                                        src={notif.sender?.avatar || 'https://via.placeholder.com/40'}
                                        alt={notif.sender?.fullName}
                                        className="w-10 h-10 rounded-full object-cover"
                                      />
                                      <span
                                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-surface ${meta.color}`}
                                      >
                                        <Icon className="w-3 h-3 text-white" />
                                      </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-sm leading-snug ${
                                          notif.read ? 'text-text-secondary' : 'text-text-primary font-medium'
                                        }`}
                                      >
                                        {notif.message}
                                      </p>
                                      <p className="text-xs text-text-muted mt-1">{formatTime(notif.createdAt)}</p>
                                    </div>

                                    {!notif.read && <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />}
                                  </Link>
                                );
                              })
                            )}
                          </div>
                        </>
                      )}
                    </PopoverPanel>
                  </Popover>

                  {/* Profile menu */}
                  <Menu as="div" className="relative shrink-0">
                    <MenuButton className="block rounded-full focus:outline-none">
                      <img
                        src={user.avatar || 'https://via.placeholder.com/36'}
                        alt="User Avatar"
                        className="h-9 w-9 rounded-full object-cover ring-2 ring-border hover:ring-primary cursor-pointer transition-all"
                      />
                    </MenuButton>
                    <MenuItems
                      anchor={{ to: 'bottom end', gap: 10, padding: 12 }}
                      className="w-56 rounded-xl bg-surface border border-border shadow-xl shadow-black/30 focus:outline-none overflow-hidden z-[60]"
                    >
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-text-primary truncate">{user.fullName}</p>
                        <p className="text-xs text-text-muted truncate">@{user.userName}</p>
                      </div>
                      <MenuItem>
                        <Link to="/profile" className={menuItemClass}>
                          <UserIcon className="w-4 h-4" /> My Profile
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <Link to="/like" className={menuItemClass}>
                          <Heart className="w-4 h-4" /> Liked Videos
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <Link to="/history" className={menuItemClass}>
                          <Clock className="w-4 h-4" /> History
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <Link to="/watch-later" className={menuItemClass}>
                          <Bookmark className="w-4 h-4" /> Watch Later
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <Link to="/dashboard" className={menuItemClass}>
                          <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </Link>
                      </MenuItem>
                      <div className="border-t border-border">
                        <MenuItem>
                          <button onClick={() => setShowBgPicker(true)} className={`w-full ${menuItemClass}`}>
                            <ImageIcon className="w-4 h-4" /> Change background
                          </button>
                        </MenuItem>
                        <MenuItem>
                          <button onClick={toggleTheme} className={`w-full ${menuItemClass}`}>
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                          </button>
                        </MenuItem>
                        <MenuItem>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger data-[focus]:bg-surface-light transition-colors"
                          >
                            <LogOut className="w-4 h-4" /> Logout
                          </button>
                        </MenuItem>
                      </div>
                    </MenuItems>
                  </Menu>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showBgPicker && <BackgroundPicker onClose={() => setShowBgPicker(false)} />}
    </>
  );
}