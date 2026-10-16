import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"; 
const userSchema= new Schema({
    userName:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullName:{
        type:String,
        required:true,
        
        lowercase:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String,   //cloundary service 
        required:true,
    },
    coverImage:{
        type:String
    },
    watchHistory:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Video"   //here we will add export word like Video not file name video
        }],
         watchLater:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Video"
        }],
    password:{
            type:String,
            required:[true,'Passord is required'],
        },
    refreshToken:{
            type:String,
        },
    // --- OTP / email verification fields ---
    isEmailVerified:{
        type:Boolean,
        default:false
    },
    otp:{
        type:String,
        select:false    // hashed OTP never returned by default queries — must explicitly .select("+otp")
    },
    otpExpiry:{
        type:Date,
        select:false
    },
    otpLastSentAt:{
        type:Date,
        select:false    // used for the 60-second cooldown so the send-otp endpoint can't be spammed
    }
    
},{
    timestamps:true
})



//to encrypt the password using pre hook and bcrypt package 
userSchema.pre ("save",async function (next) {
    if(!this.isModified("password")) return next();   // Ensure that the password is only encrypted when it is updated
    this.password= await bcrypt.hash(this.password,10)
    next()
}) 
userSchema.methods.isPasswordCorrect=async function(password){                 //this will check password is correct or not for existing user
    return await bcrypt.compare(password,this.password)                       //password given by user and this.password was encrypted passwsord
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            userName:this.userName,
            fullName:this.fullName
        }
        ,process.env.ACCESS_TOKEN_SECRET,{
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY 
        }
    )
}
userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id:this._id
        },
        process.env.REFRESH_TOKEN_SECRET,{
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
export const User=mongoose.model("User",userSchema)   // Ye User direct db se connect kr skta hai