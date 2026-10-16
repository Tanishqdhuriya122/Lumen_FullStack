import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {apierror} from "../utils/apierror.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asynchandler} from "../utils/asynchandler.js"
import {uploadOnCloudinary, getOptimizedUrl} from "../utils/cloudinary.js"


const createPlaylist = asynchandler(async (req, res) => {
    const { name, description = "" } = req.body;
  
    if (!name) {
      throw new apierror(400, "Name is required");
    }

    // Cover image is optional — if provided, upload it the same way avatars
    // and video thumbnails are handled elsewhere in this app.
    let coverImage = "";
    if (req.file?.path) {
      const uploaded = await uploadOnCloudinary(req.file.path);
      if (uploaded) {
        coverImage = getOptimizedUrl(uploaded.secure_url);
      }
    }
  
    const playlist = await Playlist.create({
      name,
      description,
      coverImage,
      owner: req.user._id,
    });
  
    if (!playlist) {
      throw new apierror(500, "Something went wrong while creating the playlist");
    }
  
    return res
      .status(201)
      .json(new apiresponse(201, playlist, "Playlist created successfully"));
  

  });
  
  const getUserPlaylists = asynchandler(async (req, res) => {
    
    const { userId } = req.params;
  
    
    if (!isValidObjectId(userId)) {
      throw new apierror(400, "Invalid user ID");
    }
  
   
    const playlists = await Playlist.find({ owner: userId }).populate({
        path: "videos",
        select: "_id title thumbnail",
      });
  
    return res
      .status(200)
      .json(
        new apiresponse(200, playlists, "User playlists fetched successfully")
      );

  });
  
  const getPlaylistById = asynchandler(async (req, res) => {
    const { playlistId } = req.params;
  
    if (!isValidObjectId(playlistId)) {
      throw new apierror(400, "Invalid playlist ID");
    }
  
    const playlist = await Playlist.findById(playlistId).populate("videos");

    if (!playlist) {
      throw new apierror(404, "Playlist not found");
    }

    return res
      .status(200)
      .json(new apiresponse(200, playlist, "Playlist fetched successfully"));
  

  });
  
  const addVideoToPlaylist = asynchandler(async (req, res) => {
   
    const { playlistId, videoId } = req.params;
  
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new apierror(400, "Invalid playlist or video ID");
    }
  
    const updatedPlaylist = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId),
        },
      },
      {
        $addFields: {
          videos: {
            $setUnion: ["$videos", [new mongoose.Types.ObjectId(videoId)]],
          },
        },
      },
      {
        $merge: {
          into: "playlists",
        },
      },
    ]);
  
    if (!updatedPlaylist) {
      throw new apierror(404, "Playlist not found or video already added");
    }
  
   
    return res
      .status(200)
      .json(
        new apiresponse(
          200,
          updatedPlaylist,
          "Video added to playlist successfully"
        )
      );
  });
  
  const removeVideoFromPlaylist = asynchandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
  
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new apierror(400, "Invalid playlist or video ID");
    }
  
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $pull: {
          videos: new mongoose.Types.ObjectId(videoId),
        },
      },
      {
        new: true,
      }
    );
  
    if (!updatedPlaylist) {
      throw new apierror(404, "Playlist not found");
    }
  
    return res
      .status(200)
      .json(
        new apiresponse(
          200,
          updatedPlaylist,
          "Video removed from playlist successfully"
        )
      );
  

  });
  
  const deletePlaylist = asynchandler(async (req, res) => {
    const { playlistId } = req.params;
  
    if (!isValidObjectId(playlistId)) {
      throw new apierror(400, "Invalid playlist ID");
    }
  
    const deletedPlaylistDoc = await Playlist.findByIdAndDelete(playlistId);
  
    if (!deletedPlaylistDoc) {
      throw new apierror(404, "Playlist not found");
    }
  
    return res
      .status(200)
      .json(
        new apiresponse(200, deletedPlaylistDoc, "Playlist deleted successfully")
      );
  
  });
  
  const updatePlaylist = asynchandler(async (req, res) => {
 
    const { playlistId } = req.params;
    const { name, description } = req.body;
  
    if (!isValidObjectId(playlistId)) {
      throw new apierror(400, "Invalid playlist ID");
    }
  
    if (!name) {
      throw new apierror(400, "Name is required");
    }

    const updateData = { name, description: description ?? "" };

    // Allows replacing the cover image on an edit, same pattern as create.
    if (req.file?.path) {
      const uploaded = await uploadOnCloudinary(req.file.path);
      if (uploaded) {
        updateData.coverImage = getOptimizedUrl(uploaded.secure_url);
      }
    }
  
    const updatedPlaylistDoc = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $set: updateData,
      },
      {
        new: true,
      }
    );
  
    if (!updatedPlaylistDoc) {
      throw new apierror(404, "Playlist not found");
    }
  
    return res
      .status(200)
      .json(
        new apiresponse(200, updatedPlaylistDoc, "Playlist updated successfully")
      );
  
 
  });
  
  export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
  };