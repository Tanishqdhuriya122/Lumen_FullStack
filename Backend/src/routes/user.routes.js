import { Router } from "express";
import { loggedOutUser, registerUser,loginUser, changeCurrentPassword, 
    getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, refreshAccessToken ,
    getUserChannelProfile, watchHistory,addToWatchHistory, sendOtp, verifyEmailOtp, loginWithOtp,
    toggleWatchLater, getWatchLater } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import { uploadOnCloudinary } from "../utils/cloudinary.js";


const router=Router()
router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ])
    ,registerUser)

router.route("/login").post(loginUser)

router.route("/send-otp").post(sendOtp)
router.route("/verify-email-otp").post(verifyEmailOtp)
router.route("/login-with-otp").post(loginWithOtp)

//secured routes 
router.route("/logout").post(verifyJWT,loggedOutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)
router.route("/avatar")
.patch(verifyJWT,upload.single("avatar"),updateUserAvatar)

router.route("/coverImage")
.patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)  //patch because of url 

router.route("/channel/:username").get(verifyJWT,getUserChannelProfile)
router.post("/watch/:videoId", verifyJWT, addToWatchHistory);
router.route("/watchHistory").get(verifyJWT,watchHistory)

router.post("/watch-later/:videoId", verifyJWT, toggleWatchLater);
router.route("/watch-later").get(verifyJWT, getWatchLater)

export default router