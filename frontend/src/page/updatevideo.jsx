import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config';

export default function UpdateVideo() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [videoData, setVideoData] = useState({ title: '', description: '', thumbnail: '' });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/api/v1/videos/${videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { title, description, thumbnail } = res.data.data;
        setVideoData({ title, description, thumbnail });
      } catch (err) {
        console.error(err);
        setError('Failed to fetch video details');
      }
    };
    fetchVideo();
  }, [videoId]);

  const handleChange = (e) => {
    setVideoData({ ...videoData, [e.target.name]: e.target.value });
  };

  const handleThumbnailChange = (e) => {
    setThumbnailFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', videoData.title);
      formData.append('description', videoData.description);
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      await axios.patch(`${API_BASE}/api/v1/videos/${videoId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(percent);
        },
      });

      navigate('/profile');
    } catch (err) {
      console.error(err);
      setError('Failed to update video');
    }
  };

  return (
    <div className="min-h-screen 	bg-background text-text-primary flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-surface p-8 rounded-xl shadow-xl space-y-6 max-w-xl w-full border border-border"
      >
        <h2 className="text-2xl font-bold text-center">Update Video</h2>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* Title */}
        <div>
          <label className="block text-sm text-text-secondary mb-1">Title</label>
          <input
            type="text"
            name="title"
            value={videoData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 bg-surface-light text-text-primary border border-border rounded"
            placeholder="Enter new title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-text-secondary mb-1">Description</label>
          <textarea
            name="description"
            value={videoData.description}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-4 py-2 bg-surface-light text-text-primary border border-border rounded resize-none"
            placeholder="Update the video description..."
          />
        </div>

        {/* Thumbnail File */}
        <div>
          <label className="block text-sm text-text-secondary mb-1">New Thumbnail (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            className="w-full text-sm text-text-secondary file:	bg-primary file:text-text-primary file:px-4 file:py-2 file:rounded bg-surface-light border border-border rounded"
          />
        </div>

        {/* Current Thumbnail Preview */}
        {videoData.thumbnail && (
          <div className="mt-2">
            <p className="text-sm text-text-secondary mb-1">Current Thumbnail:</p>
            <img
              src={videoData.thumbnail}
              alt="Current thumbnail"
              className="w-64 rounded border border-border"
            />
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress > 0 && (
          <div className="mt-4">
            <p className="text-sm text-text-secondary mb-1">Uploading: {uploadProgress}%</p>
            <div className="w-full bg-surface-light rounded-full h-3">
              <div
                className="bg-indigo-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploadProgress > 0 && uploadProgress < 100}
          className={`w-full py-2 rounded font-semibold transition ${
            uploadProgress > 0 && uploadProgress < 100
              ? 'bg-surface-light cursor-not-allowed'
              : '	bg-primary hover:bg-primary-hover'
          } text-text-primary`}
        >
          {uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${uploadProgress}%...` : 'Update'}
        </button>
      </form>
    </div>
  );
}