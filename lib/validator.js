import { body, check, param, query, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(",");
  if (errors.isEmpty()) return next();
  else next(new ErrorHandler(errorMessages, 400));
};
const registerValidator = () => [
  body("name", "Please Enter Name").notEmpty(),
  body("username", "Please Enter Username").notEmpty(),
  body("password", "Please Enter Password").notEmpty(),
  body("bio", "Please Enter bio").notEmpty(),
];
const loginValidator = () => [
  body("username", "Please Enter Username").notEmpty(),
  body("password", "Please Enter Password").notEmpty(),
];
const newGroupValidator = () => [
  body("name", "Please Enter name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Member Must be between 2-100"),
];
const AddMemberValidator = () => [
  body("chatId", "Please Enter chat Id").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Member Must be between 1-97"),
];
const RemoveMemberValidator = () => [
  body("userId", "Please Enter User Id").notEmpty(),
  body("chatId", "Please Enter Chat Id").notEmpty(),
];
const leaveGroupValidator = () => [param("id", "Invalid Chat Id").isMongoId()];
const sendAttachmentsValidator = () => [
  body("chatId", "Please Enter Chat Id").notEmpty(),
];
const getMessagesValidator = () => [param("id", "Invalid Chat Id").notEmpty()];
const getChatValidator = () => [param("id", "Invalid Chat Id").notEmpty()];
const renameValidator = () => [
  param("id", "Invalid Chat Id").isMongoId(),
  body("name", "Please Enter Name").notEmpty(),
];
const deleteChatHandler = () => [param("id", "Invalid Chat Id").isMongoId()];
const searchUserValidator = () => [
  query("name", "Please Enter name").notEmpty(),
];
const sendrequestValidator = () => [
  body("userId", "Please Enter UserId").notEmpty(),
];
const acceptrequestValidator = () => [
  body("requestId", "Please Enter Request Id").notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("Please Add Accept")
    .isBoolean()
    .withMessage("Accept Must be boolean"),
];
const adminLoginValidator = () => [
  body("secretKey", "Please Enter SecretKey").notEmpty(),
];
export {
  registerValidator,
  loginValidator,
  validateHandler,
  newGroupValidator,
  AddMemberValidator,
  RemoveMemberValidator,
  leaveGroupValidator,
  sendAttachmentsValidator,
  getMessagesValidator,
  getChatValidator,
  renameValidator,
  deleteChatHandler,
  searchUserValidator,
  sendrequestValidator,
  acceptrequestValidator,
  adminLoginValidator,
};
