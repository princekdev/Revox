import express from "express";
import { body } from "express-validator";
import { register, login, getMe, updateProfile } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 chars"),
    body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
  ],
  register
);
 
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  login
);

router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

export default router;
