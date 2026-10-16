import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["new_video", "friend_request", "new_note"],
      required: true,
    },
    // Only populated depending on type — e.g. video for "new_video",
    // left null for "friend_request" and "new_note"
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      default: null,
    },
    message: {
      type: String, // e.g. "uploaded a new video", "sent you a friend request", "posted a new note"
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);