import React, { useState } from 'react';
import axios from 'axios';

const CLOUD_NAME = "your-cloud-name";
const UPLOAD_PRESET = "your-preset-name";

export default function UploadVideo() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [video, setVideo] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);

  const getUploadSignature = async () => {
    const token = localStorage.getItem('token');
    const res = await axios.get(
      `${API_BASE}/api/v1/videos/upload-signature`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  };

  const uploadToCloudinary = (file, resourceType, sig, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', sig.apiKey);
    formData.append('timestamp', sig.timestamp);
    formData.append('signature', sig.signature);
    formData.append('folder', sig.folder);

    return axios.post(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`,
      formData,
      {
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          onProgress(percent);
        },
      }
    );
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!video || !thumbnail || !title || !description) {
      alert('Please fill in all fields and select files.');
      return;
    }

    try {
      setUploading(true);
      setVideoProgress(0);
      setThumbnailProgress(0);

      const sig = await getUploadSignature();

      const [videoRes, thumbnailRes] = await Promise.all([
        uploadToCloudinary(video, 'video', sig, setVideoProgress),
        uploadToCloudinary(thumbnail, 'image', sig, setThumbnailProgress),
      ]);

      const token = localStorage.getItem('token');

      await axios.post(
        `${API_BASE}/api/v1/videos/`,
        {
          title,
          description,
          videoFile: videoRes.data.secure_url,
          thumbnail: thumbnailRes.data.secure_url,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setTitle('');
      setDescription('');
      setVideo(null);
      setThumbnail(null);
    } catch (err) {
      console.error('Upload failed:', err.response?.data || err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setVideoProgress(0);
      setThumbnailProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center px-4 py-10">
      <form
        onSubmit={handleUpload}
        className="bg-surface p-6 sm:p-8 rounded-2xl shadow-xl shadow-black/30 space-y-6 max-w-xl w-full border border-border"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold">Upload a Video</h2>
          <p className="text-sm text-text-muted mt-1">Share something with your audience</p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm text-text-secondary mb-1.5 font-medium">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-surface-light text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="Enter video title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-text-secondary mb-1.5 font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-2.5 bg-surface-light text-text-primary border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="Write a short description..."
          />
        </div>

        {/* Video File */}
        <div>
          <label className="block text-sm text-text-secondary mb-1.5 font-medium">Video File</label>
          <div className="relative">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideo(e.target.files[0])}
              required
              className="w-full text-sm text-text-secondary file:bg-primary file:text-text-primary file:border-0 file:px-4 file:py-2 file:rounded-full file:mr-4 file:font-medium file:cursor-pointer hover:file:bg-primary-hover bg-surface-light border border-border rounded-lg px-3 py-2 transition-colors"
            />
          </div>
          {uploading && (
            <>
              <div className="mt-2.5 w-full bg-surface-light rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
              <p className="text-xs text-text-muted mt-1">{videoProgress}% uploaded</p>
            </>
          )}
        </div>

        {/* Thumbnail File */}
        <div>
          <label className="block text-sm text-text-secondary mb-1.5 font-medium">Thumbnail Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setThumbnail(e.target.files[0])}
            required
            className="w-full text-sm text-text-secondary file:bg-primary file:text-text-primary file:border-0 file:px-4 file:py-2 file:rounded-full file:mr-4 file:font-medium file:cursor-pointer hover:file:bg-primary-hover bg-surface-light border border-border rounded-lg px-3 py-2 transition-colors"
          />
          {uploading && (
            <div className="mt-2.5 w-full bg-surface-light rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-200"
                style={{ width: `${thumbnailProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading}
          className={`w-full py-2.5 rounded-full font-semibold transition-colors ${
            uploading
              ? 'bg-surface-light text-text-muted cursor-not-allowed'
              : 'bg-primary hover:bg-primary-hover text-text-primary'
          }`}
        >
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
    </div>
  );
}