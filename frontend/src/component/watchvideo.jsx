import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../component/authcontext';
import axios from 'axios';
import HlsVideoPlayer from './hlsvideoplayer';
import ShareVideoModal from './sharevideomodal';
import { Share2 } from 'lucide-react';
import PulseLoader from './PulseLoader';
import { useToast } from './ToastContext';

export default function WatchVideo() {
  const { videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [error, setError] = useState('');
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [isDisliked, setIsDisliked] = useState(false);
  const [upNextVideos, setUpNextVideos] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const {user}=useAuth();
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [commentLikes, setCommentLikes] = useState({});
  const [showMobileComments, setShowMobileComments] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subCheckDone, setSubCheckDone] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
  
    if (!token) {
      setError("You must be logged in to view this video.");
      return;
    }
  
    const fetchVideo = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/videos/${videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        const videoData = res.data.data;
        setVideo(videoData);
        setLikeCount(videoData.likeCount || 0);
        setIsLiked(videoData.isLikedByCurrentUser);
        setDislikeCount(videoData.dislikeCount || 0);
        setIsDisliked(videoData.isDislikedByCurrentUser);
      } catch (err) {
        console.error("❌ Failed to load video:", err);
        setError("Failed to load video.");
      }
    };
  
    const fetchUpNextVideos = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/videos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        const others = res.data.data.filter((v) => v._id !== videoId);
        setUpNextVideos(others);
      } catch (err) {
        console.error("❌ Failed to load up next videos:", err);
      }
    };
  
    const fetchComments = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/comments/${videoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: { page: 1, limit: 20 },
        });
  
        setComments(res.data.data);
        setCommentLikes(
          res.data.data.reduce((acc, comment) => {
            acc[comment._id] = {
              likedByUser: comment.isLikedByCurrentUser || false,
              count: comment.likeCount || 0,
            };
            return acc;
          }, {})
        );
      } catch (err) {
        console.error("❌ Failed to fetch comments:", err.response?.data || err.message);
        setError("No comments found");
      } finally {
        setLoadingComments(false);
      }
    };
  
    fetchVideo();
    fetchUpNextVideos();
    fetchComments();
  }, [videoId]);

  useEffect(() => {
    if (!video?.owner?._id || !user?._id) return;
  
    const token = localStorage.getItem('token');
  
    const checkIfSubscribed = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/v1/subscriptions/c/${user._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
  
        const alreadySubscribed = res.data.data.some(
          (s) => s.channel._id === video.owner._id
        );
        setIsSubscribed(alreadySubscribed);
      } catch (err) {
        console.error('Subscription check failed:', err);
      } finally {
        setSubCheckDone(true);
      }
    };
  
    checkIfSubscribed();
  }, [video?.owner?._id, user?._id]); 

  useEffect(() => {
    const token = localStorage.getItem("token");
    const addToHistory = async () => {
      try {
        await axios.post(
          `${API_BASE}/api/v1/users/watch/${videoId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (err) {
        console.error("❌ Failed to add to watch history", err);
      }
    };
  
    if (videoId) {
      addToHistory();
    }
  }, [videoId]);

  const handleLikeToggle = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE}/api/v1/likes/toggle/v/${videoId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLiked(res.data.data.isLiked);
      setLikeCount(res.data.data.likeCount);
      setIsDisliked(res.data.data.isDisliked);
      setDislikeCount(res.data.data.dislikeCount);
    } catch (err) {
      console.error('Like toggle failed:', err);
    }
  };

  const handleDislikeToggle = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE}/api/v1/likes/toggle/dislike/v/${videoId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsDisliked(res.data.data.isDisliked);
      setDislikeCount(res.data.data.dislikeCount);
      setIsLiked(res.data.data.isLiked);
      setLikeCount(res.data.data.likeCount);
    } catch (err) {
      console.error('Dislike toggle failed:', err);
    }
  };

  const handleVideoEnded = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/api/v1/videos/${videoId}/view`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to record view:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
  
    try {
      setIsPosting(true);
      const token = localStorage.getItem("token");
  
      const res = await axios.post(
        `${API_BASE}/api/v1/comments/${videoId}`,
        { content: commentText },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      const newComment = res.data.data;
      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
    } catch (err) {
      console.error("❌ Failed to post comment:", err.response?.data || err);
      showToast('Failed to post comment', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editedContent.trim()) return;
  
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_BASE}/api/v1/comments/c/${commentId}`,
        { content: editedContent },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      const updated = res.data.data;
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? { ...c, content: updated.content } : c))
      );
      setEditingCommentId(null);
      setEditedContent("");
    } catch (err) {
      console.error("Failed to update comment:", err.response?.data || err);
      alert("Failed to update comment");
    }
  };
  
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
  
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/v1/comments/c/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment:", err.response?.data || err);
      alert("Failed to delete comment");
    }
  };
  
  const handleToggleSubscription = async () => {
    const token = localStorage.getItem("token");
    setSubscribing(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/v1/subscriptions/c/${video.owner._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      const msg = res.data.message.toLowerCase();
      if (msg.includes("unsubscribed")) {
        setIsSubscribed(false);
      } else if (msg.includes("subscribed")) {
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error("❌ Failed to toggle subscription:", err);
      alert("Something went wrong");
    } finally {
      setSubscribing(false);
    }
  };

  if (error) return <div className="text-text-primary p-10">{error}</div>;
  if (!video) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <PulseLoader size={80} />
      </div>
    );
  }

  return (
    <>
    <div className="bg-background text-text-primary min-h-screen p-4 md:p-6 flex flex-col md:flex-row gap-6">
      {/* Left: Video */}
      <div className="flex-1 relative">
        <div className="w-full aspect-video bg-surface rounded-xl overflow-hidden relative shadow-lg shadow-black/30">
          <HlsVideoPlayer
            src={video.videoFile}
            poster={video.thumbnail}
            videoId={video._id}
            autoPlay
            preload="metadata"
            className="w-full h-full object-contain"
            onContextMenu={(e) => e.preventDefault()}
            onEnded={handleVideoEnded}
          />
        </div>

        <h1 className="text-lg sm:text-xl font-bold mt-4 flex items-center gap-3 flex-wrap">
          {video.title}
          <span className="text-sm text-text-muted font-normal">
            {video.view || 0} views
          </span>
        </h1>

        {/* Description + Add to Playlist + Like/Dislike */}
        <div className="text-sm text-text-secondary mt-3 whitespace-pre-wrap flex flex-wrap items-center justify-between gap-3">
          <span className="pr-2 max-w-full sm:max-w-[60%]">{video.description}</span>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={`/add-to-playlist/${video._id}`}
              title="Add to your playlist"
              className="bg-surface-light hover:bg-surface border border-border text-text-primary text-xs px-3 py-1.5 rounded-full font-semibold transition-colors"
            >
              ➕ Playlist
            </Link>

            {/* Like / Dislike pill group */}
            <div className="flex items-center bg-surface-light border border-border rounded-full overflow-hidden">
              <button
                onClick={handleLikeToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  isLiked ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
                title={isLiked ? "Unlike" : "Like"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill={isLiked ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M14 9V5a3 3 0 00-6 0v4H5a1 1 0 00-1 1v10a1 1 0 001 1h13.28a2 2 0 001.99-1.78l.7-7A2 2 0 0019 9h-5z" />
                </svg>
                <span>{likeCount}</span>
              </button>

              <div className="w-px h-5 bg-border" />

              <button
                onClick={handleDislikeToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  isDisliked ? 'text-danger' : 'text-text-secondary hover:text-text-primary'
                }`}
                title={isDisliked ? "Remove dislike" : "Dislike"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill={isDisliked ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M10 15v4a3 3 0 006 0v-4h5a1 1 0 001-1V4a1 1 0 00-1-1H5.72a2 2 0 00-1.99 1.78l-.7 7A2 2 0 005 14h5z" />
                </svg>
                <span>{dislikeCount}</span>
              </button>
              <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 bg-surface-light hover:bg-surface border border-border text-text-primary text-sm px-3 py-1.5 rounded-full transition-colors"
                  title="Share to a friend"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
            </div>
          </div>
        </div>

        {/* Channel Info */}
        <div className="flex items-center justify-between mt-6 border-t border-border pt-4">
          <Link
            to={`/channel/${video.owner?.userName}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img
              src={video.owner?.avatar || 'https://via.placeholder.com/40'}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-border"
              alt="Channel"
            />
            <div>
              <h2 className="font-semibold leading-tight">{video.owner?.fullName}</h2>
              <p className="text-sm text-text-secondary leading-tight">{video.owner?.email}</p>
            </div>
          </Link>

          {subCheckDone && user?._id !== video.owner?._id && (
            <button
              onClick={handleToggleSubscription}
              disabled={subscribing}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors disabled:opacity-60 ${
                isSubscribed
                  ? "bg-surface-light text-text-secondary hover:bg-surface border border-border"
                  : "bg-danger text-text-primary hover:bg-danger-hover"
              }`}
            >
              {subscribing ? "..." : isSubscribed ? "Subscribed" : "Subscribe"}
            </button>
          )}
        </div>

        <hr className="border-t border-border my-6" />

        <form onSubmit={handleAddComment} className="space-y-2">
          <label htmlFor="comment" className="block text-sm font-medium text-text-secondary">
            Add a comment
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={3}
            className="w-full p-3 bg-surface-light text-text-primary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            placeholder="Write your thoughts..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={isPosting}
          />
          <button
            type="submit"
            className="bg-primary hover:bg-primary-hover text-text-primary px-4 py-2 rounded-full font-semibold text-sm transition-colors disabled:opacity-50"
            disabled={isPosting || !commentText.trim()}
          >
            {isPosting ? "Posting..." : "Post Comment"}
          </button>
        </form>

        <div className="block md:hidden mt-6 mb-2">
          <button
            onClick={() => setShowMobileComments(prev => !prev)}
            className="w-full text-left text-primary font-semibold py-2 text-sm"
          >
            {showMobileComments ? 'Hide Comments' : `Show Comments (${comments.length})`}
          </button>
        </div>

        <div className={`mt-6 space-y-5 ${!showMobileComments ? 'hidden md:block' : ''}`}>
          {comments.map((comment) => (
            <div key={comment._id} className="flex items-start gap-3">
              <img
                src={comment.owner?.avatar || 'https://via.placeholder.com/48'}
                alt="User Avatar"
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  {comment.owner?.fullName || 'Anonymous'}
                </p>

                {editingCommentId === comment._id ? (
                  <>
                    <textarea
                      className="w-full bg-surface-light text-text-primary p-2 rounded-lg mt-1 border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={2}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleUpdateComment(comment._id)}
                        className="text-xs bg-primary px-4 py-1.5 rounded-full hover:bg-primary-hover transition-colors font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="text-xs bg-surface-light border border-border px-4 py-1.5 rounded-full hover:bg-surface transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-text-secondary text-sm mt-1">{comment.content}</p>
                    <p className="text-text-muted text-xs mt-1">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>

                    {user?._id === comment.owner?._id && (
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => {
                            setEditingCommentId(comment._id);
                            setEditedContent(comment.content);
                          }}
                          className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M17.414 2.586a2 2 0 010 2.828l-9.9 9.9a1 1 0 01-.455.26l-4 1a1 1 0 01-1.213-1.213l1-4a1 1 0 01.26-.455l9.9-9.9a2 2 0 012.828 0z" />
                          </svg>
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteComment(comment._id)}
                          className="flex items-center gap-1 text-xs text-text-secondary hover:text-danger transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Up Next */}
      <div className="w-full md:w-1/3 space-y-1">
        <h3 className="text-base font-semibold border-b border-border pb-3 mb-3">Up Next</h3>
        {upNextVideos.map((v) => (
          <div
            key={v._id}
            className="flex items-start gap-3 hover:bg-surface p-2 rounded-lg transition-colors group"
          >
            <Link to={`/watch/${v._id}`} className="flex-shrink-0">
              <div className="w-32 h-20 bg-surface-light rounded-lg overflow-hidden">
                <img
                  src={v.thumbnail || 'https://via.placeholder.com/160x90'}
                  alt="Related"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </Link>

            <div className="flex flex-col justify-between flex-1 min-w-0">
              <Link to={`/watch/${v._id}`}>
                <p className="font-medium text-sm text-text-primary line-clamp-2 group-hover:text-primary transition-colors">
                  {v.title}
                </p>
              </Link>
              <p className="text-xs text-text-secondary mt-1">
                {v.owner?.fullName || 'Unknown'}
              </p>

              <Link
                to={`/add-to-playlist/${v._id}`}
                className="text-xs text-primary hover:underline mt-1 w-fit"
              >
                + Add to Playlist
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
      {showShareModal && (
      <ShareVideoModal video={video} onClose={() => setShowShareModal(false)} />
      )}
    </>
  ); 
}