import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscriptions.model.js"
import { Tweet } from "../models/tweet.model.js"
import {Like} from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"
import {apierror} from "../utils/apierror.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asynchandler} from "../utils/asynchandler.js"

const getChannelStats = asynchandler(async (req, res) => {
    // Extract the authenticated user's ID (the channel owner)
    const userId = req.user._id;
  
    /*
     Fetch Total Videos Count:
      - Using `countDocuments()` to count all videos where the `owner` field matches `userId`.
      - This tells us how many videos the user has uploaded.
    */
    const totalVideos = await Video.countDocuments({ owner: userId });
  
    if (totalVideos === null || totalVideos === undefined) {
      throw new apierror(
        500,
        "Something went wrong while displaying total videos"
      );
    }
  
    /*
     Fetch Total Subscribers Count:
      - Counting all subscription records where the `channel` field matches `userId`.
      - This gives us the total number of subscribers for the channel.
    */
    const totalSubscribers = await Subscription.countDocuments({
      channel: userId,
    });
  
    if (totalSubscribers === null || totalSubscribers === undefined) {
      throw new apierror(
        500,
        "Something went wrong while displaying total subscribers"
      );
    }
  
    /*
     Counting Total Likes Across All Videos Owned by the User
      - `Video.find({ owner: userId }).distinct("_id")`
        - Fetches all videos owned by the user and gets only their `_id`s (unique video IDs)
      - `$in: [array of video IDs]`
        - Finds all `Like` documents where `video` is in that array (videos owned by the user)
        - Counts them using `countDocuments()`
    */
  
    /*
  
      Example: Imagine you own 3 videos:
      - Video A (ID: 101) with 5 likes
      - Video B (ID: 102) with 3 likes
      - Video C (ID: 103) with 7 likes
      
      How it works:
      1. `Video.find({ owner: userId }).distinct("_id")`
         - Finds all videos you own and extracts their unique IDs → [101, 102, 103].
      2. so the result is: `{ $in: [101, 102, 103] }`
         - Now this searches the `Like` collection for documents where `video` is one of those IDs.
      3. `countDocuments()`
         - Counts the total number of likes across your videos → 5 + 3 + 7 = 15 Likes.
    */
  
    const totalVideoLikes = await Like.countDocuments({
      video: {
        $in: await Video.find({ owner: userId }).distinct("_id"),
      },
    });
  
    if (totalVideoLikes === null || totalVideoLikes === undefined) {
      throw new apierror(
        500,
        "Something went wrong while displaying total likes"
      );
    }
  
    /*
     Total Likes on Tweets:
      - Find all tweet IDs that belong to the user.
      - Then, count how many likes exist for those tweets in the `Like` collection.
    */
    const totalTweetLikes = await Like.countDocuments({
      tweet: {
        $in: await Tweet.find({ owner: userId }).distinct("_id"),
      },
    });
  
    if (totalTweetLikes === null || totalTweetLikes === undefined) {
      throw new apierror(
        500,
        "Something went wrong while displaying total tweet likes"
      );
    }
  
    
  
  
    /*
       Summing Up Total Views for All Videos Owned by the User
      - `$match: { owner: userId }` → Filters only videos owned by the user
  
      - ` in the $group:
        - `_id: null` means we're returning a single document and not grouping by any field
        - `$sum: "$views"` adds up all `views` field values across the matched videos
        
      - `totalViews[0]?.totalViews || 0`
        - MongoDB aggregation returns an array, so we access the first element (`totalViews[0]`)
    
    */
  
    /*
      
      Example: Suppose your videos have the following views:
      - Video A (101) → 1000 views
      - Video B (102) → 2500 views
      - Video C (103) → 4000 views
      
      How it works:
      1. `{ $match: { owner: userId } }`
         - Filters only YOUR videos in the `Video` collection.
      2. `{ $group: { _id: null, totalViews: { $sum: "$views" } } }`
         - Groups all matched videos into one result.
         - `$sum: "$views"` adds up all `views` fields → 1000 + 2500 + 4000 = 7500 Views.
    */
  
         const totalViews = await Video.aggregate([
            { $match: { owner: userId } },
            {
              $group: {
                _id: null,
                totalViews: { $sum: "$view" },  // 👈 correct field name
              },
            },
          ]);
  
    if (totalViews === null || totalViews === undefined) {
      throw new apierror(
        500,
        "Something went wrong while displaying total views"
      );
    }
  
    res.status(200).json(
      new apiresponse(
        200,
        {
          totalVideos,
          totalSubscribers,
          totalVideoLikes,
          totalTweetLikes,
         
          totalViews: totalViews[0]?.totalViews || 0, // Default to 0 if no views are found
        },
        "Channel stats fetched successfully"
      )
    );
  
    /*
  
   Querying Channel Stats - Notes:
  
    👉 Why `Video.find({ owner: userId }).distinct("_id")`?
       - Finds all videos owned by the user but returns only their _id's.
       - We use this to filter likes (`$in`) instead of querying all videos first.
  
    👉 Why `$in: await Video.find(...).distinct("_id")`?
       - Makes sure we're only counting likes for videos owned by the user.
       
  */
  });
  
  const getChannelVideos = asynchandler(async (req, res) => {
    const userId = req.user._id;
  
    const videos = await Video.aggregate([
        {
          $match: { owner: userId },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $lookup: {
            from: "likes",           // collection name in MongoDB
            localField: "_id",       // _id of Video
            foreignField: "video",   // field in likes that references Video
            as: "likes",
          },
        },
        {
          $addFields: {
            likeCount: { $size: "$likes" },
          },
        },
        {
          $project: {
            likes: 0,
            __v: 0,
          },
        },
      ]);
  
    if (!videos || videos.length === 0) {
      throw new apierror(404, "No videos found for this channel");
    }
  
    res
      .status(200)
      .json(new apiresponse(200, videos, "Channel videos fetched successfully"));
  });

  const getLikeTimeline = asynchandler(async (req, res) => {
    const userId = req.user._id;
  
    const videoIds = await Video.find({ owner: userId }).distinct("_id");
    const tweetIds = await Tweet.find({ owner: userId }).distinct("_id");
  
    const videoLikes = await Like.find({ video: { $in: videoIds } }).select("createdAt");
    const tweetLikes = await Like.find({ tweet: { $in: tweetIds } }).select("createdAt");
  
    const allLikes = [...videoLikes, ...tweetLikes].map((like) => ({
      time: like.createdAt,
    }));
  
    res.status(200).json(
      new apiresponse(200, allLikes, "Like timeline data fetched successfully")
    );
  });
  
  export { getChannelStats, getChannelVideos,getLikeTimeline };