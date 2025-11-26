import fs from "fs/promises";
import { join } from "path";

export default class CartManager {
  constructor(ruta) {
    this.carts = [];
    this.currentId = 0;
    this.file = join(ruta, "carts.json");
  }

  async #loadCarts() {
    try {
      const data = await fs.readFile(this.file, "utf-8");
      this.carts = JSON.parse(data);
      this.currentId = this.carts.length > 0 ? this.carts[this.carts.length - 1].id : 0;
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("El archivo de carritos no existe, se creara vacio");
        this.carts = [];
        this.currentId = 0;
        await fs.writeFile(this.file, JSON.stringify([], null, 2));
      }
      console.error(error);
    }
  }

  async #saveCarts() {
    try {
      await fs.writeFile(this.file, JSON.stringify(this.carts, null, 2));
    } catch (error) {
      console.error(error);
    }
  }

  static async crear(ruta) {
    const instancia = new CartManager(ruta);
    await instancia.#loadCarts();
    return instancia;
  }
  getCarts() {
    return this.carts;
  }
  getCartById(id) {
    const cart = this.carts.find((p) => p.id === id);
    if (!cart) {
      throw new Error("Carrito no encontrado");
    }
    return cart;
  }

  async addCart() {
    const newCart = {
      id: ++this.currentId,
      products: [],
    };
    this.carts.push(newCart);
    await this.#saveCarts();
    return newCart;
  }

  async addProductToCart(cartId, productId, qty) {
    if (!cartId || !productId || typeof qty !== "number" || qty <= 0) {
      throw new Error("Todos los campos son obligatorios y la cantidad debe ser mayor a 0");
    }
    const cartIndex = this.carts.findIndex((p) => p.id === cartId);
    if (cartIndex === -1) {
      throw new Error("Carrito no encontrado");
    }
    // debo verificar si el producto ya existe en el carrito
    const cart = this.carts[cartIndex];
    const productIndex = cart.products.findIndex((p) => p.id === productId);
    if (productIndex !== -1) {
      // Si el producto ya existe, actualizo la cantidad
      cart.products[productIndex].qty += qty;
    } else {
      // Si no existe, lo agrego con la cantidad especificada
      cart.products.push({ id: productId, qty });
    }
    await this.#saveCarts();
    return cart;
  }
}
