import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Cart from "../models/cart.model.js";
import UserRepository from "../repositories/user.repository.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";
const JWT_SECRET = process.env.JWT_SECRET || "coderSecret";
const RESET_SECRET = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || "coderSecret";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:8080";
const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

function sanitizeUser(u) {
  if (!u) return u;
  const { password, ...rest } = u;
  return rest;
}

export default class UserService {
  constructor(repo = new UserRepository()) {
    this.repo = repo;
  }

  async register({ first_name, last_name, email, password, age }) {
    const required = { first_name, last_name, email, password, age };
    const missing = Object.entries(required).filter(([, v]) => v == null || v === "");
    if (missing.length) {
      const plural = missing.length > 1;
      const list = new Intl.ListFormat("es-AR", { type: "conjunction" }).format(missing.map(([k]) => k));
      const e = new Error(`${plural ? "Los" : "El"} ${plural ? "campos" : "campo"} ${list} ${plural ? "son" : "es"} obligatorio${plural ? "s" : ""}`);
      e.status = 400;
      throw e;
    }

    const exists = await this.repo.existsByEmail(email);
    if (exists) {
      const e = new Error(`El usuario con email ${email} ya existe`);
      e.status = 400;
      throw e;
    }

    const newCart = await Cart.create({ products: [] });
    const role = email.toLowerCase().endsWith("@coder.com") ? "admin" : "user";

    const user = await this.repo.create({ first_name, last_name, email, password, age, role, cart: newCart._id });
    return sanitizeUser(user);
  }

  async login({ email, password }) {
    const user = await this.repo.findByEmail(email);
    if (!user) {
      const e = new Error("Usuario/Contraseña incorrectos");
      e.status = 401;
      throw e;
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      const e = new Error("Usuario/Contraseña incorrectos");
      e.status = 401;
      throw e;
    }
    const safe = sanitizeUser(user);
    const payload = {
      _id: safe._id,
      email: safe.email,
      role: safe.role,
      first_name: safe.first_name,
      last_name: safe.last_name,
      cart: safe.cart,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    return { user: safe, token };
  }

  async setCart(userId, newCartId) {
    if (!isObjectId(userId) || !isObjectId(newCartId)) {
      const e = new Error("ID inválido");
      e.status = 400;
      throw e;
    }
    const updated = await this.repo.setCart(userId, newCartId);
    if (!updated) {
      const e = new Error("Usuario no encontrado");
      e.status = 404;
      throw e;
    }
    return sanitizeUser(updated);
  }

  async getCurrentFromDB(userId) {
    if (!isObjectId(userId)) {
      const e = new Error("ID inválido");
      e.status = 400;
      throw e;
    }
    const user = await this.repo.findById(userId);
    if (!user) {
      const e = new Error("Usuario no encontrado");
      e.status = 404;
      throw e;
    }
    return sanitizeUser(user);
  }

  async findByIdSafe(id) {
    if (!isObjectId(id)) return null;
    const user = await this.repo.findByIdLean(id);
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  }

  async requestPasswordReset(email) {
    const user = await this.repo.findByEmail(email);
    if (!user) return;
    const token = jwt.sign({ uid: user._id }, RESET_SECRET, { expiresIn: "1h" });
    const link = `${APP_BASE_URL}/password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(user.email, link);
  }

  async resetPassword({ tokenPlain, newPassword }) {
    let payload;
    try {
      payload = jwt.verify(tokenPlain, RESET_SECRET);
    } catch {
      const e = new Error("Enlace inválido o expirado");
      e.status = 400;
      throw e;
    }

    const user = await this.repo.findById(payload.uid);
    if (!user) {
      const e = new Error("Usuario no encontrado");
      e.status = 404;
      throw e;
    }

    const same = await bcrypt.compare(newPassword, user.password);
    if (same) {
      const e = new Error("La nueva contraseña no puede ser igual a la anterior.");
      e.status = 400;
      throw e;
    }

    // Usamos updatePassword que ejecuta el hook pre('save') para hashear
    await this.repo.updatePassword(user._id, newPassword);
  }
}
