import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";
import { cookieOptions } from "../utils/features.js";
import { adminKey } from "../app.js";

const allUser = async (req, res, next) => {
  try {
    const users = await User.find({});
    const transformedUser = await Promise.all(
      users.map(async ({ name, username, avatar, _id }) => {
        const [groups, friends] = await Promise.all([
          Chat.countDocuments({ groupchat: true, members: _id }),
          Chat.countDocuments({ groupchat: false, members: _id }),
        ]);
        return { name, username, avatar: avatar.url, _id, groups, friends };
      })
    );
    return res.status(200).json({
      status: "success",
      message: transformedUser,
    });
  } catch (error) {
    next(error);
  }
};
const allChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({})
      .populate("members", "name avatar")
      .populate("creator", "name avatar");
    const transformedChat = await Promise.all(
      chats.map(async ({ members, _id, groupchat, name, creator }) => {
        const totalMessages = await Message.countDocuments({ chat: _id });
        return {
          _id,
          groupchat,
          name,
          avatar: members.slice(0, 3).map((member) => member.avatar.url),
          members: members.map((member) => ({
            _id: member._id,
            name: member.name,
            avatar: member.avatar.url,
          })),
          creator: {
            name: creator?.name || "None",
            avatar: creator?.avatar.url || "",
          },
          totalMember: members.length,
          totalMessages,
        };
      })
    );
    return res.status(200).json({ success: true, message: transformedChat });
  } catch (error) {
    next(error);
  }
};
const allMessages = async (req, res, next) => {
  try {
    const message = await Message.find({})
      .populate("sender", "name avatar")
      .populate("chat", "groupchat");
    const transformedMessage = message.map(
      ({ content, attachements, _id, sender, createdAt, chat }) => ({
        _id,
        attachements,
        content,
        createdAt,
        chat: chat._id,
        groupchat: chat.groupchat,
        sender: {
          _id: sender._id,
          name: sender.name,
          avatar: sender.avatar.url,
        },
      })
    );
    return res.status(200).json({ success: true, message: transformedMessage });
  } catch (error) {
    next(error);
  }
};
const getDashboardStats = async (req, res, next) => {
  try {
    const [groupsCount, userCount, messageCount, totalChatscount] =
      await Promise.all([
        Chat.countDocuments({ groupchat: true }),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
      ]);
    const today = new Date();
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysMessages = await Message.find({
      createdAt: {
        $gte: last7Days,
        $lte: today,
      },
    }).select("createdAt");
    const messages = new Array(7).fill(0);
    const dayInMiliseconds = 1000 * 60 * 60 * 24;
    last7DaysMessages.forEach((message) => {
      const indexApprox =
        (today.getTime() - message.createdAt.getTime()) / dayInMiliseconds;
      const index = Math.floor(indexApprox);
      messages[6 - index]++;
    });
    const stats = {
      groupsCount,
      userCount,
      messageCount,
      totalChatscount,
      messageChart: messages,
    };
    return res.status(200).json({ success: true, message: stats });
  } catch (error) {
    next(error);
  }
};
const adminLogin = async (req, res, next) => {
  try {
    const { secretKey } = req.body;
    const isMatch = secretKey === adminKey;

    if (!isMatch) return next(new ErrorHandler("Invalid Secret Key", 401));
    const token = jwt.sign(secretKey, process.env.JWT_SECRET);
    return res
      .status(200)
      .cookie("Connectify-admin-Token", token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 30,
      })
      .json({ success: true, message: "Welcome Admin..." });
  } catch (error) {
    next(error);
  }
};
const adminLogOut = async (req, res, next) => {
  try {
    return res
      .status(200)
      .cookie("Connectify-admin-Token", "", { ...cookieOptions, maxAge: 0 })
      .json({
        success: true,
        message: "Logged Out Successfully",
      });
  } catch (error) {
    next(error);
  }
};
const getAdminData = async (req, res, next) => {
  try {
    return res.status(200).json({ admin: true });
  } catch (error) {
    next(error);
  }
};
export {
  allChats,
  allMessages,
  allUser,
  getDashboardStats,
  adminLogin,
  adminLogOut,
  getAdminData,
};
