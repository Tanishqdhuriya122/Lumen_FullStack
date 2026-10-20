import { asynchandler } from "../utils/asynchandler.js";
import { apierror } from "../utils/apierror.js";
import validator from "validator";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiresponse } from "../utils/apiresponse.js";
import jwt from "jsonwebtoken";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";
import { generateOtp, verifyOtpHash } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/mailer.js";

const OTP_EXPIRY_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;

// Centralized cookie options — secure only in production (HTTPS required for secure:true),
// sameSite added for CSRF protection. Avoids repeating this object 3 times with the risk
// of one copy drifting out of sync (which already happened once in this file).
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
}

//generating a generalised method so we dont have to write everytime
const generateAccessTokenAndRefreshToken=async(userId)=>{      
    try {
        const user=await User.findById(userId)
        const accessToken= user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave:false })    //We are doing this because if we try to save mongoose model will get kickin  so password field will also be kickin so whenever we will save this you required password but we are only giving user token

        return {accessToken,refreshToken}
        

    } catch (error) {
        throw new apierror(500,"Something went wrong while generating refresh and access token")
    }
}

//registering a user
const registerUser=asynchandler(   async(req,res)=>{
    //get details from user
    //validation like email is correct or not and non-empty
    //check if user already exist:userName,email
    //check for images ,check for avatar
    //upload them to cloudinary,avatar
    //create user object for uploading in Mongoose db-create entry in db
    //remove password and refresh token field
    //check for user creation
    //return res

    const {fullName ,email , userName, password}=req.body

    if( 
        [fullName,email,userName,password].some((field)=>
            field?.trim()===""
        )
    ){
        throw new apierror(400,"All fields are required")
    }
    if(!validator.isEmail(email)){
        throw new apierror(400,"Invalid email format")   // 400 is correct here — malformed input, not a conflict
    }
   const existedUser= await User.findOne({
        $or:[{ userName },{ email }]
    })
    if(existedUser){
        throw new apierror(409,"User already exists")
    }
    //to get url of avatar and images we use multer bcoz multer give by default req.files

    const avatarLocalPath=req.files?.avatar?.[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }

    // Avatar is optional — falls back to a default image if not provided
    const avatar = avatarLocalPath ? await uploadOnCloudinary(avatarLocalPath) : null;
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    const user=await  User.create ({
        fullName,
        avatar: avatar?.url || "https://res.cloudinary.com/dwvp6k008/image/upload/v1790780898/images_hu78uk.jpg",
        coverImage:coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )
   if(!createdUser){
    throw new apierror(500,"Something went wrong while registering user")
   }

   return res.status(201).json(
    new apiresponse(201,createdUser,"User registered successfully")
   )

})

//login a user
const loginUser=asynchandler(async(req,res)=>{
    const {email,userName ,password}=req.body
    if(!userName && !email){
        throw new apierror (400,"username or email is required")
    }

   const user= await User.findOne({
        $or: [{email},{userName}]
    })
    if(!user){
        throw new apierror(404,"User does not exist")
    }
    
   const isPasswordValid= await user.isPasswordCorrect(password)
   if(!isPasswordValid){
    throw new apierror(401,"Invalid User Credentials")
    }

   const{accessToken,refreshToken}= await generateAccessTokenAndRefreshToken(user._id)

   const loggedinUser=await User.findById(user._id).
   select("-password  -refreshToken")

   return res
   .status(200)
   .cookie("accessToken",accessToken,cookieOptions)
   .cookie("refreshToken",refreshToken,cookieOptions)   // FIX: was missing cookieOptions before — cookie had no httpOnly/secure/sameSite protection
   .json(
    new apiresponse(200,{
        user:loggedinUser,accessToken,refreshToken
    },
    "User Logged in successfully"
)
   )
})

// --- Send a one-time OTP to the user's email ---
// purpose: "signup" (used right after registerUser, to verify the mail)
//       or "login"  (used instead of password on the OTP-login screen)
const sendOtp=asynchandler(async(req,res)=>{
    const {email,purpose}=req.body

    if(!email || !validator.isEmail(email)){
        throw new apierror(400,"Valid email is required")
    }
    if(!["signup","login"].includes(purpose)){
        throw new apierror(400,"purpose must be 'signup' or 'login'")
    }

    const user=await User.findOne({email}).select("+otpLastSentAt")
    if(!user){
        throw new apierror(404,"No account found with this email")
    }

    // Cooldown — stops someone spamming this endpoint and running up email volume
    if(user.otpLastSentAt && Date.now()-user.otpLastSentAt.getTime() < OTP_COOLDOWN_SECONDS*1000){
        const waitSeconds=OTP_COOLDOWN_SECONDS - Math.floor((Date.now()-user.otpLastSentAt.getTime())/1000)
        throw new apierror(429,`Please wait ${waitSeconds}s before requesting another OTP`)
    }

    const {otp,hashedOtp}=await generateOtp()

    user.otp=hashedOtp
    user.otpExpiry=new Date(Date.now()+OTP_EXPIRY_MINUTES*60*1000)
    user.otpLastSentAt=new Date()
    await user.save({validateBeforeSave:false})

    await sendOtpEmail(email,otp,purpose)

    return res
    .status(200)
    .json(new apiresponse(200,{},"OTP sent to your email"))
})

// --- Verify the OTP sent at signup, marks the email as verified ---
const verifyEmailOtp=asynchandler(async(req,res)=>{
    const {email,otp}=req.body

    if(!email || !otp){
        throw new apierror(400,"Email and OTP are required")
    }

    const user=await User.findOne({email}).select("+otp +otpExpiry")
    if(!user){
        throw new apierror(404,"No account found with this email")
    }
    if(!user.otp || !user.otpExpiry){
        throw new apierror(400,"No OTP was requested for this account")
    }
    if(user.otpExpiry.getTime() < Date.now()){
        throw new apierror(400,"OTP has expired, please request a new one")
    }

    const isValid=await verifyOtpHash(otp,user.otp)
    if(!isValid){
        throw new apierror(400,"Invalid OTP")
    }

    user.isEmailVerified=true
    user.otp=undefined
    user.otpExpiry=undefined
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new apiresponse(200,{},"Email verified successfully"))
})

