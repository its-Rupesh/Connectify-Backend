import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { attachementsMulter } from "../middlewares/multer.js";
import {
  AddMemberValidator,
  getChatValidator,
  getMessagesValidator,
  leaveGroupValidator,
  newGroupValidator,
  RemoveMemberValidator,
  renameValidator,
  sendAttachmentsValidator,
  validateHandler,
  deleteChatHandler,
} from "../lib/validator.js";
import {
  addMembers,
  getMyChat,
  getMyGroups,
  newGroupChat,
  removeMembers,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
} from "../controllers/chat.js";

//Express->Contain Router for Routing purpose
const app = express.Router();

// isAuthenticated Middleware all below routes will use
app.use(isAuthenticated);

app.post("/new", newGroupValidator(), validateHandler, newGroupChat);
app.get("/my", getMyChat);
app.get("/my/groups", getMyGroups);
app.put("/addmembers", AddMemberValidator(), validateHandler, addMembers);
app.put(
  "/removemembers",
  RemoveMemberValidator(),
  validateHandler,
  removeMembers
);
app.delete("/leave/:id", leaveGroupValidator(), validateHandler, leaveGroup);
app.post(
  "/message",
  attachementsMulter,
  //sendAttachmentsValidator,
  //validateHandler,
  sendAttachments
);
app.get("/message/:id", getMessagesValidator(), validateHandler, getMessages);
app
  .route("/:id")
  .get(getChatValidator(), validateHandler, getChatDetails)
  .put(renameValidator(), validateHandler, renameGroup)
  .delete(deleteChatHandler(), validateHandler, deleteChat);
export default app;
