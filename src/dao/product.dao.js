// src/daos/product.dao.js
import Producto from "../models/producto.model.js";

export default class ProductDAO {
  constructor() {}

  async paginate(filtro = {}, opciones = {}) {
    try {
      const resultado = await Producto.paginate(filtro, { lean: true, ...opciones });
      return resultado;
    } catch (error) {
      throw new Error(`Error al paginar productos: ${error.message}`);
    }
  }

  async getProducts() {
    return await Producto.find().lean();
  }

  async addProduct(description, price, thumbnail, title, code, stock, categoria) {
    if (!description || !price || !title || !code || stock === undefined) {
      throw new Error("Los campos Title, Description, Price, Code y Stock son obligatorios");
    }
    if (typeof price !== "number" || price <= 0) {
      throw new Error("El precio debe ser un número positivo");
    }
    if (typeof stock !== "number" || stock < 0) {
      throw new Error("El stock debe ser un número no negativo");
    }

    const newProduct = new Producto({
      description,
      price,
      thumbnails: thumbnail ? [thumbnail] : [],
      title,
      code,
      stock,
      status: stock > 0,
      category: categoria,
    });

    try {
      await newProduct.save();
      return newProduct.toObject();
    } catch (error) {
      throw error;
    }
  }

  async getProductByCode(code) {
    const product = await Producto.findOne({ code }).lean();
    if (!product) throw new Error("Producto no encontrado");
    return product;
  }

  async getProductById(id) {
    const product = await Producto.findById(id).lean();
    if (!product) throw new Error("Producto no encontrado");
    return product;
  }

  async updateProduct(id, updatedFields) {
    const product = await Producto.findByIdAndUpdate(id, updatedFields, { new: true, lean: true });
    if (!product) throw new Error("Producto no encontrado");
    return product;
  }

  async deleteProduct(id) {
    const product = await Producto.findByIdAndDelete(id, { lean: true });
    if (!product) throw new Error("Producto no encontrado");
    return product;
  }

  async hasProductStock(id, qty) {
    const product = await Producto.findById(id).lean();
    if (!product) throw new Error("Producto no encontrado");
    if (!product.status || product.stock < qty) {
      throw new Error("No hay suficiente stock");
    }
    return true;
  }
}
