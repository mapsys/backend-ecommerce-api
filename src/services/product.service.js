// src/services/product.service.js
import ProductRepository from "../repositories/product.repository.js";

const ALLOWED_FIELDS = ["description", "price", "category", "thumbnails", "title", "code", "stock", "status"];

export default class ProductService {
  constructor(repo = new ProductRepository()) {
    this.repo = repo;
  }

  _validateCreate(data) {
    const required = ["title", "description", "price", "code", "stock", "category"];
    const missing = required.filter((k) => data[k] === undefined || data[k] === null || data[k] === "");
    if (missing.length) {
      const err = new Error(
        `${missing.length > 1 ? "Los" : "El"} campo${missing.length > 1 ? "s" : ""} ${missing.join(", ")} ${missing.length > 1 ? "son" : "es"} obligatorio${missing.length > 1 ? "s" : ""}`
      );
      err.status = 400;
      throw err;
    }
    if (typeof data.price !== "number" || data.price <= 0) {
      const err = new Error("El precio debe ser un número positivo");
      err.status = 400;
      throw err;
    }
    if (typeof data.stock !== "number" || data.stock < 0) {
      const err = new Error("El stock debe ser un número no negativo");
      err.status = 400;
      throw err;
    }
  }

  async paginate({ limit = 10, page = 1, sort, query }) {
    const filtro = {};
    if (query) {
      if (query === "disponibles") filtro.stock = { $gt: 0 };
      else filtro.category = query;
    }

    const options = {
      limit: parseInt(limit),
      page: parseInt(page),
      sort: sort === "asc" ? { price: 1 } : sort === "desc" ? { price: -1 } : undefined,
      lean: true,
    };

    return this.repo.paginate(filtro, options);
  }

  async getById(id) {
    const prod = await this.repo.getById(id);
    if (!prod) {
      const err = new Error("Producto no encontrado");
      err.status = 404;
      throw err;
    }
    return prod;
  }

  async create({ description, price, thumbnail, title, code, stock, category }) {
    const data = { description, price, thumbnail, title, code, stock, category };
    this._validateCreate(data);
    return this.repo.create(data);
  }

  async update(id, updatedFields = {}) {
    if (Object.keys(updatedFields).length === 0) {
      const e = new Error("No hay campos para actualizar");
      e.status = 400;
      throw e;
    }

    const invalid = Object.keys(updatedFields).filter((k) => !ALLOWED_FIELDS.includes(k));
    if (invalid.length) {
      const e = new Error(`Campos no válidos: ${invalid.join(", ")}`);
      e.status = 400;
      throw e;
    }

    if ("price" in updatedFields) {
      if (typeof updatedFields.price !== "number" || updatedFields.price <= 0) {
        const e = new Error("El precio debe ser un número positivo");
        e.status = 400;
        throw e;
      }
    }
    if ("stock" in updatedFields) {
      if (typeof updatedFields.stock !== "number" || updatedFields.stock < 0) {
        const e = new Error("El stock debe ser un número no negativo");
        e.status = 400;
        throw e;
      }
    }
    if ("thumbnails" in updatedFields && !Array.isArray(updatedFields.thumbnails)) {
      updatedFields.thumbnails = [updatedFields.thumbnails];
    }

    const prod = await this.repo.update(id, updatedFields);
    if (!prod) {
      const err = new Error("Producto no encontrado");
      err.status = 404;
      throw err;
    }
    return prod;
  }

  async remove(id) {
    const prod = await this.repo.remove(id);
    if (!prod) {
      const err = new Error("Producto no encontrado");
      err.status = 404;
      throw err;
    }
    return prod;
  }

  async listAll() {
    return this.repo.getAll();
  }
}
