import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {apierror} from "../utils/apierror.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asynchandler} from "../utils/asynchandler.js"

// Shared logic for both like and dislike on a video. `reactionType` is either
// "like" or "dislike", passed in from the two route handlers below.
const toggleVideoReaction = async (videoId, userId, reactionType) => {
    const existing = await Like.findOne({ video: videoId, likedBy: userId });

    if (existing && existing.reactionType === reactionType) {
        // Same reaction clicked again → remove it (un-like / un-dislike)
        await Like.findByIdAndDelete(existing._id);
    } else if (existing) {
        // Opposite reaction exists → switch it (e.g. was disliked, now liking)
        existing.reactionType = reactionType;
        await existing.save();
    } else {
        // No reaction yet → create one
        await Like.create({ video: videoId, likedBy: userId, reactionType });
    }

    const [likeCount, dislikeCount] = await Promise.all([
        Like.countDocuments({ video: videoId, reactionType: "like" }),
        Like.countDocuments({ video: videoId, reactionType: "dislike" }),
    ]);

    const current = await Like.findOne({ video: videoId, likedBy: userId });

    return {
        likeCount,
        dislikeCount,
        isLiked: current?.reactionType === "like",
        isDisliked: current?.reactionType === "dislike",
    };
};

const toggleVideoLike = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
        throw new apierror(400, "Invalid video ID");
    }

    const result = await toggleVideoReaction(videoId, userId, "like");

    return res
        .status(200)
        .json(new apiresponse(200, result, result.isLiked ? "Video liked successfully" : "Video like removed"));
});

// NEW
const toggleVideoDislike = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
        throw new apierror(400, "Invalid video ID");
    }

    const result = await toggleVideoReaction(videoId, userId, "dislike");

    return res
        .status(200)
        .json(new apiresponse(200, result, result.isDisliked ? "Video disliked successfully" : "Video dislike removed"));
});

const toggleTweetLike = asynchandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(tweetId)) {
      throw new apierror(400, "Invalid tweet ID");
    }

    const existingLike = await Like.findOne({
      tweet: tweetId,
      likedBy: userId,
    });

    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);

      const totalLikes = await Like.countDocuments({ tweet: tweetId });

      return res.status(200).json(
        new apiresponse(200, {
          tweetId,
          liked: false,
          totalLikes,
        }, "Tweet unliked successfully")
      );
    }

    await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });

    const totalLikes = await Like.countDocuments({ tweet: tweetId });

    return res.status(201).json(
      new apiresponse(201, {
        tweetId,
        liked: true,
        totalLikes,
      }, "Tweet liked successfully")
    );
});

const getLikedVideos = asynchandler(async (req, res) => {
    try {
      const userId = req.user._id;

      if (!userId) {
        throw new apierror(401, "User not authenticated");
      }

      // FIX: only fetch actual "like" reactions — dislikes shouldn't appear
      // in the user's "Liked Videos" page.
      const likedVideos = await Like.find({
        likedBy: userId,
        video: { $ne: null },
        reactionType: "like",
      })
        .populate({
          path: "video",
          populate: {
            path: "owner",
            select: "fullName avatar",
          },
          select: "_id title videoFile thumbnail createdAt view",
        });

      const validVideos = likedVideos
        .map((like) => like.video)
        .filter((video) => video !== null);

      return res.status(200).json(
        new apiresponse(200, validVideos, "Liked videos fetched successfully")
      );
    } catch (error) {
      throw new apierror(500, "Failed to fetch liked videos");
    }
});

export {
    toggleTweetLike,
    toggleVideoLike,
    toggleVideoDislike,
    getLikedVideos
}