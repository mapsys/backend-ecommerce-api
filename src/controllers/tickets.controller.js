// src/controllers/tickets.controller.js
import TicketService from "../services/ticket.service.js";
import CartService from "../services/cart.service.js";

export default class TicketsController {
  constructor({ ticketService = new TicketService(), cartService = new CartService() } = {}) {
    this.tickets = ticketService;
    this.carts = cartService;

    this.createFromCart = this.createFromCart.bind(this);
    this.getOne = this.getOne.bind(this);
    this.listMine = this.listMine.bind(this);
  }

  async createFromCart(req, res, next) {
    try {
      const { cid } = req.params;
      const { payment_method = "efectivo" } = req.body;

      // aseguramos que el carrito exista
      const cart = await this.carts.getById(cid, { populate: false });

      // total del carrito
      const totals = await this.carts.totals(cid);

      const ticket = await this.tickets.create({
        cartId: cart._id,
        userId: req.user._id,
        amount: totals.totalPrecio || 0,
        payment_method,
      });

      res.status(201).json({ ticket });
    } catch (e) {
      next(e);
    }
  }

  async getOne(req, res, next) {
    try {
      const t = await this.tickets.getOne(req.params.id);
      res.json(t);
    } catch (e) {
      next(e);
    }
  }

  async listMine(req, res, next) {
    try {
      const { page, limit } = req.query;
      const r = await this.tickets.listByUser(req.user._id, { page, limit });
      res.json(r);
    } catch (e) {
      next(e);
    }
  }
}
