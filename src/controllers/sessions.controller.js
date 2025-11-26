// src/controllers/sessions.controller.js
import jwt from "jsonwebtoken"; // ✅ ESM (no uses require)
import UserService from "../services/user.service.js";
import UserDTO from "../dtos/user.dto.js";

const JWT_SECRET = process.env.JWT_SECRET || "coderSecret";
const cookieOpts = {
  httpOnly: true,
  ...(process.env.NODE_ENV === "production" ? { secure: true, sameSite: "strict" } : { sameSite: "lax" }),
  maxAge: 60 * 60 * 1000, // 1h
};

export default class SessionsController {
  constructor(service = new UserService()) {
    this.service = service;
  }

  // Si usás passportCall("registro"), req.user ya viene del strategy
  registerFromPassport = async (req, res, next) => {
    try {
      const dto = new UserDTO(req.user); // ✅ no exponemos password/age
      res.status(201).json({
        message: `Registro exitoso para ${dto.first_name || dto.email}`,
        usuarioCreado: dto,
      });
    } catch (e) {
      next(e);
    }
  };

  // Alternativa sin Passport
  registerDirect = async (req, res, next) => {
    try {
      const user = await this.service.register(req.body);
      const dto = new UserDTO(user);
      res.status(201).json({ message: "Registro exitoso", usuarioCreado: dto });
    } catch (e) {
      next(e);
    }
  };

  // Con passportCall("login") ya validaste credenciales → sólo firmá el token
  loginFromPassport = async (req, res, next) => {
    try {
      const dto = new UserDTO(req.user);
      const payload = {
        _id: dto._id,
        email: dto.email, // si no querés exponer email, sacalo del DTO y del payload
        role: dto.role,
        first_name: dto.first_name,
        last_name: dto.last_name,
        cart: dto.cart,
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
      res.cookie("cookieToken", token, cookieOpts);
      res.status(200).json({ usuarioLogueado: dto });
    } catch (e) {
      next(e);
    }
  };

  // Alternativa sin Passport (usa el service para validar + generar token)
  loginDirect = async (req, res, next) => {
    try {
      const { user, token } = await this.service.login(req.body);
      const dto = new UserDTO(user);
      res.cookie("cookieToken", token, cookieOpts);
      res.status(200).json({ usuarioLogueado: dto });
    } catch (e) {
      next(e);
    }
  };

  logout = async (_req, res, _next) => {
    res.clearCookie("cookieToken");
    res.status(200).json({ message: "Sesión cerrada correctamente" });
  };

  setCart = async (req, res, next) => {
    try {
      const updated = await this.service.setCart(req.user._id, req.body.newCartId);
      const dto = new UserDTO(updated);
      res.json({ message: "Carrito del usuario actualizado", user: dto });
    } catch (e) {
      next(e);
    }
  };

  // /current consultando DB para info fresca
  current = async (req, res, next) => {
    try {
      const dbUser = await this.service.getCurrentFromDB(req.user._id);
      const dto = new UserDTO(dbUser);
      res.status(200).json({ user: dto });
    } catch (e) {
      next(e);
    }
  };

  // /current (si preferís responder con lo del token directamente)
  currentFromToken = async (req, res, next) => {
    try {
      const dto = new UserDTO(req.user);
      res.status(200).json({ user: dto });
    } catch (e) {
      next(e);
    }
  };
  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;
      await this.service.requestPasswordReset(email);;
      res.status(200).json({ message: "Si el correo existe, te enviamos un enlace para restablecer la contraseña." });
    } catch (e) {
      next(e);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const { token, password } = req.body;
      await this.service.resetPassword({ tokenPlain: token, newPassword: password });
      res.status(200).json({ message: "Contraseña actualizada correctamente" });
    } catch (e) {
      next(e);
    }
  };
}
