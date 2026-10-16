import { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { Like } from "../models/like.model.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse} from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";

// controllers/tweetController.js
const getAllTweets = asynchandler(async (req, res) => {
  const userId = req.user._id;

  const tweets = await Tweet.find()
    .populate('owner', 'fullName email avatar')
    .sort({ createdAt: -1 });

  const tweetsWithLikes = await Promise.all(
    tweets.map(async (tweet) => {
      const likesCount = await Like.countDocuments({ tweet: tweet._id });
      const likedByMe = await Like.exists({ tweet: tweet._id, likedBy: userId });

      return {
        ...tweet.toObject(),
        likesCount,
        likedByMe: !!likedByMe,
      };
    })
  );

  res.status(200).json(new apiresponse(200, tweetsWithLikes, "Fetched all tweets"));
});
const createTweet = asynchandler(async (req, res) => {
  const { content } = req.body; // Extracts the tweet content from the request body
  const ownerId = req.user._id; // Get the logged-in user's ID

  // If no content is provided, throw an error.
  if (!content) {
    throw new apierror(400, "Tweet content should not be empty");
  }

  //  Creating a New Tweet
  /*
     - `Tweet.create({ content, owner: ownerId })`
       This creates a new document in the database with:
         - `content`: The actual text of the tweet.
         - `owner`: The user who posted it (linked via the user's ID).
     - MongoDB automatically assigns a unique `_id` to the tweet.
  */
  const newTweet = await Tweet.create({ content, owner: ownerId });
  await newTweet.populate('owner', 'fullName email avatar');
  // Error Handling: If something goes wrong with saving to the database
  if (!newTweet) {
    throw new apierror(500, "Something went wrong while creating a tweet");
  }

  // Success Response
  return res
    .status(201)
    .json(new apiresponse(201, newTweet, "Tweet created successfully"));

  /*
How does this work in an app? - Notes:

👉 When a user submits a tweet via a frontend app (like a form or a button press):
   - The frontend sends a `POST` request to the backend with `content`.
   - This controller checks if content exists, then creates a new tweet.
   - The tweet is saved in MongoDB, associated with the logged-in user.
   - A success response is sent back with the newly created tweet.
*/
});

const getUserTweets = asynchandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new apierror(400, "Invalid user ID");
  }

  const tweets = await Tweet.find({ owner: userId })
    .sort({ createdAt: -1 })
    .populate({
      path: 'owner',
      select: 'fullName username email avatar',
    });

  if (!tweets || tweets.length === 0) {
    throw new apierror(404, "Tweets are not found");
  }

  return res
    .status(200)
    .json(new apiresponse(200, tweets, "User tweets fetched successfully"));
});



const updateTweet = asynchandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new apierror(400, 'Content cannot be empty');
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new apierror(404, 'Tweet not found');
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new apierror(403, 'You are not authorized to update this tweet');
  }

  tweet.content = content;
  await tweet.save();

  // ✅ Populate the updated tweet with owner data
  await tweet.populate('owner', 'fullName email avatar');

  return res.status(200).json(new apiresponse(200, tweet, 'Tweet updated successfully'));
});

const deleteTweet = asynchandler(async (req, res) => {
  // Extract the tweetId from request parameters (The ID of the tweet the user wants to delete.)
  const { tweetId } = req.params;

  // Get the currently logged-in user's ID
  const userId = req.user._id;

  // Validate if tweetId is a proper MongoDB ObjectId
  if (!isValidObjectId(tweetId)) {
    throw new apierror(400, "Invalid tweet ID");
  }

  /*
   Find the tweet in the database.
    - We need to check if the tweet exists before trying to delete it.
  */
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new apierror(404, "Tweet not found");
  }

  /*
   Check if the user owns the tweet.
    - Only the owner of the tweet should be able to delete it.
    - Convert ObjectIds to strings before comparing (MongoDB IDs are objects).
  */
  if (tweet.owner.toString() !== userId.toString()) {
    throw new apierror(403, "You can only delete your own tweets");
  }

  /*
    Delete the tweet from the database.
    - `findByIdAndDelete(tweetId)`: Finds the tweet by its ID and deletes it.
  */
  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

  if (!deletedTweet) {
    throw new apierror(500, "Something went wrong while deleting a tweet");
  }

  // Send a success response back to the user.
  res
    .status(200)
    .json(new apiresponse(200, deletedTweet, "Tweet deleted successfully"));

  /*

  Tweet Deletion - Notes: 
 
  👉 Why verify if the tweet exists before deleting?
     - Prevents errors when trying to delete something that isn't there.
     - Avoids unnecessary database operations.

  👉 Why use `findByIdAndDelete()` instead of `deleteOne()`?
     - `findByIdAndDelete()` finds a document by `_id` and removes it in one step.
     - `deleteOne({ _id: tweetId })` works too, but we already have the exact `_id`, so it’s simpler.
     
*/
});

export { createTweet, getUserTweets, updateTweet, deleteTweet,getAllTweets };