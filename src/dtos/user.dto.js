export default class UserDTO {
  constructor(u) {
    if (!u) return;

    this._id = (u._id && u._id.toString) ? u._id.toString() : u._id;
    this.first_name = u.first_name;
    this.last_name = u.last_name;
    this.role = u.role;
    this.cart = (u.cart && u.cart.toString) ? u.cart.toString() : u.cart;
    this.email = u.email;
  }
}
