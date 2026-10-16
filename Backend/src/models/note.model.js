import mongoose, { Schema } from "mongoose";

const noteSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one note per user — posting a new one replaces the old
    },
    content: {
      type: String,
      required: true,
      maxlength: 60, // keeps it genuinely short, like a one-line status
    },
  },
  { timestamps: true }
);

export const Note = mongoose.model("Note", noteSchema);