// src/repositories/product.repository.js
import ProductDAO from "../dao/product.dao.js";

export default class ProductRepository {
  constructor(dao = new ProductDAO()) {
    this.dao = dao;
  }

  // Lecturas
  async paginate(filter = {}, options = {}) {
    return this.dao.paginate(filter, options);
  }
  async getAll() {
    return this.dao.getProducts();
  }
  async getById(id) {
    return this.dao.getProductById(id);
  }
  async getByCode(code) {
    return this.dao.getProductByCode(code);
  }

  // Escrituras
  async create({ description, price, thumbnail, title, code, stock, category }) {
    return this.dao.addProduct(description, price, thumbnail, title, code, stock, category);
  }
  async update(id, fields) {
    return this.dao.updateProduct(id, fields);
  }
  async remove(id) {
    return this.dao.deleteProduct(id);
  }

  // Utilidades
  async hasStock(id, qty) {
    return this.dao.hasProductStock(id, qty);
  }
}
