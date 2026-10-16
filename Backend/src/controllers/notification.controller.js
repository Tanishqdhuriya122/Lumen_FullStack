import { Notification } from "../models/notification.model.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";

// Internal helper — called from OTHER controllers (video publish, friend
// request, note update), not exposed as its own route.
const createNotification = async ({ recipient, sender, type, message, video = null }) => {
  // Don't notify yourself (e.g. edge cases where sender === recipient)
  if (recipient.toString() === sender.toString()) return null;

  return Notification.create({ recipient, sender, type, message, video });
};

const getNotifications = asynchandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: userId })
    .populate("sender", "fullName avatar userName")
    .populate("video", "title thumbnail")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

  return res
    .status(200)
    .json(new apiresponse(200, { notifications, unreadCount }, "Notifications fetched successfully"));
});

const markAsRead = asynchandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { read: true } },
    { new: true }
  );

  if (!notification) {
    throw new apierror(404, "Notification not found");
  }

  return res
    .status(200)
    .json(new apiresponse(200, notification, "Notification marked as read"));
});

const markAllAsRead = asynchandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true } }
  );

  return res
    .status(200)
    .json(new apiresponse(200, {}, "All notifications marked as read"));
});

export { createNotification, getNotifications, markAsRead, markAllAsRead };