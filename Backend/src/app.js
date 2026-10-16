import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/error.middleware.js"
import searchRouter from "./routes/search.routes.js";
import messageRouter from "./routes/message.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import noteRouter from "./routes/note.routes.js";

const app = express();

// Security headers — should run first, before anything else touches the response
app.use(helmet());

// Compress all responses (smaller payloads, faster load times)
app.use(compression());

// Middleware
app.use(cors({ 
    origin: process.env.CORS_ORIGIN, 
    credentials: true 
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Rate limiter for auth routes — blocks brute-force attempts on login/register
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "test" ? 1000 : 10,   // relaxed only while testing                  // limit each IP to 10 requests per window
    message: { success: false, message: "Too many attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
});

import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import friendshipRouter from "./routes/friendship.routes.js";
import giphyRouter from "./routes/giphy.routes.js";
// Apply rate limiter only to auth-sensitive routes, not the whole user router
app.use("/api/v1/users/login", authLimiter);
app.use("/api/v1/users/register", authLimiter);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/search", searchRouter);   // ← moved here, after core middleware
app.use("/api/v1/friends", friendshipRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/giphy", giphyRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/notes", noteRouter);

app.use(errorHandler)
export { app };