// --- Log in using email + OTP instead of email + password ---
const loginWithOtp=asynchandler(async(req,res)=>{
    const {email,otp}=req.body

    if(!email || !otp){
        throw new apierror(400,"Email and OTP are required")
    }

    const user=await User.findOne({email}).select("+otp +otpExpiry")
    if(!user){
        throw new apierror(404,"No account found with this email")
    }
    if(!user.otp || !user.otpExpiry){
        throw new apierror(400,"No OTP was requested for this account")
    }
    if(user.otpExpiry.getTime() < Date.now()){
        throw new apierror(400,"OTP has expired, please request a new one")
    }

    const isValid=await verifyOtpHash(otp,user.otp)
    if(!isValid){
        throw new apierror(400,"Invalid OTP")
    }

    user.otp=undefined
    user.otpExpiry=undefined
    if(!user.isEmailVerified) user.isEmailVerified=true   // proving mail ownership via OTP also verifies it
    await user.save({validateBeforeSave:false})

    const{accessToken,refreshToken}=await generateAccessTokenAndRefreshToken(user._id)

    const loggedinUser=await User.findById(user._id).select("-password -refreshToken")

    return res
    .status(200)
    .cookie("accessToken",accessToken,cookieOptions)
    .cookie("refreshToken",refreshToken,cookieOptions)
    .json(
        new apiresponse(200,{
            user:loggedinUser,accessToken,refreshToken
        },
        "Logged in successfully via OTP"
    )
    )
})

//loggedout a user
const loggedOutUser=asynchandler(async(req,res)=>{
    await User.findByIdAndUpdate(      // FIX: was missing "await" — response could fire before DB update finished (race condition)
        req.user._id,{
            $set:{
                refreshToken:undefined
            }
        },
        {
        new:true
        }
    )

    return res
    .status(200)
    .clearCookie("accessToken",cookieOptions)
    .clearCookie("refreshToken",cookieOptions)
    .json(new apiresponse(200,{},"User logged out successfully"))
})
    
//refresh access token 
const refreshAccessToken=asynchandler(async(req,res)=>{
    const incomingRefreshToken=  req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
    throw new apierror(401,"Unauthorized Request")
   }

   try {
    const decodedToken =jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
    )
 
    const user =await User.findById(decodedToken?._id)
    if(!user){
     throw new apierror(401,"Invalid refresh token")
    }

    if(incomingRefreshToken !== user?.refreshToken){
     throw new apierror(401,"Refresh token is expired or used")
    }
 
     const{ accessToken,refreshToken:newRefreshToken}=await generateAccessTokenAndRefreshToken(user._id)
 
    return res
    .status(200)
    .cookie("accessToken",accessToken,cookieOptions)
    .cookie("refreshToken",newRefreshToken,cookieOptions)
    .json(
     new apiresponse(
          200,
          {accessToken,refreshToken:newRefreshToken},
          "Access Token refreshed"
     )
    )
   } catch (error) {
        throw new apierror(401,error?.message||"Invalid refresh token")
   }
})

