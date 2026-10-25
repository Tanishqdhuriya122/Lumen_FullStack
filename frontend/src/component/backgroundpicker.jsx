import React, { useState } from 'react';
import axios from 'axios';
import { X, Upload, Check } from 'lucide-react';
import { useBackground, DEFAULT_BACKGROUND_CSS } from './backgroundcontext';
import { useToast } from './ToastContext';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/v1`;
const MAX_MB = 8;

const PRESETS = [
  { name: 'Aurora', value: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 50%, #a855f7 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #f97316 0%, #ef4444 45%, #ec4899 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #10b981 0%, #0d9488 50%, #0ea5e9 100%)' },
  { name: 'Midnight', value: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' },
];

export default function BackgroundPicker({ onClose }) {
  const { background, css, setBackground, resetBackground } = useBackground();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      showToast(`Image must be under ${MAX_MB}MB`, 'error');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);
      const token = localStorage.getItem('token');

      const sigRes = await axios.get(`${API}/videos/upload-signature`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sig = sigRes.data.data;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sig.apiKey);
      formData.append('timestamp', sig.timestamp);
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        formData,
        {
          onUploadProgress: (ev) =>
            setProgress(ev.total ? Math.round((ev.loaded * 100) / ev.total) : 0),
        }
      );

      // Resize + compress on delivery so a big photo doesn't slow every page load
      const optimized = res.data.secure_url.replace(
        '/upload/',
        '/upload/q_auto,f_auto,w_2000,c_limit/'
      );
      setBackground(optimized);
      showToast('Background updated', 'success');
    } catch (err) {
      console.error('Background upload failed:', err.response?.data || err);
      showToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const Tile = ({ name, image, selected, onClick }) => (
    <button
      onClick={onClick}
      disabled={uploading}
      className={`relative aspect-[4/3] rounded-xl overflow-hidden border transition-all disabled:opacity-60 ${
        selected ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/60'
      }`}
      style={{ backgroundImage: image, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <span className="absolute inset-x-0 bottom-0 bg-black/45 text-white text-xs font-medium py-1">
        {name}
      </span>
      {selected && (
        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}
    </button>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center px-4"
      onClick={() => !uploading && onClose()}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-xl shadow-black/40 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">Change background</h3>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Current background preview */}
          <div
            className="w-full aspect-video rounded-xl border border-border"
            style={{ backgroundImage: css, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />

          {/* Upload */}
          <label
            className={`flex flex-col items-center justify-center gap-1.5 w-full py-5 rounded-xl border border-dashed border-border bg-surface-light transition-colors ${
              uploading ? 'cursor-wait' : 'cursor-pointer hover:border-primary'
            }`}
          >
            <Upload className="w-5 h-5 text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">
              {uploading ? `Uploading... ${progress}%` : 'Upload your own image'}
            </span>
            <span className="text-xs text-text-muted">JPG, PNG or WebP, up to {MAX_MB}MB</span>
            <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
            {uploading && (
              <div className="w-3/4 h-1.5 bg-surface rounded-full overflow-hidden mt-1">
                <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            )}
          </label>

          {/* Presets */}
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">Or pick a preset</p>
            <div className="grid grid-cols-3 gap-3">
              <Tile
                name="Default"
                image={DEFAULT_BACKGROUND_CSS}
                selected={!background}
                onClick={resetBackground}
              />
              {PRESETS.map((p) => (
                <Tile
                  key={p.name}
                  name={p.name}
                  image={p.value}
                  selected={background === p.value}
                  onClick={() => setBackground(p.value)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}