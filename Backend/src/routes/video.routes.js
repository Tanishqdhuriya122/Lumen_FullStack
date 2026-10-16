import { Router } from 'express';
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishAVideo,
    getAllVideospublic,
    updateVideo,
    getUploadSignature,
    markVideoAsViewed
} from "../controllers/video.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middlewares.js"

const router = Router();

router.get('/public', getAllVideospublic);

router.use(verifyJWT); // everything below this line requires a valid JWT

// NEW: issues a signed upload ticket. Sits behind verifyJWT above, so a
// request with no/invalid token never gets a signature — and without a
// valid signature, Cloudinary itself refuses the upload.
router.route("/upload-signature").get(getUploadSignature);

router
    .route("/")
    .get(getAllVideos)
    .post(publishAVideo);

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo);


router.route("/:videoId/view").post(markVideoAsViewed);
    
export default router