import { Router } from "express";
import {
  getConversation,
  sendMessage,
  getUnreadCounts,
} from "../controllers/message.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.get("/unread", getUnreadCounts);
router.get("/:friendId", getConversation);
router.post("/:receiverId", sendMessage);

export default router;