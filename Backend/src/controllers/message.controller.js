import mongoose, { isValidObjectId } from "mongoose";
import { Message } from "../models/message.model.js";
import { Friendship } from "../models/friendship.model.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";

// Helper: confirms two users are actually friends before letting them message
// each other — prevents strangers from DMing people who never accepted them.
const areFriends = async (userIdA, userIdB) => {
  const friendship = await Friendship.findOne({
    status: "accepted",
    $or: [
      { requester: userIdA, recipient: userIdB },
      { requester: userIdB, recipient: userIdA },
    ],
  });
  return !!friendship;
};

// Get full message history between the logged-in user and a specific friend
const getConversation = asynchandler(async (req, res) => {
  const { friendId } = req.params;
  const { page = 1, limit = 30 } = req.query;
  const userId = req.user._id;

  if (!isValidObjectId(friendId)) {
    throw new apierror(400, "Invalid user ID");
  }

  const friends = await areFriends(userId, friendId);
  if (!friends) {
    throw new apierror(403, "You can only view conversations with friends");
  }

  const skip = (page - 1) * limit;

  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: friendId },
      { sender: friendId, receiver: userId },
    ],
  })
    .populate("sharedVideo", "title thumbnail _id")
    .sort({ createdAt: -1 }) // newest first for pagination...
    .skip(skip)
    .limit(parseInt(limit));

  // ...then reverse so the frontend can render oldest-to-newest, top-to-bottom,
  // like a normal chat window
  messages.reverse();

  // Mark all messages FROM the friend TO me as read, since I'm now viewing them
  await Message.updateMany(
    { sender: friendId, receiver: userId, read: false },
    { $set: { read: true } }
  );

  return res
    .status(200)
    .json(new apiresponse(200, messages, "Conversation fetched successfully"));
});

// Send a message — this is a REST fallback / persistence layer. The actual
// real-time delivery happens via Socket.io (see socket.js), but we always
// save to MongoDB here too so chat history survives refreshes/reconnects.
const sendMessage = asynchandler(async (req, res) => {
  const { receiverId } = req.params;
  const { content, type = "text", sharedVideo = null } = req.body;
  const senderId = req.user._id;

  if (!isValidObjectId(receiverId)) {
    throw new apierror(400, "Invalid receiver ID");
  }
  if (!content || content.trim() === "") {
    throw new apierror(400, "Message content is required");
  }

  const friends = await areFriends(senderId, receiverId);
  if (!friends) {
    throw new apierror(403, "You can only message friends");
  }

  const message = await Message.create({
    sender: senderId,
    receiver: receiverId,
    content,
    type,
    sharedVideo,
  });

  const populatedMessage = await Message.findById(message._id).populate(
    "sharedVideo",
    "title thumbnail _id"
  );

  return res
    .status(201)
    .json(new apiresponse(201, populatedMessage, "Message sent"));
});

// Get unread message count per friend — powers the unread badge in the UI
const getUnreadCounts = asynchandler(async (req, res) => {
  const userId = req.user._id;

  const unread = await Message.aggregate([
    { $match: { receiver: new mongoose.Types.ObjectId(userId), read: false } },
    { $group: { _id: "$sender", count: { $sum: 1 } } },
  ]);

  return res
    .status(200)
    .json(new apiresponse(200, unread, "Unread counts fetched successfully"));
});

export { getConversation, sendMessage, getUnreadCounts, areFriends };