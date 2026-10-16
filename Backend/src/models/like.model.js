import mongoose,{Schema} from "mongoose";

const likeSchema= new Schema(
    {
        video:{
            type:Schema.Types.ObjectId,
            ref:"Video"
        },
        comment:{
            type:Schema.Types.ObjectId,
            ref:"Comment"                                
        } ,
        tweet:{
            type:Schema.Types.ObjectId,
            ref:"Tweet"  
        },
        likedBy:{
            type:Schema.Types.ObjectId,
            ref:"User" 
        },
        // NEW: distinguishes a like from a dislike on the same document.
        // Defaults to "like" so existing documents in your DB remain valid.
        reactionType: {
            type: String,
            enum: ["like", "dislike"],
            default: "like"
        }
    },{
        timestamps:true
    }
)
// Enforces at the database level that a single user can only ever have ONE
// reaction document per video — makes the duplicate-document race condition
// (e.g. rapid double-clicking like and dislike) impossible, not just unlikely.
likeSchema.index(
  { video: 1, likedBy: 1 },
  { unique: true, partialFilterExpression: { video: { $exists: true } } }
);

export const Like=mongoose.model("Like",likeSchema)
