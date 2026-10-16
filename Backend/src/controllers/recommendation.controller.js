import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { recommendationService } from "../services/recommendationService.js";

export const getPersonalizedRecommendations = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const recommendations = await recommendationService.getPersonalizedRecommendations(
    req.user._id,
    {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, recommendations, "Recommendations retrieved successfully")
    );
});

export const getTrendingVideos = asyncHandler(async (req, res) => {
  const { page, limit, timeFrame } = req.query;

  const trendingVideos = await recommendationService.getTrendingVideos({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    timeFrame: timeFrame || "week",
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, trendingVideos, "Trending videos retrieved successfully")
    );
});

export const getRelatedVideos = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { limit } = req.query;

  const relatedVideos = await recommendationService.getRelatedVideos(videoId, {
    limit: parseInt(limit) || 10,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, relatedVideos, "Related videos retrieved successfully")
    );
});

export const getSubscriptionFeed = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const feedVideos = await recommendationService.getSubscriptionFeed(req.user._id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, feedVideos, "Subscription feed retrieved successfully")
    );
});

export const getPopularByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page, limit } = req.query;

  const videos = await recommendationService.getPopularByCategory(category, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos retrieved successfully"));
});
