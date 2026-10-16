// Converts a stored Cloudinary video URL into its adaptive-streaming (HLS)
// manifest URL. Strips any existing transformation (e.g. q_auto,f_auto from
// getOptimizedUrl) rather than chaining it with sp_auto — Cloudinary only
// reliably supports a limited set of transformations combined with sp_auto,
// and the streaming profile already handles per-rendition quality/compression
// on its own, so the old transformation isn't needed here anyway.
export const getHlsUrl = (videoUrl) => {
  if (!videoUrl) return videoUrl;

  const uploadMarker = '/upload/';
  const uploadIndex = videoUrl.indexOf(uploadMarker);
  if (uploadIndex === -1) return videoUrl; // not a recognizable Cloudinary URL

  const base = videoUrl.slice(0, uploadIndex + uploadMarker.length);
  const afterUpload = videoUrl.slice(uploadIndex + uploadMarker.length);

  // Find where the version segment (v followed by digits) starts — everything
  // before that is the old transformation chain, which gets dropped entirely.
  const versionMatch = afterUpload.match(/v\d+\/.*/);
  const pathFromVersion = versionMatch ? versionMatch[0] : afterUpload;

  const rebuilt = `${base}sp_auto/${pathFromVersion}`;
  return rebuilt.replace(/\.[^/.]+$/, '.m3u8');
};