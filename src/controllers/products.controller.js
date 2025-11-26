// src/controllers/products.controller.js
import ProductService from "../services/product.service.js";

export default class ProductsController {
  constructor(service = new ProductService()) {
    this.service = service;

    // bind this
    this.list = this.list.bind(this);
    this.getOne = this.getOne.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
  }

  async list(req, res, next) {
    try {
      const result = await this.service.paginate(req.query);
      const response = {
        status: "success",
        payload: result.docs,
        totalPages: result.totalPages,
        prevPage: result.prevPage,
        nextPage: result.nextPage,
        page: result.page,
        hasPrevPage: result.hasPrevPage,
        hasNextPage: result.hasNextPage,
        prevLink: result.hasPrevPage ? `/api/products?page=${result.prevPage}` : null,
        nextLink: result.hasNextPage ? `/api/products?page=${result.nextPage}` : null,
      };
      res.json(response);
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const product = await this.service.getById(req.params.id);
      res.status(200).json(product);
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const newProduct = await this.service.create(req.body);
      res.status(201).json(newProduct);
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const updated = await this.service.update(req.params.id, req.body);
      res.status(200).json(updated);
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      await this.service.remove(req.params.id);
      res.status(200).json({ message: "Producto eliminado correctamente" });
    } catch (err) { next(err); }
  }
}
