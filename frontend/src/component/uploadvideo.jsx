import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { UploadCloud, Film, Image as ImageIcon, X, CheckCircle2, Camera, Check } from 'lucide-react';
import { useToast } from './ToastContext';

const API = `${API_BASE}/api/v1`;
const MAX_VIDEO_MB = 100; // Cloudinary's free plan caps video uploads at 100MB; raise this if your plan allows more
const MAX_IMAGE_MB = 10;
const TITLE_MAX = 100;
const DESC_MAX = 1000;

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const panel =
  'rounded-2xl border border-border bg-surface/80 backdrop-blur-md shadow-xl shadow-black/20';

// Drag-and-drop / click-to-browse area. Defined outside the page component so it
// keeps its own state between renders.
function Dropzone({ accept, onFile, icon: Icon, title, hint, className = '' }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFile(e.dataTransfer.files?.[0]);
      }}
      className={`flex flex-col items-center justify-center gap-2 text-center cursor-pointer rounded-xl border-2 border-dashed transition-colors ${
        dragging ? 'border-primary bg-primary/10' : 'border-border bg-surface-light/60 hover:border-primary/60'
      } ${className}`}
    >
      <span className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </span>
      <span className="text-sm font-semibold text-text-primary">{title}</span>
      <span className="text-xs text-text-muted px-4">{hint}</span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </label>
  );
}

