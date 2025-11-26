import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import productsRouter from "./routes/products.router.js";
import sessionsRouter from "./routes/sessions.router.js";
import cartsRouter from "./routes/carts.router.js";
import ticketsRouter from "./routes/tickets.router.js";
import { Server } from "socket.io";
import { connectDB } from "./config/mongo.js";
import { configureSockets } from "./sockets/index.js";
import cors from "cors";
import passport from "passport";
import { iniciarPassport } from "./config/passport.config.js";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.js";
import ProductService from "./services/product.service.js";

// Uso de Env para la conexion
dotenv.config();

// Configuro express y Socket.IO
const app = express();
app.use(cookieParser());
const httpServer = createServer(app);
const io = new Server(httpServer);
const productService = new ProductService();

const PORT = process.env.PORT || 8080;

// Configuro CORS para API
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

// Configuro Passport
iniciarPassport();
app.use(passport.initialize());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// conecto a MongoDB
connectDB();

// Rutas API
app.use("/api/products", productsRouter());
app.use("/api/carts", cartsRouter());
app.use("/api/sessions", sessionsRouter());
app.use("/api/tickets", ticketsRouter());
app.use(errorHandler);
// WebSocket connection
configureSockets(io, { productService });

httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
