import { userSocketIDs } from "../app.js";

const getOtherMember = (members, userId) => {
  return members.find((member) => member._id.toString() !== userId.toString());
};
const getSockets = (users) => {
  const sockets = users.map((user) => userSocketIDs.get(user.toString()));
  return sockets;
};
const getSocketsForUser = (users) => {
  const sockets = users
    .map((user) => userSocketIDs.get(user.toString()))
    .filter(Boolean); // Filters out undefined values
  return sockets;
};
const filePath = (file) => {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};
export { getOtherMember, getSockets, filePath, getSocketsForUser };