//changing old password
const changeCurrentPassword=asynchandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

   const user =await   User.findById(req.user?._id) 
   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new apierror(400,"Invalid password")
    }
    if(oldPassword === newPassword){               // FIX: prevents "changing" to the same password silently
        throw new apierror(400,"New password must be different from old password")
    }
    user.password=newPassword
    await user.save({validateBeforeSave:false})
    return res
    .status(200)
    .json(new apiresponse(
        200,{},
        "Password changed successfully"
    ))

})

//get current user
const getCurrentUser=asynchandler(async(req,res)=>{
    return res
    .status(200)
    .json(new apiresponse(200,req.user,"Current User fetched successfully"))
})

//updating account
const updateAccountDetails=asynchandler(async(req,res)=>{
        const {fullName,email}=req.body
        if(!(fullName || email)){
            throw new apierror(400,"At least one field is required")
        }
        if(email && !validator.isEmail(email)){     // FIX: email format was never validated here before
            throw new apierror(400,"Invalid email format")
        }
        if(email){                                   // FIX: checks no OTHER user already has this email
            const emailTaken = await User.findOne({ email, _id: { $ne: req.user._id } })
            if(emailTaken){
                throw new apierror(409,"Email already in use")
            }
        }

        const updateFields = {}
        if(fullName) updateFields.fullName = fullName
        if(email) updateFields.email = email

        const user= await User.findByIdAndUpdate(req.user?._id,
            { $set: updateFields },
            {new :true}
        ).select("-password")

        return res
        .status(200)
        .json(new apiresponse(200,user,"Account details updated successfully"))
})

//updating user Avatar
const updateUserAvatar=asynchandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path  
    if(!avatarLocalPath){
        throw new apierror(400,"Avatar file is missing")
    }           
    const avatar=  await uploadOnCloudinary(avatarLocalPath)   
    if(!avatar?.url){
        throw new apierror(400,"Error while uploading avatar")
    }
   const user= await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiresponse(
        200,
        user,
        "Avatar changed successfully"
    ))
    
})

//update user CoverImage
const updateUserCoverImage=asynchandler(async(req,res)=>{
    const coverLocalPath=req.file?.path  
    if(!coverLocalPath){
        throw new apierror(400,"Cover Image file is missing")
    }           
    const coverImage=  await uploadOnCloudinary(coverLocalPath)   
    if(!coverImage?.url){
        throw new apierror(400,"Error while uploading cover image")
    }
   const user= await User.findByIdAndUpdate(req.user?._id,
        { 
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiresponse( 
        200,
        user,
        "Cover Image changed successfully"
    ))
    
})

//get user channel profile like how many subscriber and whom you follow
const getUserChannelProfile = asynchandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new apierror(400, "username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                userName:username.toLowerCase()
              }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new apierror(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new apiresponse(200, channel[0], "User channel fetched successfully")
    )
})

const addToWatchHistory = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;
  
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new apierror(400, 'Invalid video ID');
    }
  
    await User.findByIdAndUpdate(userId, {
      $addToSet: { watchHistory: videoId },
    });
  
    return res.status(200).json(new apiresponse(200, {}, 'Added to watch history'));
  });

const watchHistory = asynchandler(async (req, res) => {
    const userId = req.user._id;
  
    const user = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  { $project: { fullName: 1, username: 1, avatar: 1 } },
                ],
              },
            },
            { $addFields: { owner: { $first: "$owner" } } },
            { $sort: { createdAt: -1 } },
          ],
        },
      },
      { $project: { watchHistory: 1 } },
    ]);
  
    return res.status(200).json(
      new apiresponse(
        200,
        user[0]?.watchHistory || [],
        "Watch history fetched successfully"
      )
    );
  });
  // --- Toggles a video in/out of the current user's Watch Later list ---
const toggleWatchLater = asynchandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new apierror(400, "Invalid video ID");
    }

    const user = await User.findById(req.user._id);
    const alreadyIn = user.watchLater.some((id) => id.toString() === videoId);

    if (alreadyIn) {
        user.watchLater = user.watchLater.filter((id) => id.toString() !== videoId);
    } else {
        user.watchLater.push(videoId);
    }

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new apiresponse(
                200,
                { isInWatchLater: !alreadyIn },
                alreadyIn ? "Removed from Watch Later" : "Added to Watch Later"
            )
        );
});

// --- Fetches the current user's full Watch Later list, populated ---
const getWatchLater = asynchandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate({
        path: "watchLater",
        populate: { path: "owner", select: "fullName userName avatar" },
    });

    return res
        .status(200)
        .json(new apiresponse(200, user.watchLater || [], "Watch Later fetched successfully"));
});


export {registerUser,loginUser,loggedOutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,
    getUserChannelProfile,watchHistory,addToWatchHistory,sendOtp,verifyEmailOtp,loginWithOtp,toggleWatchLater,getWatchLater
}