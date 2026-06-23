import dotenv from "dotenv";
dotenv.config();


import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — reliable across all multer versions
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain", "application/zip",
      "audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg",
      "video/mp4", "video/webm",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type "${file.mimetype}" is not allowed`), false);
  },
});

/**
 * Upload a Buffer to Cloudinary and return the result object.
 * resource_type is auto-detected from mimetype.
 */
export const uploadToCloudinary = (buffer, mimetype, originalname) =>
  new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith("image/") ? "image"
      : mimetype.startsWith("video/") ? "video"
      : "raw";

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "chatapp",
        resource_type: resourceType,
        // Sanitise filename: strip spaces and special chars
        public_id: `${Date.now()}-${originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });

export { cloudinary };
