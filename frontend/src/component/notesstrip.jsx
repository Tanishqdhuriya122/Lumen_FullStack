import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, X, StickyNote } from 'lucide-react';
import { useAuth } from './authcontext';
import { useSocket } from './socketcontext';
import { useToast } from './ToastContext';

const API = `${API_BASE}/api/v1/notes`;
const MAX_LEN = 60;
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function NotesStrip() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();

  const [notes, setNotes] = useState([]);
  const [myNote, setMyNote] = useState(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [notesRes, myRes] = await Promise.all([
        axios.get(`${API}/subscribed`, { headers: getHeaders() }),
        axios.get(`${API}/me`, { headers: getHeaders() }),
      ]);
      setNotes(notesRes.data.data || []);
      setMyNote(myRes.data.data);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  useEffect(() => {
    if (user) fetchData();
    else {
      setNotes([]);
      setMyNote(null);
    }
  }, [user]);

  // Real-time: when someone you follow posts a note, refresh the strip instantly
  useEffect(() => {
    if (!socket) return;
    const handle = (n) => {
      if (n?.type === 'new_note') fetchData();
    };
    socket.on('new_notification', handle);
    return () => socket.off('new_notification', handle);
  }, [socket]);

  const openComposer = () => {
    setDraft(myNote?.content || '');
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      setSaving(true);
      const res = await axios.post(API, { content: draft.trim() }, { headers: getHeaders() });
      setMyNote(res.data.data);
      setOpen(false);
      showToast('Note posted', 'success');
    } catch (err) {
      console.error('Failed to post note:', err);
      showToast(err.response?.data?.message || 'Failed to post note', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(API, { headers: getHeaders() });
      setMyNote(null);
      setOpen(false);
      showToast('Note removed', 'success');
    } catch (err) {
      console.error('Failed to delete note:', err);
      showToast('Failed to remove note', 'error');
    }
  };

  if (!user) return null;

  const modal = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">Notes</h3>
          <button
            onClick={() => setOpen(false)}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Composer */}
          <form onSubmit={handleSave} className="p-5 space-y-3 border-b border-border">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
              rows={2}
              autoFocus
              placeholder="Share a thought..."
              className="w-full px-3 py-2.5 bg-surface-light border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
            />
            <p className="text-xs text-text-muted text-right">
              {draft.length}/{MAX_LEN}
            </p>
            <div className="flex gap-2">
              {myNote && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 bg-surface-light hover:bg-danger border border-border hover:border-danger text-text-secondary hover:text-white text-sm font-semibold py-2.5 rounded-full transition-colors"
                >
                  Remove
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !draft.trim()}
                className="flex-1 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-full transition-colors"
              >
                {saving ? 'Posting...' : myNote ? 'Update' : 'Post'}
              </button>
            </div>
          </form>

          {/* Notes from people you follow (also the only way to read them on mobile) */}
          <div className="p-2">
            <p className="px-3 pt-2 pb-1 text-xs font-medium text-text-muted">From people you follow</p>
            {notes.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">No notes yet</p>
            ) : (
              notes.map((note) => (
                <Link
                  key={note._id}
                  to={`/channel/${note.owner?.userName}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-light transition-colors"
                >
                  <img
                    src={note.owner?.avatar || 'https://via.placeholder.com/36'}
                    alt={note.owner?.fullName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{note.owner?.fullName}</p>
                    <p className="text-sm text-text-secondary truncate">{note.content}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* md and up: compact strip of pills */}
      <div className="hidden md:flex items-center gap-2 min-w-0 max-w-[22rem] overflow-x-auto scrollbar-hide">
        <button
          onClick={openComposer}
          title={myNote ? 'Edit your note' : 'Add a note'}
          className="shrink-0 flex items-center gap-2 h-9 pl-1 pr-3 rounded-full bg-surface-light/80 border border-border hover:border-primary hover:-translate-y-0.5 transition-all"
        >
          <span className="relative">
            <img
              src={user.avatar || 'https://via.placeholder.com/28'}
              alt="You"
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center ring-2 ring-surface">
              <Plus className="w-2.5 h-2.5 text-white" />
            </span>
          </span>
          <span className="text-xs text-text-secondary max-w-[96px] truncate">
            {myNote ? myNote.content : 'Add a note'}
          </span>
        </button>

        {notes.map((note) => (
          <Link
            key={note._id}
            to={`/channel/${note.owner?.userName}`}
            title={`${note.owner?.fullName}: ${note.content}`}
            className="shrink-0 flex items-center gap-2 h-9 pl-1 pr-3 rounded-full bg-surface-light/80 border border-border hover:border-primary hover:-translate-y-0.5 transition-all"
          >
            <img
              src={note.owner?.avatar || 'https://via.placeholder.com/28'}
              alt={note.owner?.fullName}
              className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/40"
            />
            <span className="text-xs text-text-secondary max-w-[110px] truncate">{note.content}</span>
          </Link>
        ))}
      </div>

      {/* Below md: single icon that opens the same panel */}
      <button
        onClick={openComposer}
        title="Notes"
        className="md:hidden relative shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
      >
        <StickyNote className="w-5 h-5" />
        {notes.length > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-surface" />
        )}
      </button>

      {open && createPortal(modal, document.body)}
    </>
  );
}