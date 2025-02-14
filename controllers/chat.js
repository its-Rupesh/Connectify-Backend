import {
  ALERT,
  NEW_ATTACHEMENT,
  NEW_MESSAGE_ALERT,
  NEW_MESSAGE,
  REFETCH_CHATS,
} from "../constants/events.js";
import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { getOtherMember } from "../lib/helper.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from ".././utils/utility.js";
const newGroupChat = async (req, res, next) => {
  try {
    // We will get name,member in req object
    // Members array
    const { name, members } = req.body;
    // Memeber should contain req.user->our Group id
    //user is user id peforming at middleware auth
    const allMembers = [...members, req.user];
    await Chat.create({
      name,
      groupchat: true,
      creator: req.user,
      members: allMembers,
    });

    // Emit Event to all Members of Group
    emitEvent(req, ALERT, allMembers, `Welcome to ${name}Group`);
    // Emit Event to all Members of Group Except us
    emitEvent(req, REFETCH_CHATS, members);

    return res.status(201).json({ success: true, message: "Group Created" });
  } catch (error) {
    next(error);
  }
};
// Used for GetMyChat
//1. Get your chat from your id in members fild of chat
//2. The .populate() method in Mongoose is a powerful tool that allows you to fetch related data from a different collection. When you call populate on a Mongoose query, it replaces specified fields in a document with documents from another collection.
//3. .populate(field to be changed,req info to be fetched from different collecton)
const getMyChat = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.user }).populate(
      "members",
      "name avatar"
    );
    // 1.Transformed Chat is Used for group,Individual Chats
    // 2.Add Avatar Component->if groupchat is present then make object of avatar slice is used if groupchat not present then user name will be shown
    // 3.Same with Name
    // 4.member only _id is gathered using reducer
    const transformedChats = chats.map(({ _id, name, groupchat, members }) => {
      const otherMembers = getOtherMember(members, req.user);
      return {
        _id,
        groupchat,
        avatar: groupchat
          ? members.slice(0, 3).map((member) => member.avatar.url)
          : [otherMembers?.avatar?.url],
        name: groupchat ? name : [otherMembers.name],
        members: members.reduce((accumulator, curr) => {
          if (curr._id.toString() != req.user) {
            accumulator.push(curr._id);
          }
          return accumulator;
        }, []),
      };
    });
    if (!chats) return next(new ErrorHandler("No Chats Present", 401));
    return res.status(200).json({ sucess: true, message: transformedChats });
  } catch (error) {
    next(error);
  }
};
const getMyGroups = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      members: req.user,
      groupchat: true,
      creator: req.user,
    }).populate("members", "name avatar");

    const groups = chats.map(({ members, _id, groupchat, name }) => ({
      _id,
      groupchat,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    }));
    return res.status(200).json({ success: true, message: groups });
  } catch (error) {
    next(error);
  }
};
const addMembers = async (req, res, next) => {
  try {
    const { chatId, members } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
    if (!chat.groupchat)
      return next(new ErrorHandler("No Group Chat Available", 404));
    if (chat.creator.toString() != req.user.toString())
      return next(new ErrorHandler("You are Not Allowed To Add Members", 403));
    //For each i, it calls User.findById(i), which returns a promise (because User.findById is asynchronous).The result is an array of promises, not the actual user data yet.
    const allNewMemberPromise = members.map((i) => User.findById(i, "name"));
    //Promise.all takes the array of promises (allNewMemberPromise) and waits for all of them to resolve.Once all the promises resolve, it returns an array containing the resolved values (i.e., the actual user objects fetched by User.findById).
    const allNewMembers = await Promise.all(allNewMemberPromise);
    const uniqueMembers = allNewMembers
      .filter((i) => !chat.members.includes(i._id.toString()))
      .map((i) => i._id);
    chat.members.push(...uniqueMembers);
    if (chat.members > 50)
      return next(new ErrorHandler("Group Members Limit is Reached", 400));
    await chat.save();
    const allUserName = allNewMembers.map((i) => i.name).join(",");
    emitEvent(
      req,
      ALERT,
      chat.members,
      `${allUserName} has been Added to the Group`
    );
    emitEvent(req, REFETCH_CHATS, chat.members);
    return res
      .status(200)
      .json({ success: true, message: "Member Added Successfully" });
  } catch (error) {
    next(error);
  }
};
const removeMembers = async (req, res, next) => {
  try {
    const { userId, chatId } = req.body;
    if (!userId || !chatId) {
      return next(new ErrorHandler("Please Provide User id or chat id"));
    }
    const [chat, userThatWillBeRemoved] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId),
    ]);
    if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
    if (!chat.groupchat)
      return next(new ErrorHandler("This is Not Group Chat", 404));
    if (chat.creator.toString() !== req.user.toString())
      return next(
        new ErrorHandler("You Are Not Allowed To remove Members", 403)
      );
    if (chat.members.length <= 3) {
      return next(new ErrorHandler("Chat Must Contain 3 Members", 400));
    }
    const allChatMembers = chat.members.map((i) => i.toString());
    chat.members = chat.members.filter(
      (member) => member.toString() !== userId.toString()
    );
    await chat.save();
    emitEvent(req, ALERT, chat.members, {
      message: `${userThatWillBeRemoved} has been Removed from the group`,
      chatId,
    });
    emitEvent(req, REFETCH_CHATS, allChatMembers);
    return res
      .status(200)
      .json({ sucess: true, message: "Member Successfully Removed" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
const leaveGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    if (!chat) return next(new ErrorHandler("Chat Not Found", 400));
    if (!chat.groupchat) return next(new ErrorHandler("Not a Group Chat"));
    const remainingMember = chat.members.filter(
      (member) => member.toString() !== req.user.toString()
    );
    if (remainingMember.length < 3)
      return next(new ErrorHandler("Group Must Contain atleast 3 Members"));
    if (chat.creator.toString() === req.user.toString()) {
      const newCreator = remainingMember[0];
      chat.creator = newCreator;
    }
    chat.members = remainingMember;
    const [user] = await Promise.all([
      User.findById(req.user, "name"),
      chat.save(),
    ]);
    emitEvent(req, ALERT, chat.members, {
      message: `User ${user.name} has left the Group`,
      chatId,
    });
    return res.status(200).json({
      success: true,
      message: "You have successfully left the group.",
    });
  } catch (error) {
    next(error);
  }
};
const sendAttachments = async (req, res, next) => {
  try {
    console.log("Working");
    const { chatId } = req.body;
    console.log(chatId);
    const files = req.files || [];
    console.log(files);
    if (files.length < 1)
      return next(new ErrorHandler("Please Provide Attachements", 400));
    if (files.length > 5)
      return next(new ErrorHandler("Files Can't be more than 5", 400));
    const [chat, me] = await Promise.all([
      Chat.findById(chatId),
      User.findById(req.user, "name"),
    ]);
    if (!chat) return next(new ErrorHandler("Chat Not found", 400));

    const attachements = await uploadFilesToCloudinary(files);

    const messageForDB = {
      content: "",
      attachements,
      sender: me._id,
      chat: chatId,
    };
    const messageForRealTime = {
      ...messageForDB,
      sender: {
        _id: me._id,
        name: me.name,
      },
    };
    const message = await Message.create(messageForDB);
    emitEvent(req, NEW_MESSAGE, chat.members, {
      message: messageForRealTime,
      chatId,
    });
    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });
    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};
