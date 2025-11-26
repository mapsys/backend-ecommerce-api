import CartDAO from "../dao/cart.dao.js";

export default class CartRepository {
  constructor(dao = new CartDAO()) {
    this.dao = dao;
  }

  // Lecturas
  async findAll() { return this.dao.findAll(); }
  async findById(id, opts) { return this.dao.findById(id, opts); }
  async calculateTotals(cartId) { return this.dao.calculateTotals(cartId); }

  // Escrituras / mutaciones
  async create() { return this.dao.create(); }
  async addProduct(cartId, productId, qty) { return this.dao.addProduct(cartId, productId, qty); }
  async removeProduct(cartId, productId) { return this.dao.removeProduct(cartId, productId); }
  async replaceProducts(cartId, products) { return this.dao.replaceProducts(cartId, products); }
  async updateQuantity(cartId, productId, quantity) { return this.dao.updateQuantity(cartId, productId, quantity); }
  async updateStatus(cartId, status) { return this.dao.updateStatus(cartId, status); }
  async clearProducts(cartId) { return this.dao.clearProducts(cartId); }
}
