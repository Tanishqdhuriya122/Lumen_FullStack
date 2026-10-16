import { Router } from "express";
import { searchGifs, getTrendingGifs } from "../controllers/giphy.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.get("/search", searchGifs);
router.get("/trending", getTrendingGifs);

export default router;