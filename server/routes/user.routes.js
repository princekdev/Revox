import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { searchUsers, getUserById } from "../controllers/user.controller.js";

const router = express.Router();

router.use(protect);

router.get("/search", searchUsers);
router.get("/:id", getUserById);

export default router;
