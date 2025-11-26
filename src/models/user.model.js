// src/models/user.model.js
import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name:  { type: String, required: true },
  email:      {
    type: String, required: true, unique: true,
    validate: { validator: (v) => validator.isEmail(v, { require_tld: true }), message: "Email inválido" },
  },
  age:       { type: Number, min: 0, max: 120, required: true },
  password:  { type: String, required: true },
  cart:      { type: mongoose.Schema.Types.ObjectId, ref: "Cart" },
  role:      { type: String, enum: ["user", "admin"], default: "user" },
}, { toJSON: { transform: (_doc, ret) => { delete ret.password; return ret; } } });

userSchema.pre("save", function(next) {
  if (!this.isModified("password")) return next();
  this.password = bcrypt.hashSync(this.password, 10);
  next();
});

const User = mongoose.model("user", userSchema);
export default User;
