import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // Delete only if file exists
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    // Clean up only if the file still exists
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Cloudinary upload failed:", error.message);
    return null;
  }
};

// Inserts q_auto (automatic quality) and f_auto (automatic format) into the
// Cloudinary delivery URL. This is what actually makes videos/images load faster —
// Cloudinary compresses and picks the best format per-browser automatically.
const getOptimizedUrl = (secureUrl) => {
  if (!secureUrl) return secureUrl;
  return secureUrl.replace("/upload/", "/upload/q_auto,f_auto/");
};

export { uploadOnCloudinary, getOptimizedUrl };