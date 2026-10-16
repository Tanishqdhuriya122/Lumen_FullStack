import axios from "axios";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const GIPHY_BASE_URL = "https://api.giphy.com/v1/gifs";

// Search GIFs by keyword — this is what powers the GIF picker's search bar
const searchGifs = asynchandler(async (req, res) => {
  const { q, limit = 20, offset = 0 } = req.query;

  if (!q || q.trim() === "") {
    throw new apierror(400, "Search query is required");
  }

  try {
    const response = await axios.get(`${GIPHY_BASE_URL}/search`, {
      params: {
        api_key: process.env.GIPHY_API_KEY, // stays server-side, never sent to frontend
        q,
        limit,
        offset,
        rating: "pg-13", // keeps results reasonably safe-for-work
      },
    });

    // Trim down Giphy's (large) response to just what the frontend needs —
    // smaller payload, faster to render
    const gifs = response.data.data.map((gif) => ({
      id: gif.id,
      title: gif.title,
      previewUrl: gif.images.fixed_width_small.url, // small, for the picker grid
      fullUrl: gif.images.original.url, // full quality, for when it's actually sent
    }));

    return res
      .status(200)
      .json(new apiresponse(200, gifs, "GIFs fetched successfully"));
  } catch (error) {
    console.error("Giphy API error:", error.message);
    throw new apierror(502, "Failed to fetch GIFs from Giphy");
  }
});

// Trending GIFs — shown by default when the picker first opens, before the
// user types anything
const getTrendingGifs = asynchandler(async (req, res) => {
  const { limit = 20 } = req.query;

  try {
    const response = await axios.get(`${GIPHY_BASE_URL}/trending`, {
      params: {
        api_key: process.env.GIPHY_API_KEY,
        limit,
        rating: "pg-13",
      },
    });

    const gifs = response.data.data.map((gif) => ({
      id: gif.id,
      title: gif.title,
      previewUrl: gif.images.fixed_width_small.url,
      fullUrl: gif.images.original.url,
    }));

    return res
      .status(200)
      .json(new apiresponse(200, gifs, "Trending GIFs fetched successfully"));
  } catch (error) {
    console.error("Giphy API error:", error.message);
    throw new apierror(502, "Failed to fetch trending GIFs");
  }
});

export { searchGifs, getTrendingGifs };