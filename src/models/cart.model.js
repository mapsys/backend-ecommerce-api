// src/models/cart.model.js
import mongoose from "mongoose";

const productInCartSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Producto", required: true },
  quantity:{ type: Number, required: true, min: [1, "La cantidad debe ser al menos 1"] },
});

const cartSchema = new mongoose.Schema({
  products:  { type: [productInCartSchema], default: [] },
  timestamp: { type: Date, default: Date.now },
  estado:    { type: String, default: "activo", enum: ["activo", "comprado", "cancelado"] },
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
