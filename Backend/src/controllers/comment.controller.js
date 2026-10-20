import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {apierror} from "../utils/apierror.js"
import {apiresponse} from "../utils/apiresponse.js"
import {asynchandler} from "../utils/asynchandler.js"

const getVideoComments = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new apierror(400, "Invalid video ID");
  }

  const videoObjectId = new mongoose.Types.ObjectId(videoId);

  const comments = await Comment.aggregate([
    {
      $match: { video: videoObjectId },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "CommentOnWhichVideo",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "OwnerOfComment",
      },
    },
    {
      $project: {
        content: 1,
        owner: { $arrayElemAt: ["$OwnerOfComment", 0] },
        video: { $arrayElemAt: ["$CommentOnWhichVideo", 0] },
        createdAt: 1,
      },
    },
    {
      $skip: (page - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  // ✅ Always return 200, even if empty
  return res
    .status(200)
    .json(new apiresponse(200, comments, "Comments fetched successfully"));
});

const addComment = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  // const video = await Video.findById(videoId);

  // await notificationService.notifyComment(
  //   videoId,
  //   video.title,
  //   req.user._id,
  //   video.owner,
  //   content
  // );

  if (!isValidObjectId(videoId)) {
    throw new apierror(400, "Invalid video id");
  }

  if (!req.user) {
    throw new apierror(401, "User needs to be logged in");
  }

  if (!content || content.trim().length === 0) {
    throw new apierror(400, "Empty or null comment is not allowed");
  }

  // Create comment
  const addedComment = await Comment.create({
    content,
    owner: req.user._id,
    video: videoId,
  });

  if (!addedComment) {
    throw new apierror(500, "Something went wrong while adding comment");
  }

  // Populate owner for frontend display (name, avatar, etc.)
  const populatedComment = await addedComment.populate("owner", "fullName avatar");

  return res.status(201).json(
    new apiresponse(201, populatedComment, "Comment added successfully")
  );

  
});

const updateComment = asynchandler(async (req, res) => {
    // TODO: update a comment
    const {commentId}=req.params
    const {content}=req.body
    if(!isValidObjectId(commentId)){
        throw new apierror(400,"Invalid video Id")
    }
    if (!req.user) {
        throw new apierror(401, "User must be logged in");
      }
    if(!content ||content.length==0){
        throw new apierror(400,"Comment can't be empty")
    }
    const updatedComment = await Comment.findOneAndUpdate(
        {
          _id: commentId,
          owner: req.user._id, // Ensures users can only update their own comments
        },
        {
          $set: {
            content,
          },
        },
        { new: true } // Return the updated comment instead of the old one
      );
      if (!updatedComment) {
        throw new apierror(500, "Something went wrong while updating the comment");
      }
    
      /*
        Sending a success response
        - If everything works, return the updated comment with a success message
      */
      return res
        .status(200)
        .json(new apiresponse(200, updatedComment, "Comment successfully updated"));
})

const deleteComment = asynchandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    // Check if the commentId is a valid MongoDB ObjectId
    if (!isValidObjectId(commentId)) {
      throw new apierror(400, "Invalid comment ID");
    }
  
    // Check if the user is logged in
    if (!req.user) {
      throw new apierror(401, "User must be logged in");
    }
  
    /*
      Find the comment by its ID and ensure that the logged-in user is the owner
      - Only the owner of the comment should be able to delete it
      - findOneAndDelete() finds the comment and removes it in one step
    */
    const deletedCommentDoc = await Comment.findOneAndDelete({
      _id: commentId,
      owner: req.user._id, // Ensuring only the owner can delete their comment
    });
  
    // If no comment was found or deleted, throw an error
    if (!deletedCommentDoc) {
      throw new apierror(500, "Something went wrong while deleting the comment");
    }
  
    /*
      Successfully deleted the comment, return a response
      - Send back the deleted comment data as a confirmation
    */
    return res
      .status(200)
      .json(
        new apiresponse(200, deletedCommentDoc, "Comment deleted successfully")
      );
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }