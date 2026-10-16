import { Router } from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriendsList,
  getPendingRequests,
  searchUsersToAdd,
} from "../controllers/friendship.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.get("/search", searchUsersToAdd);
router.get("/", getFriendsList);
router.get("/requests/pending", getPendingRequests);

router.post("/request/:recipientId", sendFriendRequest);
router.post("/accept/:requestId", acceptFriendRequest);
router.post("/reject/:requestId", rejectFriendRequest);
router.delete("/:friendId", removeFriend);

export default router;