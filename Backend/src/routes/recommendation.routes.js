import { Router } from "express";
import {
  getPersonalizedRecommendations,
  getTrendingVideos,
  getRelatedVideos,
  getSubscriptionFeed,
  getPopularByCategory,
} from "../controllers/recommendation.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const router = Router();

router.get(
  "/personalized",
  verifyJWT,
  cacheMiddleware(300),
  getPersonalizedRecommendations
);
router.get("/trending", cacheMiddleware(300), getTrendingVideos);
router.get("/related/:videoId", cacheMiddleware(600), getRelatedVideos);
router.get("/feed", verifyJWT, cacheMiddleware(180), getSubscriptionFeed);
router.get("/category/:category", cacheMiddleware(300), getPopularByCategory);

export default router;
