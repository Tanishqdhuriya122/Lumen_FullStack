import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema=new Schema({
    videoFile:{
        type:String, //cloudnary url
        required:true,
    },
    thumbnail:{
        type:String, //cloudnary url
        required:true,
    },
    title:{
        type:String, 
        required:true,
    },
    viewedBy: {
        type: [{ type: Schema.Types.ObjectId, ref: "User" }],
        default: []
    },
    description:{
        type:String, 
        required:true,
    },
    view:{
        type:Number,
        default:0
    },
    ispublished:{
        type:Boolean,
        default:true
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    categories: [
  {
    type: Schema.Types.ObjectId,
    ref: "Category",
    index: true,
  }
    ],
    tags: {
        type: [String],
        index: true,
        validate: {
        validator: function(tags) {
      return tags.length <= 20;
    },
    message: "Maximum 20 tags allowed"
  }
},
language: {
  type: String,
  default: "en",
  enum: ["en", "es", "fr", "de", "hi", "ja", "ko", "zh", "pt", "ar", "other"]
},
ageRestriction: {
  type: Boolean,
  default: false,
},
allowComments: {
  type: Boolean,
  default: true,
},
visibility: {
  type: String,
  enum: ["public", "unlisted", "private"],
  default: "public",
}

},{
    timestamps:true
}) 


videoSchema.index({ title: 'text', description: 'text', tags: 'text' });
videoSchema.index({ owner: 1 });
videoSchema.index({ visibility: 1, ispublished: 1, createdAt: -1 });
videoSchema.plugin(mongooseAggregatePaginate)   //for aggregation queries and pipeline
export const Video=mongoose.model("Video", videoSchema)