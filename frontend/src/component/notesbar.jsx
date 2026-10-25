import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, X } from 'lucide-react';
import { useAuth } from './authcontext';
import { useToast } from './ToastContext';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/v1/notes`;

export default function NotesBar() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [notes, setNotes] = useState([]);
  const [myNote, setMyNote] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    if (!user) return;
    try {
      const [notesRes, myNoteRes] = await Promise.all([
        axios.get(`${API}/subscribed`, { headers }),
        axios.get(`${API}/me`, { headers }),
      ]);
      setNotes(notesRes.data.data || []);
      setMyNote(myNoteRes.data.data);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const openComposer = () => {
    setDraft(myNote?.content || '');
    setShowComposer(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;

    try {
      setSaving(true);
      const res = await axios.post(API, { content: draft.trim() }, { headers });
      setMyNote(res.data.data);
      setShowComposer(false);
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
      await axios.delete(API, { headers });
      setMyNote(null);
      setShowComposer(false);
      showToast('Note removed', 'success');
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  if (!user || loading) return null;
  // if (notes.length === 0 && !myNote) return null; // nothing to show, don't render an empty bar

  return (
    <div className="border-b border-border/50 bg-surface/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          {/* Your own note / "add note" entry — always first */}
          <button
            onClick={openComposer}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div className="relative">
              <img
                src={user.avatar || 'https://via.placeholder.com/48'}
                alt="You"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-border group-hover:ring-primary transition-all"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center ring-2 ring-background">
                <Plus className="w-3 h-3 text-text-primary" />
              </span>
            </div>
            {myNote ? (
              <div className="max-w-[90px] bg-surface-light border border-border rounded-xl px-2 py-1 -mt-1">
                <p className="text-[10px] text-text-secondary truncate">{myNote.content}</p>
              </div>
            ) : (
              <span className="text-xs text-text-muted">Your note</span>
            )}
          </button>

          {/* Subscribed channels' notes */}
          {notes.map((note) => (
            <Link
              key={note._id}
              to={`/channel/${note.owner?.userName}`}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <img
                src={note.owner?.avatar || 'https://via.placeholder.com/48'}
                alt={note.owner?.fullName}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/40"
              />
              <div className="max-w-[90px] bg-surface-light border border-border rounded-xl px-2 py-1 -mt-1">
                <p className="text-[10px] text-text-secondary truncate">{note.content}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Note composer modal */}
      {showComposer && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={() => setShowComposer(false)}
        >
          <div
            className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Your note</h3>
              <button onClick={() => setShowComposer(false)} className="text-text-secondary hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 60))}
                rows={2}
                autoFocus
                placeholder="Share a thought..."
                className="w-full px-3 py-2.5 bg-surface-light border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
              />
              <p className="text-xs text-text-muted text-right">{draft.length}/60</p>

              <div className="flex gap-2">
                {myNote && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 bg-surface-light hover:bg-danger border border-border hover:border-danger text-text-secondary hover:text-text-primary text-sm font-semibold py-2.5 rounded-full transition-colors"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || !draft.trim()}
                  className="flex-1 bg-primary hover:bg-primary-hover disabled:opacity-50 text-text-primary text-sm font-semibold py-2.5 rounded-full transition-colors"
                >
                  {saving ? 'Posting...' : myNote ? 'Update' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}