import fs from "fs/promises";
import { join } from "path";
export default class ProductManager {
  constructor(ruta) {
    this.products = [];
    this.currentId = 0;
    this.file = join(ruta, "productos.json");
  }

  async #loadProducts() {
    try {
      const data = await fs.readFile(this.file, "utf-8");
      this.products = JSON.parse(data);
      this.currentId = this.products.length > 0 ? this.products[this.products.length - 1].id : 0;
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("El archivo de productos no existe, se creara vacio");
        this.products = [];
        this.currentId = 0;
        await fs.writeFile(this.file, JSON.stringify([], null, 2));
      }
      console.error(error);
    }
  }

  async #saveProducts() {
    try {
      await fs.writeFile(this.file, JSON.stringify(this.products, null, 2));
    } catch (error) {
      console.error(error);
    }
  }

  static async crear(ruta) {
    const instancia = new ProductManager(ruta);
    await instancia.#loadProducts();
    return instancia;
  }
  getProducts() {
    return this.products;
  }

  async addProduct(description, price, thumbnail, title, code, stock) {
    if (!description || !price || !thumbnail || !title || !code || stock === undefined) {
      throw new Error("Todos los campos son obligatorios");
    }
    if (this.products.some((product) => product.code === code)) {
      throw new Error("El código del producto debe ser único");
    }
    if (typeof price !== "number" || price <= 0) {
      throw new Error("El precio debe ser un número positivo");
    }
    if (typeof stock !== "number" || stock < 0) {
      throw new Error("El stock debe ser un número no negativo");
    }
    if (typeof description !== "string" || typeof title !== "string" || typeof thumbnail !== "string" || typeof code !== "string") {
      throw new Error("Los campos de descripción, título, miniatura y código deben ser cadenas de texto");
    }

    const newProduct = {
      id: ++this.currentId,
      description,
      price,
      thumbnails: [thumbnail],
      title,
      code,
      stock,
      status: true,
    };
    if (stock === 0) {
      newProduct.status = false;
    }

    this.products.push(newProduct);
    await this.#saveProducts();
    return newProduct;
  }

  getProductById(id) {
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new Error("Producto no encontrado");
    }
    return product;
  }

  async updateProduct(id, updatedFields) {
    const productIndex = this.products.findIndex((p) => p.id === id);
    if (productIndex === -1) {
      throw new Error("Producto no encontrado");
    }
    const product = this.products[productIndex];
    for (const key in updatedFields) {
      if (key !== "id" && key in product) {
        product[key] = updatedFields[key];
      }
    }
    await this.#saveProducts();
    return product;
  }

  async deleteProduct(id) {
    const productIndex = this.products.findIndex((p) => p.id === id);
    if (productIndex === -1) {
      throw new Error("Producto no encontrado");
    }
    this.products.splice(productIndex, 1);
    await this.#saveProducts();
    return this.products;
  }

  hasProductStock(id, qty) {
    const productIndex = this.products.findIndex((p) => p.id === id);
    if (productIndex === -1) {
      throw new Error("Producto no encontrado");
    }
    const product = this.products[productIndex];
    if (!product.status) {
      throw new Error("No hay suficiente stock");
    }
    return true;
  }
}
