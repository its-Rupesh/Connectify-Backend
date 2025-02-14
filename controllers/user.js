import { compare } from "bcrypt";
import { User } from "../models/user.js";
import {
  cookieOptions,
  emitEvent,
  sendToken,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
//Create New User and Save it to Database and cookies
const newUser = async (req, res, next) => {
  try {
    const { name, username, password, bio } = req.body;
    const file = req.file;
    console.log("file", file);
    if (!file) return next(new ErrorHandler("File Not Present", 400));
    const result = await uploadFilesToCloudinary([file]);
    console.log("result", result);
    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url,
    };
    const user = await User.create({
      name,
      username,
      password,
      avatar,
      bio,
    });

    sendToken(res, user, 201, "User Created");
  } catch (error) {
    next(error);
  }
};
// Try Catch ckeck flow .txt file
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Select [User Schema ->False] To select password also we use select
    const user = await User.findOne({ username }).select("+password");
    // Error Handling 1.Create Error instance 2.add statuscode,name,.. 3.then send using next
    if (!user) return next(new ErrorHandler("No Such User Present", 404));
    const isMatch = await compare(password, user.password);
    if (!isMatch)
      return next(new ErrorHandler("Username or Password Incorrect", 401));
    sendToken(res, user, 200, `Welcome Back ${user.name}`);
  } catch (error) {
    next(error);
  }
};
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    return res.status(200).json({
      success: true,
      data: req.user,
      user,
    });
  } catch (error) {
    next(error);
  }
};
const logout = async (req, res, next) => {
  try {
    return res
      .status(200)
      .cookie("Connectify-Token", "", { ...cookieOptions, maxAge: 0 })
      .json({
        success: true,
        message: "Logged Out Successfully",
      });
  } catch (error) {
    next(error);
  }
};
const searchUser = async (req, res, next) => {
  try {
    // name{*<-url me chaiye "name"} Taken from Search query
    const { name = "" } = req.query;
    const chat = await Chat.find({ groupchat: false, members: req.user });
    //All User Which I have Chat
    const allUserFromChats = chat.flatMap((chat) => chat.members);
    // In simple terms, it filters out all the users that are already in allUserFromChats
    //This uses a regular expression ($regex) to match names in a case-insensitive manner ($options: "i").
    //It ensures only users whose names partially match the name variable are included in the results.
    const execlusionList = [...allUserFromChats, req.user];
    const allUserExceptMeandFriends = await User.find({
      _id: { $nin: execlusionList },
      name: { $regex: name, $options: "i" },
    });
    const users = allUserExceptMeandFriends.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    return res.status(200).json({
      success: true,
      message: users,
    });
  } catch (error) {
    next(error);
  }
};
const sendrequest = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const request = await Request.findOne({
      $or: [
        { sender: req.user, reciever: userId },
        { sender: userId, reciever: req.user },
      ],
    });
    if (request) return next(new ErrorHandler("Request Already sent", 400));
    await Request.create({
      sender: req.user,
      reciever: userId,
    });
    emitEvent(req, NEW_REQUEST, [userId]);
    return res
      .status(200)
      .json({ success: true, message: "Friend Request Sent" });
  } catch (error) {
    console.error(error);
    next(error);
  }
};
const acceptrequest = async (req, res, next) => {
  try {
    const { requestId, accept } = req.body;
    const request = await Request.findById(requestId)
      .populate("sender", "name")
      .populate("reciever", "name");
    if (!request) return next(new ErrorHandler("Request Not Found", 404));
    if (request.reciever._id.toString() !== req.user.toString())
      return next(
        new ErrorHandler(
          "You are Not authorized to accept or delete this request",
          403
        )
      );
    if (!accept) {
      await request.deleteOne();
      return res
        .status(200)
        .json({ success: true, message: "Request Rejected" });
    }
    const members = [request.sender._id, request.reciever._id];
    await Promise.all([
      Chat.create({
        members,
        name: `${request.sender.name}-${request.reciever.name}`,
      }),
      request.deleteOne(),
    ]);
    emitEvent(req, REFETCH_CHATS, members);
    return res.status(200).json({
      success: true,
      message: "Friend Request Accepted",
      senderId: request.sender._id,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};
const notification = async (req, res, next) => {
  try {
    const request = await Request.find({ reciever: req.user }).populate(
      "sender",
      "name avatar"
    );
    const allRequest = request.map(({ _id, sender }) => ({
      _id,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    }));
    return res.status(200).json({ success: true, message: allRequest });
  } catch (error) {
    next(error);
  }
};
const getfriends = async (req, res, next) => {
  try {
    const chatId = req.query.chatId;
    const chats = await Chat.find({
      members: req.user,
      groupchat: false,
    }).populate("members", "name avatar");
    const friends = chats.map(({ members }) => {
      const otherMember = getOtherMember(members, req.user);
      return {
        _id: otherMember._id,
        name: otherMember.name,
        avatar: otherMember.avatar.url,
      };
    });
    if (chatId) {
      const chat = await Chat.findById(chatId);
      const availableFriends = friends.filter(
        (friend) => !chat.members.includes(friend._id)
      );
      return res
        .status(200)
        .json({ success: true, availableFriends: availableFriends });
    } else {
      return res.status(200).json({ success: true, friends: friends });
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};
export {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendrequest,
  acceptrequest,
  notification,
  getfriends,
};
