// src/daos/cart.dao.js
import mongoose from "mongoose";
import Cart from "../models/cart.model.js";

export default class CartDAO {
  async findAll() {
    return await Cart.find().lean();
  }

  async findById(id, { populate = false } = {}) {
    const q = Cart.findById(id);
    if (populate) q.populate("products.product");
    const cart = await q.lean();
    return cart; // puede ser null
  }

  async create() {
    const doc = await Cart.create({ products: [] });
    return doc.toObject();
  }

  async addProduct(cartId, productId, qty) {
    const cart = await Cart.findById(cartId);
    if (!cart) return null;

    const idx = cart.products.findIndex((p) => p.product.toString() === productId);
    if (idx !== -1) {
      cart.products[idx].quantity += qty;
    } else {
      cart.products.push({
        product: new mongoose.Types.ObjectId(productId),
        quantity: qty,
      });
    }
    await cart.save();
    return cart.toObject();
  }

  async removeProduct(cartId, productId) {
    const cart = await Cart.findById(cartId);
    if (!cart) return null;

    const idx = cart.products.findIndex((p) => p.product.toString() === productId);
    if (idx === -1) return undefined; // carrito ok, producto no estaba
    cart.products.splice(idx, 1);
    await cart.save();
    return cart.toObject();
  }

  async replaceProducts(cartId, products) {
    const cart = await Cart.findById(cartId);
    if (!cart) return null;

    cart.products = products.map((p) => ({
      product: new mongoose.Types.ObjectId(p.product),
      quantity: p.quantity,
    }));

    await cart.save();
    return cart.toObject();
  }

  async updateQuantity(cartId, productId, quantity) {
    const cart = await Cart.findById(cartId);
    if (!cart) return null;

    const idx = cart.products.findIndex((p) => p.product.toString() === productId);
    if (idx === -1) return undefined;

    if (quantity <= 0) {
      cart.products.splice(idx, 1);
    } else {
      cart.products[idx].quantity = quantity;
    }
    await cart.save();
    return cart.toObject();
  }

  async updateStatus(cartId, status) {
    const cart = await Cart.findByIdAndUpdate(cartId, { $set: { estado: status } }, { new: true, lean: true, runValidators: true, strict: "throw" });
    return cart; // null si no existe
  }
  async clearProducts(cartId) {
    const updated = await Cart.findByIdAndUpdate(
      cartId,
      { $set: { products: [] } },
      { new: true, lean: true } // runValidators/strict no hacen falta acá
    );
    return updated; // null si no existe
  }
  async calculateTotals(cartId) {
    const result = await Cart.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(cartId) } },
      { $unwind: { path: "$products", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "productos", // colección de "Producto"
          localField: "products.product",
          foreignField: "_id",
          as: "productoInfo",
        },
      },
      { $unwind: { path: "$productoInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalCantidad: { $sum: { $ifNull: ["$products.quantity", 0] } },
          totalPrecio: {
            $sum: {
              $cond: [{ $and: [{ $gt: ["$products.quantity", 0] }, { $ifNull: ["$productoInfo.price", false] }] }, { $multiply: ["$products.quantity", "$productoInfo.price"] }, 0],
            },
          },
        },
      },
      { $project: { _id: 0, totalCantidad: 1, totalPrecio: 1 } },
    ]);

    return result[0] || { totalCantidad: 0, totalPrecio: 0 };
  }
}
