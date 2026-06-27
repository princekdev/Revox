import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getMessages,
  sendMessage,
  markSeen,
  deleteMessage,
  editMessage,
  reactToMessage,
  pinMessage,
} from "../controllers/message.controller.js";

const router = express.Router();
router.use(protect);

router.get("/:chatId",      getMessages);
router.post("/",            sendMessage);
router.put("/seen",         markSeen);
router.delete("/:id",       deleteMessage);   // ?scope=me|everyone
router.put("/:id/edit",     editMessage);
router.put("/:id/react",    reactToMessage);
router.put("/:id/pin",      pinMessage);

export default router;