const getChatDetails = async (req, res, next) => {
  try {
    if (req.query.populate === "true") {
      const chat = await Chat.findById(req.params.id)
        .populate("members", "name avatar")
        .lean();
      if (!chat) return next(new ErrorHandler("Chat Not found", 400));
      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
      }));
      return res.status(200).json({ success: true, chat });
    } else {
      const chat = await Chat.findById(req.params.id);
      if (!chat) return next(new ErrorHandler("Chat Not found", 400));
      return res.status(200).json({ success: true, chat });
    }
  } catch (error) {
    next(error);
  }
};
const renameGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { name } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
    if (!chat.groupchat)
      return next(new ErrorHandler("This Is Not a Group Chat", 404));
    if (chat.creator.toString() !== req.user.toString())
      return next(
        new ErrorHandler("You Are Not Allowed To remove Members", 403)
      );
    chat.name = name;
    await chat.save();
    emitEvent(req, REFETCH_CHATS, chat.members);
    return res
      .status(200)
      .json({ success: true, message: "Group Rename Successfully" });
  } catch (error) {
    next(error);
  }
};
const deleteChat = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
    if (chat.groupchat && chat.creator.toString() !== req.user.toString())
      return next(
        new ErrorHandler("You Are Not Allowed To Delete the Group", 403)
      );
    if (!chat.groupchat && !chat.members.includes(req.user.toString()))
      return next(
        new ErrorHandler("You are Not allowed to delete the chat", 403)
      );
    const messageWithAttachements = await Message.find({
      chat: chatId,
      attachements: { $exists: true, $ne: [] },
    });
    const public_ids = [];
    messageWithAttachements.forEach(({ attachements }) =>
      attachements.forEach(({ public_ids }) => public_ids.push(public_ids))
    );
    await Promise.all([
      deleteFilesFromCloudinary(public_ids),
      chat.deleteOne(),
      Message.deleteMany({ chat: chatId }),
    ]);
    emitEvent(req, REFETCH_CHATS, chat.members);
    return res.status(200).json({
      success: true,
      message: "Chat Deleted Successfully",
    });
  } catch (error) {
    next(error);
  }
};
const getMessages = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { page = 1 } = req.query;
    const chat = await Chat.findById(chatId);
    if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
    if (!chat.members.includes(req.user.toString()))
      return next(
        new ErrorHandler("You are not Allowed to access this Chat", 403)
      );
    const result_per_page = 20;
    const skip = (page - 1) * result_per_page;
    const [messages, totalMessageCount] = await Promise.all([
      Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(result_per_page)
        .populate("sender", "name avatar")
        .lean(),
      Message.countDocuments({ chat: chatId }),
    ]);
    const totalPages = Math.ceil(totalMessageCount / result_per_page) || 0;
    return res
      .status(200)
      .json({ success: true, messages: messages.reverse(), totalPages });
  } catch (error) {
    next(error);
  }
};
export {
  newGroupChat,
  getMyChat,
  getMyGroups,
  addMembers,
  removeMembers,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
};
