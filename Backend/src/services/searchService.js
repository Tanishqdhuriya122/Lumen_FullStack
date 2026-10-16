// src/services/searchService.js
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Tweet } from "../models/tweet.model.js";
import { apierror } from "../utils/apierror.js";
// import { ApiResponse } from "../utils/apiresponse.js";

class SearchService {
  /**
   * Advanced video search with filters
   */
  async searchVideos({
    query,
    sortBy = "relevance", // relevance, views, date, duration
    duration, // short (<4min), medium (4-20min), long (>20min)
    uploadDate, // today, week, month, year
    page = 1,
    limit = 20,
  }) {
    const matchStage = {};
    
    // Text search
    if (query) {
      matchStage.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } },
      ];
    }

    // Published videos only
    matchStage.isPublished = true;

    // Duration filter
    if (duration) {
      switch (duration) {
        case "short":
          matchStage.duration = { $lt: 240 }; // less than 4 minutes
          break;
        case "medium":
          matchStage.duration = { $gte: 240, $lte: 1200 }; // 4-20 minutes
          break;
        case "long":
          matchStage.duration = { $gt: 1200 }; // more than 20 minutes
          break;
      }
    }

    // Upload date filter
    if (uploadDate) {
      const now = new Date();
      const dateMap = {
        today: new Date(now.setHours(0, 0, 0, 0)),
        week: new Date(now.setDate(now.getDate() - 7)),
        month: new Date(now.setMonth(now.getMonth() - 1)),
        year: new Date(now.setFullYear(now.getFullYear() - 1)),
      };
      
      if (dateMap[uploadDate]) {
        matchStage.createdAt = { $gte: dateMap[uploadDate] };
      }
    }

    // Sorting
    let sortStage = {};
    switch (sortBy) {
      case "views":
        sortStage = { views: -1 };
        break;
      case "date":
        sortStage = { createdAt: -1 };
        break;
      case "duration":
        sortStage = { duration: -1 };
        break;
      case "relevance":
      default:
        // If query exists, sort by text score, otherwise by views
        if (query) {
          sortStage = { score: { $meta: "textScore" }, views: -1 };
        } else {
          sortStage = { views: -1, createdAt: -1 };
        }
    }

    const aggregationPipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$owner" },
      { $sort: sortStage },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          title: 1,
          description: 1,
          thumbnail: 1,
          duration: 1,
          views: 1,
          createdAt: 1,
          owner: 1,
          tags: 1,
        },
      },
    ];

    const videos = await Video.aggregate(aggregationPipeline);

    // Get total count for pagination
    const totalVideos = await Video.countDocuments(matchStage);

    return {
      videos,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalVideos / limit),
        totalResults: totalVideos,
        hasMore: page * limit < totalVideos,
      },
    };
  }

  /**
   * Search users/channels
   */
  async searchUsers({ query, page = 1, limit = 20 }) {
    const searchRegex = new RegExp(query, "i");
    
    const users = await User.aggregate([
      {
        $match: {
          $or: [
            { username: searchRegex },
            { fullName: searchRegex },
          ],
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $addFields: {
          subscribersCount: { $size: "$subscribers" },
        },
      },
      { $sort: { subscribersCount: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          username: 1,
          fullName: 1,
          avatar: 1,
          coverImage: 1,
          subscribersCount: 1,
        },
      },
    ]);

    const totalUsers = await User.countDocuments({
      $or: [
        { username: searchRegex },
        { fullName: searchRegex },
      ],
    });

    return {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalResults: totalUsers,
        hasMore: page * limit < totalUsers,
      },
    };
  }

  /**
   * Search tweets
   */
  async searchTweets({ query, page = 1, limit = 20 }) {
    const searchRegex = new RegExp(query, "i");

    const tweets = await Tweet.aggregate([
      {
        $match: {
          content: searchRegex,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$owner" },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "tweet",
          as: "likes",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          content: 1,
          createdAt: 1,
          owner: 1,
          likesCount: 1,
        },
      },
    ]);

    const totalTweets = await Tweet.countDocuments({
      content: searchRegex,
    });

    return {
      tweets,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalTweets / limit),
        totalResults: totalTweets,
        hasMore: page * limit < totalTweets,
      },
    };
  }

  /**
   * Get search suggestions/autocomplete
   */
  async getSearchSuggestions({ query, limit = 10 }) {
    const searchRegex = new RegExp(`^${query}`, "i");

    // Get video title suggestions
    const videoSuggestions = await Video.find(
      { 
        title: searchRegex,
        isPublished: true 
      },
      { title: 1 }
    )
      .limit(limit)
      .lean();

    // Get user suggestions
    const userSuggestions = await User.find(
      {
        $or: [
          { username: searchRegex },
          { fullName: searchRegex },
        ],
      },
      { username: 1, fullName: 1 }
    )
      .limit(5)
      .lean();

    return {
      videos: videoSuggestions.map(v => v.title),
      users: userSuggestions.map(u => ({
        username: u.username,
        fullName: u.fullName,
      })),
    };
  }

  /**
   * Universal search across all content types
   */
  async universalSearch({ query, page = 1, limit = 10 }) {
    const [videos, users, tweets] = await Promise.all([
      this.searchVideos({ query, page, limit: 5 }),
      this.searchUsers({ query, page, limit: 3 }),
      this.searchTweets({ query, page, limit: 2 }),
    ]);

    return {
      videos: videos.videos,
      users: users.users,
      tweets: tweets.tweets,
      hasMore: {
        videos: videos.pagination.hasMore,
        users: users.pagination.hasMore,
        tweets: tweets.pagination.hasMore,
      },
    };
  }
}

export const searchService = new SearchService();