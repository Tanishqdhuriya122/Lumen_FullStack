import { asynchandler } from "../utils/asynchandler.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/ApiResponse.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
// import { ApiError } from "../utils/apierror.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
import { searchService } from "../services/searchService.js";


export const searchVideos = asynchandler(async (req, res) => {
  const { query, sortBy, duration, uploadDate, page, limit } = req.query;

  const results = await searchService.searchVideos({
    query,
    sortBy,
    duration,
    uploadDate,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, results, "Videos retrieved successfully"));
});

export const searchUsers = asynchandler(async (req, res) => {
  const { query, page, limit } = req.query;

  const results = await searchService.searchUsers({
    query,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, results, "Users retrieved successfully"));
});

export const searchTweets = asynchandler(async (req, res) => {
  const { query, page, limit } = req.query;

  const results = await searchService.searchTweets({
    query,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, results, "Tweets retrieved successfully"));
});

export const getSearchSuggestions = asynchandler(async (req, res) => {
  const { query, limit } = req.query;

  const suggestions = await searchService.getSearchSuggestions({
    query,
    limit: parseInt(limit) || 10,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, suggestions, "Suggestions retrieved successfully"));
});

export const universalSearch = asynchandler(async (req, res) => {
  const { query, page, limit } = req.query;

  const results = await searchService.universalSearch({
    query,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, results, "Search results retrieved successfully"));
});


// const search = asyncHandler(async (req, res) => {
//     const { q } = req.query;
  
//     if (!q || q.trim() === "") {
//         throw new ApiError(
//             400,
//             "search query is required"
//           );
//     }
  
//     const regex = new RegExp(q, "i"); // Case-insensitive match
  
//     const users = await User.find({ fullName: regex }).select("fullName avatar _id userName");
//     const videos = await Video.find({ title: regex }).select("title thumbnail _id");
  
//     return res.status(200).json(
//       new ApiResponse(200, { users, videos }, "Search results fetched successfully")
//     );
//   });
  
// const search = asynchandler(async (req, res) => {
//     const { q, page = 1, limit = 20 } = req.query;
  
//     if (!q || q.trim() === "") {
//         throw new apierror(400, "search query is required");
//     }
  
//     const regex = new RegExp(q, "i");
//     const skip = (page - 1) * limit;

//     const [users, videos] = await Promise.all([
//       User.find({ fullName: regex })
//         .select("fullName avatar _id userName")
//         .skip(skip)
//         .limit(parseInt(limit)),
//       Video.find({ title: regex, visibility: "public", ispublished: true })
//         .select("title thumbnail _id")
//         .skip(skip)
//         .limit(parseInt(limit))
//     ]);
  
//     return res.status(200).json(
//       new apiresponse(200, { users, videos }, "Search results fetched successfully")
//     );
// });
const search = asynchandler(async (req, res) => {
    const { q, page = 1, limit = 20 } = req.query;
  
    if (!q || q.trim() === "") {
        throw new apierror(400, "search query is required");
    }
  
    const regex = new RegExp(q, "i");
    const skip = (page - 1) * limit;

    const [users, videos] = await Promise.all([
      User.find({ fullName: regex })
        .select("fullName avatar _id userName")
        .skip(skip)
        .limit(parseInt(limit)),
      Video.find({
        $or: [
          { title: regex },
          { description: regex },
          { tags: regex }
        ],
        visibility: "public",
        ispublished: true
      })
        .select("title thumbnail _id")
        .skip(skip)
        .limit(parseInt(limit))
    ]);
  
    return res.status(200).json(
      new apiresponse(200, { users, videos }, "Search results fetched successfully")
    );
});

export  {
    search
  };