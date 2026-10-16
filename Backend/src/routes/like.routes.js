import { Router } from 'express';
import {
    getLikedVideos,
    toggleVideoLike,
    toggleVideoDislike,
    toggleTweetLike,
} from "../controllers/like.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT);

router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/dislike/v/:videoId").post(toggleVideoDislike); // NEW

router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/videos").get(getLikedVideos);

export default router