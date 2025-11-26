import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    console.log("🔌 Conectando a MongoDB...", process.env.MONGO_URL);
    console.log("🔌 Conectando a MongoDB...", process.env.MONGO_URL);
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Conexión a MongoDB exitosa");
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error.message);
    process.exit(1);
  }
};
