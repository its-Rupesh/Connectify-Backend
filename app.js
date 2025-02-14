import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import { errorMiddleware } from "./middlewares/error.js";
import { connectDB } from "./utils/features.js";
import { getSockets, getSocketsForUser } from "../server/lib/helper.js";
import { Server } from "socket.io";
import { createServer } from "http";
import chatRouter from "./routes/chat.js";
import userRouter from "./routes/user.js";
import adminRouter from "./routes/admin.js";
import {
  CHAT_EXITED,
  CHAT_JOINED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  START_TYPING,
  STOP_TYPING,
  ONLINE_USER,
} from "./constants/events.js";
import { v4 as uuid } from "uuid";
import { Message } from "./models/message.js";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import { corsOptions } from "./constants/config.js";
import { SocketAuthenticator } from "./middlewares/auth.js";
//MongoDb Connection Using env file
dotenv.config({ path: "./.env" });
const mongoURL = process.env.MONGO_URL;
connectDB(mongoURL);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const adminKey = process.env.ADMIN_SECRET_KEY;
// Map of Sockets id
const userSocketIDs = new Map();
const onlineUser = new Set();
const app = express();
//io socket creation
const server = createServer(app);
const io = new Server(server, { cors: corsOptions });
//Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
const PORT = 8000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";

// io instance saved for sockets
app.set("io", io);

// Routing
app.use("/api/v1/user", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/admin", adminRouter);
app.get("/", (req, res) => {
  res.send("Hello Homepage");
});
io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await SocketAuthenticator(err, socket, next)
  );
});
io.on("connection", (socket) => {
  const user = socket.user;
  userSocketIDs.set(user._id.toString(), socket.id);

  socket.on(NEW_MESSAGE, async ({ chatId, members, messages }) => {
    const messageForRealTime = {
      content: messages,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    const messagesForDB = {
      content: messages,
      sender: user._id,
      chat: chatId,
    };
    const membersSocket = getSockets(members);
    console.log(membersSocket);
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });
    try {
      await Message.create(messagesForDB);
    } catch (error) {
      console.log(error);
    }
  });
  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSocket = getSockets(members);
    socket.to(membersSocket).emit(START_TYPING, { chatId });
  });
  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSocket = getSockets(members);
    socket.to(membersSocket).emit(STOP_TYPING, { chatId });
  });
  socket.on(CHAT_JOINED, ({ userId, members }) => {
    console.log("User Joined->", userId);
    console.log(members);
    onlineUser.add(userId.toString());
    // console.log("onlineUser", onlineUser);
    const memeberSocket = getSockets(members);
    io.to(memeberSocket).emit(ONLINE_USER, Array.from(onlineUser));
  });
  socket.on(CHAT_EXITED, ({ userId, members }) => {
    "User Existed->", userId;
    onlineUser.delete(userId.toString());
    const memeberSocket = getSockets(members);
    io.to(memeberSocket).emit(ONLINE_USER, Array.from(onlineUser));
  });
  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id.toString());
    console.log("User Disconnected");
  });
});

// Error Handler Middleware
app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${envMode}`);
});
export { adminKey, envMode, userSocketIDs };
