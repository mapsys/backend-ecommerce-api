// src/middlewares/ensureObjectId.js
import mongoose from "mongoose";

export const ensureObjectId = (param = "id") => (req, res, next) => {
  const id = req.params[param];
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ status: "error", error: "ID inválido" });
  }
  next();
};
