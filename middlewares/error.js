import { envMode } from "../app.js";

// Error Handling
const errorMiddleware = (err, req, res, next) => {
  err.message = err.message || "Internal Error";
  err.statusCode = err.statusCode || 500;
  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern).join(",");
    err.message = `Duplicate field ${error}`;
    err.statusCode = 400;
  }
  if (err.name === "CastError") {
    const errorPath = err.path;
    err.message = `Invalid Format of ${errorPath}`;
    err.statusCode = 400;
  }
  return res.status(err.statusCode).json({
    success: false,
    message: envMode === "DEVELOPEMENT" ? err : err.message,
  });
};

const TryCatch = (passFuncn) => async (req, res, next) => {
  try {
    passFuncn(req, res, next);
  } catch (error) {
    next(error);
  }
};
export { errorMiddleware, TryCatch };
