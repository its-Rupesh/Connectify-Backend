import express from "express";
import {
  adminLogin,
  adminLogOut,
  allChats,
  allMessages,
  allUser,
  getAdminData,
  getDashboardStats,
} from "../controllers/admin.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";
import { adminLoginValidator, validateHandler } from "../lib/validator.js";
const app = express.Router();

app.post("/verify", adminLoginValidator(), validateHandler, adminLogin);
app.get("/logout", adminLogOut);
// Only Admin Can access
app.use(isAdminAuthenticated);
app.get("/", getAdminData);
app.get("/users", allUser);
app.get("/chats", allChats);
app.get("/messages", allMessages);
app.get("/stats", getDashboardStats);
export default app;
