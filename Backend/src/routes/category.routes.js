import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryWithVideos,
  updateCategory,
  deleteCategory,
  getPopularTags,
  getTrendingTags,
  getVideosByTag,
} from "../controllers/category.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const router = Router();

router.get("/", cacheMiddleware(600), getAllCategories);
router.get("/tags/popular", cacheMiddleware(600), getPopularTags);
router.get("/tags/trending", cacheMiddleware(300), getTrendingTags);
router.get("/:slug", cacheMiddleware(300), getCategoryWithVideos);
router.get("/tag/:tag", cacheMiddleware(300), getVideosByTag);

// Protected routes (admin only - add admin middleware)
router.post("/", verifyJWT, createCategory);
router.patch("/:categoryId", verifyJWT, updateCategory);
router.delete("/:categoryId", verifyJWT, deleteCategory);

export default router;