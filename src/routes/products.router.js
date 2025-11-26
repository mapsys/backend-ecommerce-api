// src/routes/products.router.js
import { Router } from "express";
import ProductsController from "../controllers/products.controller.js";
import { passportCall } from "../middlewares/passportCall.js";
import { ensureObjectId } from "../middlewares/ensureObjectId.js";
import { authAdmin } from "../middlewares/auth.js";
export default function productsRouter() {
  const router = Router();
  const controller = new ProductsController();

  const auth = passportCall("current");

  router.get("/", auth, controller.list);
  router.get("/:id", auth, ensureObjectId(),controller.getOne);
  router.post("/", auth, authAdmin, controller.create);
  router.put("/:id", auth, ensureObjectId(),controller.update);
  router.delete("/:id", auth, authAdmin, ensureObjectId(),controller.remove);

  return router;
}
