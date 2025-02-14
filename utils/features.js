import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { filePath, getSockets } from "../lib/helper.js";
// MongoDB Connection
const connectDB = (url) => {
  mongoose
    .connect(url, { dbName: "Connectify" })
    .then((data) => console.log(`MongoDb Connected to ${data.connection.host}`))
    .catch((err) => {
      throw err;
    });
};

// cookie Options
const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

// cookies sending(res,user,201,"user created")
const sendToken = (res, user, code, message) => {
  // sign() function, which creates a token from jwt.
  // syntax jwt.sign(payload,secretOrPrivateKey,options)
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

  // .cookie("Cookie Name");
  return res
    .status(code)
    .cookie("Connectify-Token", token, cookieOptions)
    .json({
      success: true,
      message,
      user,
    });
};
const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const userSocket = getSockets(users);
  io.to(userSocket).emit(event, data);
};
const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });
  });
  try {
    const results = await Promise.all(uploadPromises);
    const formatedResult = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
    return formatedResult;
  } catch (error) {
    console.log("error", error);
    throw new Error(`Error Ocuured at Uploading Files `, error);
  }
};
const deleteFilesFromCloudinary = async () => {};
export {
  connectDB,
  sendToken,
  emitEvent,
  deleteFilesFromCloudinary,
  uploadFilesToCloudinary,
  cookieOptions,
};
