import { Note } from "../models/note.model.js";
import { Subscription } from "../models/subscriptions.model.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { createNotification } from "./notification.controller.js";
import { emitNotification } from "../socket.js";

// Create or replace your own note — one per user, enforced by the unique
// index on `owner` in the model.
const upsertNote = asynchandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user._id;

  if (!content || content.trim() === "") {
    throw new apierror(400, "Note content is required");
  }
  if (content.length > 60) {
    throw new apierror(400, "Note must be 60 characters or fewer");
  }

  const note = await Note.findOneAndUpdate(
    { owner: userId },
    { $set: { content: content.trim() } },
    { new: true, upsert: true }
  );

  // Notify subscribers that a new note was posted
  const subscribers = await Subscription.find({ channel: userId }).select("subscriber");

  for (const sub of subscribers) {
    const notification = await createNotification({
      recipient: sub.subscriber,
      sender: userId,
      type: "new_note",
      message: `${req.user.fullName} posted a new note`,
    });
    if (notification) {
      emitNotification(sub.subscriber, notification);
    }
  }

  return res
    .status(200)
    .json(new apiresponse(200, note, "Note posted successfully"));
});

// Delete your own note
const deleteNote = asynchandler(async (req, res) => {
  const userId = req.user._id;

  const deleted = await Note.findOneAndDelete({ owner: userId });
  if (!deleted) {
    throw new apierror(404, "You don't have a note to delete");
  }

  return res
    .status(200)
    .json(new apiresponse(200, {}, "Note deleted"));
});

// Fetch notes from everyone the logged-in user is subscribed to —
// this is what populates the notes bar below the navbar.
const getSubscribedNotes = asynchandler(async (req, res) => {
  const userId = req.user._id;

  const subscriptions = await Subscription.find({ subscriber: userId }).select("channel");
  const channelIds = subscriptions.map((s) => s.channel);

  const notes = await Note.find({ owner: { $in: channelIds } })
    .populate("owner", "fullName avatar userName")
    .sort({ updatedAt: -1 });

  return res
    .status(200)
    .json(new apiresponse(200, notes, "Notes fetched successfully"));
});

// Fetch your own current note (so the UI can show "edit" vs "create" state)
const getMyNote = asynchandler(async (req, res) => {
  const userId = req.user._id;
  const note = await Note.findOne({ owner: userId });

  return res
    .status(200)
    .json(new apiresponse(200, note, "Note fetched successfully"));
});

export { upsertNote, deleteNote, getSubscribedNotes, getMyNote };