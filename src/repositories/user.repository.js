import UserDAO from "../dao/user.dao.js";

export default class UserRepository {
  constructor(dao = new UserDAO()) {
    this.dao = dao;
  }

  // Lecturas
  async findByEmail(email) { return this.dao.findByEmail(email); }
  async existsByEmail(email) { return this.dao.existsByEmail(email); }
  async findById(id) { return this.dao.findById(id); }
  async findByIdLean(id) { return this.dao.findByIdLean(id); }

  // Escrituras / updates
  async create(data) { return this.dao.create(data); }
  async updateById(id, data) { return this.dao.updateById(id, data); }
  async setCart(userId, newCartId) { return this.dao.setCart(userId, newCartId); }
}
