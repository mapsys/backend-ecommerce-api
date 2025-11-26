import Ticket from "../models/ticket.model.js";

export default class TicketDAO {
  async create({ purchase_datetime = new Date(), payment_method, amount, cartId, userId }) {
    const doc = await Ticket.create({
      purchase_datetime,
      payment_method,
      amount,
      cart: cartId,
      purchaser: userId,
    });
    return doc.toObject();
  }

  async findById(id) {
    return Ticket.findById(id).lean();
  }

  async findByUser(userId, { page = 1, limit = 10 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Ticket.find({ purchaser: userId }).sort({ purchase_datetime: -1 }).skip(skip).limit(Number(limit)).lean(),
      Ticket.countDocuments({ purchaser: userId }),
    ]);
    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }
}
