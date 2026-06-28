import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { upload, uploadToCloudinary } from "../config/cloudinary.js";

const router = express.Router();

/**
 * POST /api/upload
 * Accepts multipart/form-data with a single "file" field.
 * Returns { url, publicId, name, type, size }
 */
router.post("/", protect, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file received. Send the file as a form field named 'file'." });
  }

  try {
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    return res.json({
      url: result.secure_url,
      publicId: result.public_id,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
});

export default router;