export default function UploadVideo() {
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [video, setVideo] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [thumbUrl, setThumbUrl] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState('');
  const [videoProgress, setVideoProgress] = useState(0);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [publishedId, setPublishedId] = useState(null);

  const previewRef = useRef(null);

  // Local preview URLs (revoked when the file changes or the page unmounts)
  useEffect(() => {
    if (!video) {
      setVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(video);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  useEffect(() => {
    if (!thumbnail) {
      setThumbUrl(null);
      return;
    }
    const url = URL.createObjectURL(thumbnail);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnail]);

  const pickVideo = (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      showToast('Please choose a video file', 'error');
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      showToast(`Video must be under ${MAX_VIDEO_MB}MB`, 'error');
      return;
    }
    setVideo(file);
    // Pre-fill the title from the filename so you don't start from blank
    if (!title.trim()) setTitle(file.name.replace(/\.[^/.]+$/, '').slice(0, TITLE_MAX));
  };

  const pickThumbnail = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      showToast(`Image must be under ${MAX_IMAGE_MB}MB`, 'error');
      return;
    }
    setThumbnail(file);
  };

  // Grabs whatever frame the preview player is currently showing
  const captureFrame = () => {
    const el = previewRef.current;
    if (!el || !el.videoWidth) {
      showToast('Wait for the video to load, then scrub to a frame', 'info');
      return;
    }
    const scale = Math.min(1, 1280 / el.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(el.videoWidth * scale);
    canvas.height = Math.round(el.videoHeight * scale);
    canvas.getContext('2d').drawImage(el, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          showToast('Could not capture that frame', 'error');
          return;
        }
        setThumbnail(new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }));
        showToast('Thumbnail set from video', 'success');
      },
      'image/jpeg',
      0.9
    );
  };

  const getUploadSignature = async () => {
    const res = await axios.get(`${API}/videos/upload-signature`, { headers: authHeaders() });
    return res.data.data;
  };

  const uploadToCloudinary = (file, resourceType, sig, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', sig.apiKey);
    formData.append('timestamp', sig.timestamp);
    formData.append('signature', sig.signature);
    formData.append('folder', sig.folder);

    return axios.post(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`, formData, {
      onUploadProgress: (e) => onProgress(e.total ? Math.round((e.loaded * 100) / e.total) : 0),
    });
  };

  const checks = [
    { label: 'Video', ok: !!video },
    { label: 'Thumbnail', ok: !!thumbnail },
    { label: 'Title', ok: !!title.trim() },
    { label: 'Description', ok: !!description.trim() },
  ];
  const canPublish = checks.every((c) => c.ok);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!canPublish) {
      showToast('Add a video, thumbnail, title and description first', 'info');
      return;
    }

    try {
      setUploading(true);
      setVideoProgress(0);
      setThumbProgress(0);

      setStage('Preparing upload...');
      const sig = await getUploadSignature();

      setStage('Uploading files...');
      const [videoRes, thumbRes] = await Promise.all([
        uploadToCloudinary(video, 'video', sig, setVideoProgress),
        uploadToCloudinary(thumbnail, 'image', sig, setThumbProgress),
      ]);

      setStage('Publishing...');
      const res = await axios.post(
        `${API}/videos/`,
        {
          title: title.trim(),
          description: description.trim(),
          videoFile: videoRes.data.secure_url,
          thumbnail: thumbRes.data.secure_url,
        },
        { headers: { ...authHeaders(), 'Content-Type': 'application/json' } }
      );

      setPublishedId(res.data.data?._id || 'done');
      showToast('Video published', 'success');
    } catch (err) {
      console.error('Upload failed:', err.response?.data || err);
      showToast(err.response?.data?.message || 'Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVideo(null);
    setThumbnail(null);
    setVideoProgress(0);
    setThumbProgress(0);
    setStage('');
    setPublishedId(null);
  };

  // Overall progress, weighted by file size so the big video dominates
  const totalBytes = (video?.size || 0) + (thumbnail?.size || 0);
  const overall = totalBytes
    ? Math.round(((video?.size || 0) * videoProgress + (thumbnail?.size || 0) * thumbProgress) / totalBytes)
    : 0;

  /* ---------- Success state ---------- */
  if (publishedId) {
    return (
      <div className="px-4 py-10">
        <div className={`mx-auto max-w-md p-8 text-center ${panel}`}>
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/15 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Your video is live</h2>
          <p className="text-sm text-text-secondary mt-1">
            Your subscribers have been notified about "{title}".
          </p>
          <div className="flex gap-3 mt-6">
            {publishedId !== 'done' && (
              <Link
                to={`/watch/${publishedId}`}
                className="flex-1 bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold py-2.5 rounded-full transition-colors"
              >
                Watch video
              </Link>
            )}
            <button
              onClick={resetForm}
              className="flex-1 bg-surface-light hover:bg-border border border-border text-text-primary text-sm font-semibold py-2.5 rounded-full transition-colors"
            >
              Upload another
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Main form ---------- */
  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className={`px-5 py-4 mb-5 ${panel}`}>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Upload video</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Add your video, pick a thumbnail and tell people what it's about.
          </p>
        </div>

        <form onSubmit={handleUpload}>
          <fieldset disabled={uploading} className="grid lg:grid-cols-5 gap-5 min-w-0 border-0 p-0 m-0">
            {/* LEFT: media */}
            <div className="lg:col-span-3 space-y-5">
              {/* Video */}
              <div className={`p-4 ${panel}`}>
                <h2 className="text-sm font-semibold text-text-primary mb-3">Video</h2>
                {!video ? (
                  <Dropzone
                    accept="video/*"
                    onFile={pickVideo}
                    icon={UploadCloud}
                    title="Drag & drop a video here"
                    hint={`or click to browse. MP4, MOV or WebM, up to ${MAX_VIDEO_MB}MB`}
                    className="aspect-video"
                  />
                ) : (
                  <div>
                    <div className="aspect-video rounded-xl overflow-hidden bg-black">
                      <video
                        ref={previewRef}
                        src={videoUrl || undefined}
                        controls
                        preload="metadata"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Film className="w-4.5 h-4.5 text-primary" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{video.name}</p>
                        <p className="text-xs text-text-muted">{formatBytes(video.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={captureFrame}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-text-primary bg-surface-light hover:bg-border border border-border px-3 py-2 rounded-full transition-colors"
                        title="Scrub the player to a frame you like, then click this"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Use current frame</span>
                        <span className="sm:hidden">Frame</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideo(null)}
                        className="shrink-0 w-8 h-8 rounded-full text-text-secondary hover:text-on-primary hover:bg-danger flex items-center justify-center transition-colors"
                        title="Remove video"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              <div className={`p-4 ${panel}`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-text-primary">Thumbnail</h2>
                  <span className="text-xs text-text-muted">16:9 works best</span>
                </div>
                {!thumbnail ? (
                  <Dropzone
                    accept="image/*"
                    onFile={pickThumbnail}
                    icon={ImageIcon}
                    title="Upload a thumbnail"
                    hint={`Drag & drop or click to browse. JPG or PNG, up to ${MAX_IMAGE_MB}MB. You can also grab a frame from the video above.`}
                    className="aspect-[21/9]"
                  />
                ) : (
                  <div className="flex items-center gap-4">
                    <img
                      src={thumbUrl || undefined}
                      alt="Thumbnail preview"
                      className="w-44 sm:w-56 aspect-video object-cover rounded-xl border border-border shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{thumbnail.name}</p>
                      <p className="text-xs text-text-muted">{formatBytes(thumbnail.size)}</p>
                      <div className="flex gap-2 mt-3">
                        <label className="cursor-pointer text-xs font-semibold text-text-primary bg-surface-light hover:bg-border border border-border px-3 py-1.5 rounded-full transition-colors">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              pickThumbnail(e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setThumbnail(null)}
                          className="text-xs font-semibold text-text-secondary hover:text-on-primary hover:bg-danger border border-border hover:border-danger px-3 py-1.5 rounded-full transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: details + publish */}
            <div className="lg:col-span-2 space-y-5">
              <div className={`p-4 space-y-4 ${panel}`}>
                <h2 className="text-sm font-semibold text-text-primary">Details</h2>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="title" className="text-sm font-medium text-text-secondary">
                      Title
                    </label>
                    <span className="text-xs text-text-muted">
                      {title.length}/{TITLE_MAX}
                    </span>
                  </div>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    maxLength={TITLE_MAX}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your video a catchy title"
                    className="w-full px-4 py-2.5 bg-surface-light text-text-primary placeholder:text-text-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="description" className="text-sm font-medium text-text-secondary">
                      Description
                    </label>
                    <span className="text-xs text-text-muted">
                      {description.length}/{DESC_MAX}
                    </span>
                  </div>
                  <textarea
                    id="description"
                    value={description}
                    maxLength={DESC_MAX}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={7}
                    placeholder="Tell viewers what this video is about..."
                    className="w-full px-4 py-2.5 bg-surface-light text-text-primary placeholder:text-text-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Publish card */}
              <div className={`p-4 ${panel}`}>
                {!uploading ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {checks.map((c) => (
                        <span
                          key={c.label}
                          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                            c.ok
                              ? 'text-green-500 border-green-500/30 bg-green-500/10'
                              : 'text-text-muted border-border bg-surface-light'
                          }`}
                        >
                          {c.ok && <Check className="w-3 h-3" />}
                          {c.label}
                        </span>
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={!canPublish}
                      className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-on-primary font-semibold py-3 rounded-full transition-colors"
                    >
                      <UploadCloud className="w-4 h-4" />
                      Publish video
                    </button>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-text-primary">{stage}</p>
                      <p className="text-sm font-semibold text-primary">{overall}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-surface-light overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-200"
                        style={{ width: `${overall}%` }}
                      />
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-text-muted">
                      <div className="flex justify-between">
                        <span>Video</span>
                        <span>{videoProgress}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Thumbnail</span>
                        <span>{thumbProgress}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mt-3">Keep this tab open until the upload finishes.</p>
                  </div>
                )}
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}