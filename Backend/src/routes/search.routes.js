import { Router } from 'express';
import { search } from '../controllers/search.controller.js';
import {
  searchVideos,
  searchUsers,
  searchTweets,
  getSearchSuggestions,
  universalSearch,
} from "../controllers/search.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { apiLimiter } from "../middlewares/rateLimiter.middleware.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const router = Router();   // ← now defined first

router.use(apiLimiter);
router.use(verifyJWT);

router.get("/videos", cacheMiddleware(300), searchVideos);
router.get("/users", cacheMiddleware(300), searchUsers);
router.get("/tweets", cacheMiddleware(300), searchTweets);
router.get("/suggestions", cacheMiddleware(600), getSearchSuggestions);
router.get("/all", cacheMiddleware(300), universalSearch);
router.get("/", search);   // the route your frontend actually calls

export default router;