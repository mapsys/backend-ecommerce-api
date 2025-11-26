export default class TicketRepository {
  constructor(dao) {
    this.dao = dao;
  }
  create(data) {
    return this.dao.create(data);
  }
  findById(id) {
    return this.dao.findById(id);
  }
  findByUser(userId, opts) {
    return this.dao.findByUser(userId, opts);
  }
}
