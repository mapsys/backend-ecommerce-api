// src/routes/tickets.router.js
import { Router } from "express";
import passport from "passport";
import TicketsController from "../controllers/tickets.controller.js";

export default function ticketsRouter() {
  const router = Router();
  const controller = new TicketsController();
  const auth = passport.authenticate("current", { session: false });

  // Si querés exponer endpoints:
  router.post("/from-cart/:cid", auth, controller.createFromCart); 
  router.get("/:id", auth, controller.getOne);
  router.get("/", auth, controller.listMine);

  return router;
}
