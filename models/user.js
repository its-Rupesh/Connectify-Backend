import { hash } from "bcrypt";
import mongoose, { Schema, model } from "mongoose";

// Schema for User When he login || Sign in
// select matlab jab  koi user fo call kare toh password nahi jana chaiye
const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    avatar: {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    },
  },
  // timestamp creates 2 col created at ,Updated at
  { timestamps: true }
);
// type of middleware that allows you to run some code before a document is saved to the database. use for validating and hashing
schema.pre("save", async function (next) {
  // if only when password field saved then rehash if not call next ()->middleware[eg... return ;]
  if (!this.isModified("password")) return next();
  this.password = await hash(this.password, 10);
});

// models is an object in Mongoose that holds references to all models c
// models.Users check if there is already model named User
export const User = mongoose.models.User || model("User", schema);
