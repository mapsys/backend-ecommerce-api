import TicketDAO from "../dao/ticket.dao.js";
import TicketRepository from "../repositories/ticket.repository.js";

export default class TicketService {
  constructor(repo = new TicketRepository(new TicketDAO())) {
    this.repo = repo;
  }

  async create({ cartId, userId, amount, payment_method, purchase_datetime }) {
    if (!cartId || !userId) {
      const e = new Error("cartId y userId son obligatorios");
      e.status = 400;
      throw e;
    }
    if (typeof amount !== "number" || amount < 0) {
      const e = new Error("El monto es inválido");
      e.status = 400;
      throw e;
    }
    if (!payment_method) {
      const e = new Error("Debe indicar el método de pago");
      e.status = 400;
      throw e;
    }
    return await this.repo.create({ cartId, userId, amount, payment_method, purchase_datetime });
  }

  async getOne(id) {
    const t = await this.repo.findById(id);
    if (!t) {
      const e = new Error("Ticket no encontrado");
      e.status = 404;
      throw e;
    }
    return t;
  }

  async listByUser(userId, opts) {
    return this.repo.findByUser(userId, opts);
  }
}
