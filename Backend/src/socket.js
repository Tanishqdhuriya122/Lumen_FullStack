import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "./models/user.model.js";

// Tracks which socket ID belongs to which user, so we can send a message
// directly to a specific person instead of broadcasting to everyone.
const onlineUsers = new Map(); // userId -> socketId

// Module-level so emitNotification can be imported and called from ANY
// other controller file (video, friendship, etc.) without needing direct
// access to the socket connection itself.
let ioInstance = null;

// Called from other controllers (video publish, friend request, etc.) to
// push a notification instantly if the recipient is currently online.
// Safe to call even if they're offline — it just won't find a socket ID
// and silently does nothing (the notification still exists in MongoDB
// for them to see next time they open the bell dropdown).
const emitNotification = (recipientId, notification) => {
  if (!ioInstance) return;
  const socketId = onlineUsers.get(recipientId.toString());
  if (socketId) {
    ioInstance.to(socketId).emit("new_notification", notification);
  }
};

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    },
  });

  ioInstance = io; // capture for emitNotification to use

  // Runs before a connection is accepted — rejects anyone without a valid JWT,
  // same protection level as your verifyJWT middleware for regular routes.
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded._id).select("-password -refreshToken");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user; // attach user to this socket, like req.user in Express
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);
    console.log(`🟢 ${socket.user.fullName} connected`);

    // Let this user's friends know they just came online
    socket.broadcast.emit("user_online", { userId });

    // Real-time message delivery. The REST endpoint above handles persistence;
    // this handles instantly pushing it to the recipient if they're online.
    socket.on("send_message", async (data) => {
      const { receiverId, message } = data;
      const receiverSocketId = onlineUsers.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", message);
      }
    });

    // Typing indicator — purely ephemeral, never saved to the database
    socket.on("typing", ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("friend_typing", { senderId: userId });
      }
    });

    socket.on("stop_typing", ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("friend_stop_typing", { senderId: userId });
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      console.log(`🔴 ${socket.user.fullName} disconnected`);
      socket.broadcast.emit("user_offline", { userId });
    });
  });

  return { io, onlineUsers };
};

export { initializeSocket, onlineUsers, emitNotification };