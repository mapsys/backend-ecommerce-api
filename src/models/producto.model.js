import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const productSchema = new mongoose.Schema({
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true, index: true },
  thumbnails: { type: [String], default: [] },
  title: { type: String, required: true },
  code: { type: String, required: true, unique: true, index: true  },
  stock: { type: Number, required: true },
  status: { type: Boolean, default: true },
});

productSchema.plugin(mongoosePaginate);
const Producto = mongoose.model("Producto", productSchema);

export default Producto;
