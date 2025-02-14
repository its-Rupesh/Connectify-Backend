import mongoose, { Schema, Types, model } from "mongoose";

// Schema for Messages
const schema = new Schema(
  {
    content: String,
    attachements: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    sender: {
      // creator field stores the ObjectId of the User who Sends the Message
      type: Types.ObjectId,
      ref: "User", // Reference to the User model
      required: "true",
    },
    chat: {
      // creator field stores the ObjectId of the chat in thr Chat db
      type: Types.ObjectId,
      ref: "Chat",
      required: "true",
    },
  },
  { timestamps: true }
);

// models.Users check if there is already model named Message
export const Message = mongoose.models.Message || model("Message", schema);
