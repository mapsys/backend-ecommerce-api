// src/routes/sessions.router.js
import { Router } from "express";
import { passportCall } from "../middlewares/passportCall.js";
import SessionsController from "../controllers/sessions.controller.js";

export default function sessionsRouter() {
  const router = Router();
  const controller = new SessionsController();

  // Registro
  router.post("/register", passportCall("registro"), controller.registerFromPassport);
  // o sin passport:
  // router.post("/register", controller.registerDirect);

  // Login
  router.post("/login", passportCall("login"), controller.loginFromPassport);
  // o sin passport:
  // router.post("/login", controller.loginDirect);

  // Logout
  router.get("/logout", controller.logout);

  // Actualizar cart del usuario (protegido por JWT "current")
  router.put("/cart", passportCall("current"), controller.setCart);

  // Current desde token (sin ir a DB)
  router.get("/current", passportCall("current"), controller.currentFromToken);
  // o si querés leer de DB:
  // router.get("/current", passportCall("current"), controller.current);
  // Password reset
  router.post("/forgot-password", controller.forgotPassword);
  router.post("/reset-password", controller.resetPassword);
  return router;
}
