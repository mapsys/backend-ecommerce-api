import Cart from "../models/cart.model.js";
import mongoose from "mongoose";
export default class CartManager {
  constructor() {
    // En Mongo ya no necesitas ruta ni manejo manual de ids
  }

  // Obtener todos los carritos
  async getCarts() {
    const carts = await Cart.find();
    return carts;
  }

  // Obtener carrito por _id
  async getCartById(id) {
    const cart = await Cart.findById(id);
    if (!cart) {
      throw new Error("Carrito no encontrado");
    }
    return cart;
  }

  // Crear un nuevo carrito vacío
  async addCart() {
    const newCart = new Cart({ products: [] });
    await newCart.save();
    return newCart;
  }

  async calcularTotales(cartId) {
    try {
      const result = await Cart.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(cartId) } },
        { $unwind: "$products" },
        {
          $lookup: {
            from: "productos", // asegurate que esta sea tu colección real
            localField: "products.product",
            foreignField: "_id",
            as: "productoInfo",
          },
        },
        { $unwind: "$productoInfo" },
        {
          $group: {
            _id: null,
            totalCantidad: { $sum: "$products.quantity" },
            totalPrecio: {
              $sum: {
                $multiply: ["$products.quantity", "$productoInfo.price"],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalCantidad: 1,
            totalPrecio: 1,
          },
        },
      ]);

      return result[0] || { totalCantidad: 0, totalPrecio: 0 };
    } catch (error) {
      console.error("Error en calcularTotales:", error.message);
      throw error;
    }
  }

  // Agregar producto a carrito existente
  async addProductToCart(cartId, productId, qty) {
    if (!cartId || !productId || typeof qty !== "number" || qty <= 0) {
      throw new Error("Todos los campos son obligatorios y la cantidad debe ser mayor a 0");
    }

    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error("Carrito no encontrado");
    }

    const productIndex = cart.products.findIndex((p) => p.product.toString() === productId);
    if (productIndex !== -1) {
      // Si ya existe, sumar la cantidad
      cart.products[productIndex].quantity += qty;
    } else {
      // Si no existe, agregar al array
      cart.products.push({
        product: new mongoose.Types.ObjectId(productId),
        quantity: qty,
      });
    }

    await cart.save();
    return cart;
  }

  async deleteProductFromCart(cartId, productId) {
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error("Carrito no encontrado");
    }

    const productIndex = cart.products.findIndex((p) => p.product.toString() === productId);
    if (productIndex === -1) {
      throw new Error("Producto no encontrado en el carrito");
    }

    cart.products.splice(productIndex, 1);
    await cart.save();
    return cart;
  }
  async updatecartProducts(cartId, products) {
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error("Carrito no encontrado");
    }

    cart.products = products.map((product) => ({
      product: new mongoose.Types.ObjectId(product.product),
      quantity: product.quantity,
    }));

    await cart.save();
    return cart;
  }

  async updateProductQty(cartId, productId, quantity) {
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error("Carrito no encontrado");
    }

    const productIndex = cart.products.findIndex((p) => p.product.toString() === productId);
    if (productIndex === -1) {
      throw new Error("Producto no encontrado en el carrito");
    }

    if (quantity <= 0) {
      cart.products.splice(productIndex, 1); // Eliminar producto si la cantidad es 0 o menor
    } else {
      cart.products[productIndex].quantity = quantity; // Actualizar cantidad
    }

    await cart.save();
    return cart;
  }

  async updateCartStatus(cartId, status) {
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error("Carrito no encontrado");
    }

    cart.estado = status;
    await cart.save();
    return cart;
  }
}
