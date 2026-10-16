import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // "text" = plain message, "emoji" = a message that's purely emoji (optional
    // distinction, mainly useful if you ever want to render emoji-only messages
    // larger, like WhatsApp does), "gif" = a Giphy GIF, "video_share" = a shared
    // video from your platform, "image" = an uploaded image
    type: {
      type: String,
      enum: ["text", "gif", "video_share", "image"],
      default: "text",
    },
    content: {
      type: String, // the text itself, OR the GIF/image URL, depending on `type`
      required: true,
    },
    // Only populated when type === "video_share" — lets the chat bubble render
    // a rich preview card (thumbnail + title) instead of just a raw link
    sharedVideo: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Speeds up "get all messages between user A and user B, sorted by time" —
// the core query every chat window will run.
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);