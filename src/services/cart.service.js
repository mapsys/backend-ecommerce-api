import mongoose from "mongoose";
import CartRepository from "../repositories/cart.repository.js";
import Producto from "../models/producto.model.js";

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const ALLOWED_STATUS = ["activo", "comprado", "cancelado"];

export default class CartService {
  constructor(repo = new CartRepository()) {
    this.repo = repo;
  }

  async list() {
    return await this.repo.findAll();
  }

  async getById(id, opts) {
    const cart = await this.repo.findById(id, opts);
    if (!cart) {
      const e = new Error("Carrito no encontrado");
      e.status = 404;
      throw e;
    }
    return cart;
  }

  async create() {
    return await this.repo.create();
  }

  // cart.service.js
  async addProduct(cartId, productId, qty) {
    if (!isObjectId(cartId) || !isObjectId(productId)) {
      const e = new Error("ID inválido");
      e.status = 400;
      throw e;
    }
    if (typeof qty !== "number" || qty <= 0) {
      const e = new Error("La cantidad debe ser un número mayor a 0");
      e.status = 400;
      throw e;
    }

    // Traigo carrito y producto
    const [cart, prod] = await Promise.all([
      this.repo.findById(cartId), // tu DAO/Repo ya lo tiene
      Producto.findById(productId).lean(),
    ]);

    if (!cart) {
      const e = new Error("Carrito no encontrado");
      e.status = 404;
      throw e;
    }
    if (!prod) {
      const e = new Error("Producto no encontrado");
      e.status = 404;
      throw e;
    }

    // Cantidad que ya había en el carrito de ese producto
    const existingQty = cart.products?.find((p) => p.product.toString() === productId)?.quantity ?? 0;
    const desired = existingQty + qty;

    if (!prod.status || desired > prod.stock) {
      const e = new Error(`No hay suficiente stock. Disponible: ${prod.stock}. Ya en carrito: ${existingQty}.`);
      e.status = 400;
      throw e;
    }

    const updated = await this.repo.addProduct(cartId, productId, qty);
    return updated;
  }

  async removeProduct(cartId, productId) {
    if (!isObjectId(cartId) || !isObjectId(productId)) {
      const e = new Error("ID inválido");
      e.status = 400;
      throw e;
    }
    const res = await this.repo.removeProduct(cartId, productId);
    if (res === null) {
      const e = new Error("Carrito no encontrado");
      e.status = 404;
      throw e;
    }
    if (res === undefined) {
      const e = new Error("Producto no encontrado en el carrito");
      e.status = 404;
      throw e;
    }
    return res;
  }

  async clear(cartId) {
    const updated = await this.repo.clearProducts(cartId);
    if (!updated) {
      const e = new Error("Carrito no encontrado");
      e.status = 404;
      throw e;
    }
    return updated;
  }

  async replaceProducts(cartId, products) {
    if (!Array.isArray(products) || products.length === 0) {
      const e = new Error("Debe enviar una lista de productos");
      e.status = 400;
      throw e;
    }

    for (const p of products) {
      if (!isObjectId(p.product)) {
        const e = new Error("ID de producto inválido");
        e.status = 400;
        throw e;
      }
      if (typeof p.quantity !== "number" || p.quantity <= 0) {
        const e = new Error("La cantidad debe ser mayor a 0");
        e.status = 400;
        throw e;
      }
      const exists = await Producto.exists({ _id: p.product });
      if (!exists) {
        const e = new Error("Producto no encontrado");
        e.status = 404;
        throw e;
      }
    }

    const updated = await this.repo.replaceProducts(cartId, products);
    if (!updated) {
      const e = new Error("Carrito no encontrado");
      e.status = 404;
      throw e;
    }
    return updated;
  }

  // cart.service.js
  async updateQuantity(cartId, productId, quantity) {
    if (!isObjectId(cartId) || !isObjectId(productId)) {
      const e = new Error("ID inválido");
      e.status = 400;
      throw e;
    }
    if (typeof quantity !== "number") {
      const e = new Error("La cantidad debe ser un número");
      e.status = 400;
      throw e;
    }

    if (quantity > 0) {
      const prod = await Producto.findById(productId).lean();
      if (!prod) {
        const e = new Error("Producto no encontrado");
        e.status = 404;
        throw e;
      }
      if (!prod.status || quantity > prod.stock) {
        const e = new Error(`No hay suficiente stock. Disponible: ${prod.stock}.`);
        e.status = 400;
        throw e;
      }
    }

    const res = await this.repo.updateQuantity(cartId, productId, quantity);
    if (res === null) {
      const e = new Error("Carrito no encontrado");
      e.status = 404;
      throw e;
    }
    if (res === undefined) {
      const e = new Error("Producto no encontrado en el carrito");
      e.status = 404;
      throw e;
    }
    return res;
  }

  async updateStatus(cartId, status) {
    if (!ALLOWED_STATUS.includes(status)) {
      const e = new Error(`Estado inválido. Valores permitidos: ${ALLOWED_STATUS.join(", ")}`);
      e.status = 400;
      throw e;
    }

    if (status !== "comprado") {
      const updated = await this.repo.updateStatus(cartId, status);
      if (!updated) {
        const e = new Error("Carrito no encontrado");
        e.status = 404;
        throw e;
      }
      return updated;
    }

    // Status "comprado": validar y descontar stock
    const cart = await this.repo.findById(cartId, { populate: true });
    if (!cart) {
      const e = new Error("Carrito no encontrado");
      e.status = 404;
      throw e;
    }

    // 1) Validación final de stock
    for (const item of cart.products) {
      const prod = await Producto.findById(item.product._id).lean();
      if (!prod || !prod.status || prod.stock < item.quantity) {
        const e = new Error(`Stock insuficiente para ${item.product.title}`);
        e.status = 400;
        throw e;
      }
    }

    // 2) Descuento atómico (simple) por ítem
    for (const item of cart.products) {
      const res = await Producto.updateOne({ _id: item.product._id, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } });
      if (res.matchedCount !== 1 || res.modifiedCount !== 1) {
        const e = new Error(`No se pudo descontar stock para ${item.product.title}`);
        e.status = 409; // conflicto de concurrencia
        throw e;
      }
    }

    // 3) Marcar carrito como comprado
    const updated = await this.repo.updateStatus(cartId, "comprado");
    return updated;
  }

  async totals(cartId) {
    // valida existencia del carrito primero
    const exists = await this.repo.findById(cartId);
    if (!exists) {
      const e = new Error("Carrito no encontrado");
      e.status = 404;
      throw e;
    }
    return await this.repo.calculateTotals(cartId);
  }
}
