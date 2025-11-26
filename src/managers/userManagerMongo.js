import User from "../models/user.model.js";
import Cart from "../models/cart.model.js";
import bcrypt from "bcryptjs";

export default class UserManager {
  async createUser({ first_name, last_name, email, password, age }) {
    const exists = await User.findOne({ email });
    if (exists) throw new Error("Email ya registrado");
    const newCart = await Cart.create({ products: [] });
    const role = email.toLowerCase().endsWith("@coder.com") ? "admin" : "user";
    const user = await User.create({ first_name, last_name, email, age, password, role, cart: newCart._id });
    return user;
  }

  async findByEmail(email) {
    return await User.findOne({ email }).lean();
  }

  async validateUser(email, plainPassword) {
    const user = await this.findByEmail(email);
    if (!user || !user.password) return null;

    const passwordOk = await bcrypt.compare(plainPassword, user.password);
    if (!passwordOk) return null;

    // Ya no devolvemos el password
    const { password, cart, ...safeUser } = user;
    return safeUser;
  }
}
