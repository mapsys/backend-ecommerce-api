// src/routes/products.router.js
import { Router } from "express";
import ProductsController from "../controllers/products.controller.js";
import { passportCall } from "../middlewares/passportCall.js";
import { authAdmin } from "../middlewares/auth.js";

export default function productsRouter() {
  const router = Router();
  const controller = new ProductsController();

  const auth = passportCall("current");

  router.get("/", auth, controller.list);
  router.get("/:id", auth, controller.getOne);
  router.post("/", auth, authAdmin, controller.create);
  router.put("/:id", auth, controller.update);
  router.delete("/:id", auth, authAdmin, controller.remove);

  return router;
}
