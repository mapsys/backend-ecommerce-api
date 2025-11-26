// src/routes/carts.router.js
import { Router } from "express";
import { passportCall } from "../middlewares/passportCall.js";
import { ensureObjectId } from "../middlewares/ensureObjectId.js";
import CartsController from "../controllers/carts.controller.js";

export default function cartsRouter() {
  const router = Router();
  const controller = new CartsController();
  const auth = passportCall("current");

  router.get("/", auth, controller.list);
  router.post("/", auth, controller.create);
  router.get("/:cid", auth, ensureObjectId("cid"), controller.getOne);
  router.post("/:cid/products/:pid", auth, ensureObjectId("cid"), ensureObjectId("pid"), controller.addProduct);
  router.put("/:cid/products", auth, ensureObjectId("cid"), controller.replaceProducts);
  router.put("/:cid/products/:pid", auth, ensureObjectId("cid"), ensureObjectId("pid"), controller.updateQuantity);
  router.delete("/:cid/products/:pid", auth, ensureObjectId("cid"), ensureObjectId("pid"), controller.removeProduct);
  router.put("/:cid/status", auth, ensureObjectId("cid"), controller.updateStatus);
  router.get("/:cid/totals", auth, ensureObjectId("cid"), controller.totals);
  router.delete("/:cid", auth, ensureObjectId("cid"), controller.clear);
  return router;
}
