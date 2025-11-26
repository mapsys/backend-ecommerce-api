// src/daos/user.dao.js
import User from "../models/user.model.js";

export default class UserDAO {
  async findByEmail(email) {
    return await User.findOne({ email }).lean();
  }

  async existsByEmail(email) {
    return await User.exists({ email });
  }

  async create({ first_name, last_name, email, password, age, role, cart }) {
    const doc = await User.create({ first_name, last_name, email, password, age, role, cart });
    return doc.toObject();
  }

  async findById(id) {
    return await User.findById(id).lean();
  }

  async updateById(id, data) {
    return await User.findByIdAndUpdate(id, { $set: data }, { new: true, lean: true, runValidators: true });
  }

  // Método específico para actualizar password usando .save() para ejecutar hooks
  async updatePassword(id, newPassword) {
    const user = await User.findById(id); // Traemos el documento
    if (!user) return null;

    user.password = newPassword; // Modificamos la password
    await user.save(); // Guardamos → esto ejecuta el hook pre('save')

    return user.toObject();
  }

  async setCart(userId, newCartId) {
    return await User.findByIdAndUpdate(userId, { $set: { cart: newCartId } }, { new: true, lean: true });
  }
  async findByIdLean(id) {
    return User.findById(id).lean();
  }
}
