import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  accessChat, getChats, createGroupChat,
  renameGroup, setNickname,
  addToGroup, removeFromGroup, deleteChatForUser,
} from "../controllers/chat.controller.js";

const router = express.Router();
router.use(protect);

router.post("/",                   accessChat);
router.get("/",                    getChats);
router.post("/group",              createGroupChat);
router.put("/group/:id",           renameGroup);
router.put("/:id/nickname",        setNickname);
router.put("/group/:id/add",       addToGroup);
router.put("/group/:id/remove",    removeFromGroup);
router.delete("/:id",              deleteChatForUser);

export default router;
