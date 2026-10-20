import mongoose, {isValidObjectId} from "mongoose"
import { v2 as cloudinary } from "cloudinary"
import {Video} from "../models/video.model.js"
import {Like} from "../models/like.model.js"
import {User} from "../models/user.model.js"
import {apierror} from "../utils/apierror.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asynchandler} from "../utils/asynchandler.js"
import {uploadOnCloudinary, getOptimizedUrl} from "../utils/cloudinary.js"
import { Subscription } from "../models/subscriptions.model.js";
import { createNotification } from "./notification.controller.js";
import { emitNotification } from "../socket.js";

const getAllVideospublic = asynchandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;

  const filter = { visibility: "public", ispublished: true };

  const videos = await Video.find(filter)
    .populate('owner', 'fullName avatar userName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Video.countDocuments(filter);

  res.status(200).json(new apiresponse(200, {
    videos,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit)
  }, 'Videos fetched successfully'));
});

const getAllVideos = asynchandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    if (!req.user) {
        throw new apierror(401, "User needs to be logged in");
    }
     // Constructing the match object to filter videos
  const match = {
    ...(query ? { title: { $regex: query, $options: "i" } } : {}), // If query exists, match titles that contain the search term (case-insensitive)
    ...(userId ? { owner:new mongoose.Types.ObjectId(userId) } : {}), // If userId exists, filter videos by that owner
  };

  const videos = await Video.aggregate([
    {
      $match: match, // Filtering videos based on the match criteria
    },

    {
      /*
        $lookup: Joins data from the "users" collection
        - Fetches user details based on the "owner" field in the videos collection
        - This allows us to include user information with each video
      */
      $lookup: {
        from: "users", // Collection to join with
        localField: "owner", // Matching "owner" field in the videos collection
        foreignField: "_id", // Matching "_id" field in the users collection
        as: "videosByOwner", // The resulting user data will be stored under "videosByOwner"
      },
    },

    {
      /*
        $project: Selecting only the necessary fields to return in the response
      */
      $project: {
        videoFile: 1, // Video file link
        thumbnail: 1, // Thumbnail image link
        title: 1, // Video title
        description: 1, // Video description
        duration: 1, // Video duration
        views: 1, // Number of views
        ispublished: 1, // Whether the video is published or not
        owner: {
          $arrayElemAt: ["$videosByOwner", 0], // Extracts the first user object from the array
        },
      },
    },

    {
      /*
        $sort: Sorting videos based on the specified field
        - If sortType is "desc", sort in descending order (-1)
        - If sortType is "asc", sort in ascending order (1)
      */
      $sort: {
        [sortBy]: sortType === "desc" ? -1 : 1,
      },
    },

    {
      /*
        $skip: Skipping records for pagination
        - Formula: (page number - 1) * limit
        - If page = 2 and limit = 10, skips (2-1) * 10 = 10 records
      */
      $skip: (page - 1) * parseInt(limit),
    },

    {
      /*
        $limit: Limits the number of results per page
        - Ensures that the number of results does not exceed the "limit" value
      */
      $limit: parseInt(limit),
    },
  ]);

  // If no videos are found, throw an error
  // if (!videos?.length) {
  //   throw new apierror(404, "Videos are not found");
  // }

  // Sending the response with a success message
  return res
    .status(200)
    .json(new apiresponse(200, videos, "Videos fetched successfully"));
    
})

// NEW: issues a short-lived signed upload ticket. Sits behind verifyJWT
// (applied in video.routes.js), so only authenticated users can get one —
// this is what closes the "anyone can curl Cloudinary directly" gap that
// the unsigned-preset version had.
const getUploadSignature = asynchandler(async (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);

  // Whatever is listed here MUST exactly match what the frontend sends
  // to Cloudinary in the upload request, or the signature check fails.
  const paramsToSign = {
    timestamp,
    folder: "video-app",
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET // stays server-side, never sent to the client
  );

  return res.status(200).json(new apiresponse(200, {
    signature,
    timestamp,
    folder: "video-app",
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  }, "Upload signature generated"));
});

const publishAVideo = asynchandler(async (req, res) => {
    // Files are uploaded directly to Cloudinary from the browser using the
    // signed ticket from getUploadSignature — the backend only receives
    // the resulting URLs here, never the raw file bytes.
    const { title, description, videoFile, thumbnail } = req.body

    if (!title) {
        throw new apierror(400, "Title should not be empty");
    }
    if (!description) {
        throw new apierror(400, "Description should not be empty");
    }
    if (!videoFile) {
        throw new apierror(400, "Video file URL is required");
    }
    if (!thumbnail) {
        throw new apierror(400, "Thumbnail URL is required");
    }

    const videoDoc = await Video.create({
        videoFile: getOptimizedUrl(videoFile),
        thumbnail: getOptimizedUrl(thumbnail),
        title,
        description,
        owner: req.user?._id,
    });

    if (!videoDoc) {
        throw new apierror(500, "Something went wrong while publishing a video");
    }
    const subscribers = await Subscription.find({ channel: req.user._id }).select("subscriber");
    
    for (const sub of subscribers) {
      const notification = await createNotification({
        recipient: sub.subscriber,
        sender: req.user._id,
        type: "new_video",
        message: `${req.user.fullName} uploaded a new video`,
        video: videoDoc._id,
      });
      if (notification) {
        emitNotification(sub.subscriber, notification);
      }
    }

    return res
        .status(201)
        .json(new apiresponse(201, videoDoc, "Video published Successfully"));
})

