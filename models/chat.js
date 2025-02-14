import mongoose, { Schema, Types, model } from "mongoose";

// Schema for Chat
const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    groupchat: {
      type: Boolean,
      default: false,
    },

    //Types.ObjectId->eg.. A(Id->1234#@) creates B,then B parameter has B{creator:{Id->1234#@}} ref->provides refrence to Database
    creator: {
      type: Types.ObjectId,
      ref: "User",
    },

    members: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
  },

  { timestamps: true }
);

export const Chat = mongoose.models.Chat || model("Chat", schema);
