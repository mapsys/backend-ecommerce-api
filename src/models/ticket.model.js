import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    purchase_datetime: { type: Date, default: Date.now, index: true },
    payment_method: { type: String, required: true }, // ej: 'efectivo', 'tarjeta', 'mp', 'transferencia'
    amount: { type: Number, required: true, min: 0 },
    cart: { type: mongoose.Schema.Types.ObjectId, ref: "Cart", required: true, index: true },
    purchaser: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
  },
  { timestamps: true }
);

const Ticket = mongoose.model("ticket", ticketSchema);
export default Ticket;