const getVideoById = asynchandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apierror(400, "Invalid video ID");
  }

  // FIX: no longer increments view count here — that now happens only
  // via the dedicated /videos/:videoId/view endpoint, called when the
  // video actually finishes playing (see markVideoAsViewed below).
  const video = await Video.findById(videoId)
    .populate("owner", "fullName userName email avatar");

  if (!video) {
    throw new apierror(404, "Video not found");
  }

  const [likeCount, dislikeCount] = await Promise.all([
    Like.countDocuments({ video: videoId, reactionType: "like" }),
    Like.countDocuments({ video: videoId, reactionType: "dislike" }),
  ]);

  let isLikedByCurrentUser = false;
  let isDislikedByCurrentUser = false;
  if (req.user && req.user._id) {
    const reaction = await Like.findOne({ video: videoId, likedBy: req.user._id });
    isLikedByCurrentUser = reaction?.reactionType === "like";
    isDislikedByCurrentUser = reaction?.reactionType === "dislike";
  }

  const videoData = {
    ...video.toObject(),
    likeCount,
    dislikeCount,
    isLikedByCurrentUser,
    isDislikedByCurrentUser,
  };

  return res
    .status(200)
    .json(new apiresponse(200, videoData, "Video fetched successfully"));
});

// NEW: called by the frontend only when the video has actually been watched
// (e.g. onEnded, or crossing ~90% progress). Only counts once per user,
// ever, for this video — refreshing or rewatching never inflates the count.
const markVideoAsViewed = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    throw new apierror(400, "Invalid video ID");
  }
  if (!userId) {
    throw new apierror(401, "User must be logged in");
  }

  // Atomic: the filter only matches if this user ISN'T already in viewedBy,
  // so the $inc only fires once per user, no race condition possible.
  const updated = await Video.findOneAndUpdate(
    { _id: videoId, viewedBy: { $ne: userId } },
    { $inc: { view: 1 }, $addToSet: { viewedBy: userId } },
    { new: true }
  );

  // updated is null if the user had already been counted — that's fine,
  // just return the current view count without incrementing again.
  const video = updated || await Video.findById(videoId);

  if (!video) {
    throw new apierror(404, "Video not found");
  }

  return res
    .status(200)
    .json(new apiresponse(200, { view: video.view }, "View recorded"));
});

const updateVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body;

  // Validate if the provided videoId is a valid MongoDB ObjectId
  if (!isValidObjectId(videoId)) {
    throw new apierror(400, "Invalid video ID");
  }

  // Create an object to hold updateData for updating title, description and thumbnail(thumbnail will be appended later)
  let updateData = { title, description };

  /*
    If a new thumbnail is uploaded:
    - Extract the file path from request.
    - Ensure the file path is valid.
    - Upload the file to Cloudinary.
    - If the upload is successful, update the thumbnail URL.
  */
  if (req.file) {
    const thumbnailLocalPath = req.file.path;

    if (!thumbnailLocalPath) {
      throw new apierror(400, "Thumbnail file is missing");
    }

    // Upload the thumbnail to Cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    // FIX: changed thumbnail.url to thumbnail?.url — uploadOnCloudinary returns null
    // on failure, and null.url would crash instead of hitting this clean error message.
    if (!thumbnail?.url) {
      throw new apierror(400, "Error while uploading thumbnail");
    }

    // Add the new thumbnail URL to the updateData, optimized + HTTPS
    updateData.thumbnail = getOptimizedUrl(thumbnail.secure_url);
  }

  /*
    Update the video document in the database:
    - `findByIdAndUpdate` searches for the video by its ID.
    - `$set: updateData` updates only the provided fields.
    - `{ new: true, runValidators: true }`
      - `new: true` returns the updated document instead of the old one.
      - `runValidators: true` ensures data validation rules are applied.
  */
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  // If the video is not found, return error.
  if (!updatedVideo) {
    throw new apierror(404, "Video not found");
  }

  // Send a success response with the updated video details.
  return res
    .status(200)
    .json(new apiresponse(200, updatedVideo, "Video updated successfully"));

})

const deleteVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!isValidObjectId(videoId)) {
        throw new apierror(400, "Invalid video ID");
      }
    
      /*
            Delete the video from the database.
        - `findByIdAndDelete(videoId)`: Finds a video by its ID and removes it.
        - If the video does not exist, `deletedVideo` will be null.
      */
      const deletedVideo = await Video.findByIdAndDelete(videoId);
    
      // If no video was found to delete, return a 404 error.
      if (!deletedVideo) {
        throw new apierror(404, "Video not found");
      }
    
      // Send a success response with the deleted video details.
      return res
        .status(200)
        .json(new apiresponse(200, deletedVideo, "Video deleted successfully"));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    getAllVideospublic,
    getUploadSignature,
    markVideoAsViewed
}