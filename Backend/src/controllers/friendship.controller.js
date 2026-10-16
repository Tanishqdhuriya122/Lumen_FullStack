import mongoose, { isValidObjectId } from "mongoose";
import { Friendship } from "../models/friendship.model.js";
import { User } from "../models/user.model.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { createNotification } from "./notification.controller.js";
import { emitNotification } from "../socket.js";

// Send a friend request
const sendFriendRequest = asynchandler(async (req, res) => {
  const { recipientId } = req.params;
  const requesterId = req.user._id;

  if (!isValidObjectId(recipientId)) {
    throw new apierror(400, "Invalid user ID");
  }

  if (requesterId.toString() === recipientId.toString()) {
    throw new apierror(400, "You cannot send a friend request to yourself");
  }

  const recipientExists = await User.findById(recipientId);
  if (!recipientExists) {
    throw new apierror(404, "User not found");
  }

  // Check both directions — maybe the OTHER person already sent a request to US
  const existing = await Friendship.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId },
    ],
  });

  if (existing) {
    if (existing.status === "accepted") {
      throw new apierror(409, "You are already friends with this user");
    }
    if (existing.status === "pending") {
      // They already sent us a request — auto-accept instead of creating a duplicate
      if (existing.requester.toString() === recipientId.toString()) {
        existing.status = "accepted";
        await existing.save();
        return res
          .status(200)
          .json(new apiresponse(200, existing, "Friend request accepted"));
      }
      throw new apierror(409, "Friend request already sent");
    }
    // status === "rejected" — allow re-sending by flipping it back to pending
    existing.status = "pending";
    existing.requester = requesterId;
    existing.recipient = recipientId;
    await existing.save();
    return res
      .status(200)
      .json(new apiresponse(200, existing, "Friend request sent"));
  }

  const friendRequest = await Friendship.create({
    requester: requesterId,
    recipient: recipientId,
    status: "pending",
  });
  const notification = await createNotification({
    recipient: recipientId,
    sender: requesterId,
    type: "friend_request",
    message: `${req.user.fullName} sent you a friend request`,
  });
  if (notification) {
    emitNotification(recipientId, notification);
  }

  return res
    .status(201)
    .json(new apiresponse(201, friendRequest, "Friend request sent"));
});

// Accept a pending friend request (only the recipient can accept)
const acceptFriendRequest = asynchandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(requestId)) {
    throw new apierror(400, "Invalid request ID");
  }

  const request = await Friendship.findById(requestId);
  if (!request) {
    throw new apierror(404, "Friend request not found");
  }
  if (request.recipient.toString() !== userId.toString()) {
    throw new apierror(403, "You are not authorized to accept this request");
  }
  if (request.status !== "pending") {
    throw new apierror(400, "This request is no longer pending");
  }

  request.status = "accepted";
  await request.save();

  return res
    .status(200)
    .json(new apiresponse(200, request, "Friend request accepted"));
});

// Reject a pending friend request (only the recipient can reject)
const rejectFriendRequest = asynchandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(requestId)) {
    throw new apierror(400, "Invalid request ID");
  }

  const request = await Friendship.findById(requestId);
  if (!request) {
    throw new apierror(404, "Friend request not found");
  }
  if (request.recipient.toString() !== userId.toString()) {
    throw new apierror(403, "You are not authorized to reject this request");
  }

  request.status = "rejected";
  await request.save();

  return res
    .status(200)
    .json(new apiresponse(200, request, "Friend request rejected"));
});

// Remove an existing friend (either person can do this)
const removeFriend = asynchandler(async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(friendId)) {
    throw new apierror(400, "Invalid user ID");
  }

  const deleted = await Friendship.findOneAndDelete({
    status: "accepted",
    $or: [
      { requester: userId, recipient: friendId },
      { requester: friendId, recipient: userId },
    ],
  });

  if (!deleted) {
    throw new apierror(404, "Friendship not found");
  }

  return res
    .status(200)
    .json(new apiresponse(200, {}, "Friend removed"));
});

// Get all ACCEPTED friends for the logged-in user
const getFriendsList = asynchandler(async (req, res) => {
  const userId = req.user._id;

  const friendships = await Friendship.find({
    status: "accepted",
    $or: [{ requester: userId }, { recipient: userId }],
  })
    .populate("requester", "fullName avatar userName")
    .populate("recipient", "fullName avatar userName");

  // Each row has a requester and recipient — we want "whoever ISN'T me"
  const friends = friendships.map((f) => {
    const isRequester = f.requester._id.toString() === userId.toString();
    return isRequester ? f.recipient : f.requester;
  });

  return res
    .status(200)
    .json(new apiresponse(200, friends, "Friends list fetched successfully"));
});

// Get incoming PENDING requests (people who want to friend ME)
const getPendingRequests = asynchandler(async (req, res) => {
  const userId = req.user._id;

  const requests = await Friendship.find({
    recipient: userId,
    status: "pending",
  }).populate("requester", "fullName avatar userName");

  return res
    .status(200)
    .json(new apiresponse(200, requests, "Pending requests fetched successfully"));
});

// Search users by name/username to add as friends (excludes yourself)
const searchUsersToAdd = asynchandler(async (req, res) => {
  const { q } = req.query;
  const userId = req.user._id;

  if (!q || q.trim() === "") {
    throw new apierror(400, "Search query is required");
  }

  const regex = new RegExp(q, "i");

  const users = await User.find({
    _id: { $ne: userId },
    $or: [{ fullName: regex }, { userName: regex }],
  }).select("fullName avatar userName");

  // Attach each result's relationship status (none / pending-sent / pending-received / friends)
  // so the frontend can show the right button (Add / Pending / Accept / Friends)
  const friendships = await Friendship.find({
    $or: [{ requester: userId }, { recipient: userId }],
  });

  const usersWithStatus = users.map((u) => {
    const relation = friendships.find(
      (f) =>
        f.requester.toString() === u._id.toString() ||
        f.recipient.toString() === u._id.toString()
    );

    let relationStatus = "none";
    if (relation) {
      if (relation.status === "accepted") relationStatus = "friends";
      else if (relation.status === "pending") {
        relationStatus =
          relation.requester.toString() === userId.toString()
            ? "pending-sent"
            : "pending-received";
      }
    }

    return { ...u.toObject(), relationStatus };
  });

  return res
    .status(200)
    .json(new apiresponse(200, usersWithStatus, "Users fetched successfully"));
});

export {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriendsList,
  getPendingRequests,
  searchUsersToAdd,
};