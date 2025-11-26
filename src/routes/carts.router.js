// src/routes/carts.router.js
import { Router } from "express";
import { passportCall } from "../middlewares/passportCall.js";
import CartsController from "../controllers/carts.controller.js";

export default function cartsRouter() {
  const router = Router();
  const controller = new CartsController();
  const auth = passportCall("current");

  router.get("/", auth, controller.list);
  router.post("/", auth, controller.create);
  router.get("/:cid", auth, controller.getOne);
  router.post("/:cid/products/:pid", auth, controller.addProduct);
  router.put("/:cid/products", auth, controller.replaceProducts);
  router.put("/:cid/products/:pid", auth, controller.updateQuantity);
  router.delete("/:cid/products/:pid", auth, controller.removeProduct);
  router.put("/:cid/status", auth, controller.updateStatus);
  router.get("/:cid/totals", auth, controller.totals);
  router.delete("/:cid", auth, controller.clear);
  return router;
}
