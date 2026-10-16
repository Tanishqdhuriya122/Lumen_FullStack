import { Router } from "express";
import { upsertNote, deleteNote, getSubscribedNotes, getMyNote } from "../controllers/note.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.get("/subscribed", getSubscribedNotes);
router.get("/me", getMyNote);
router.post("/", upsertNote);
router.delete("/", deleteNote);

export default router;