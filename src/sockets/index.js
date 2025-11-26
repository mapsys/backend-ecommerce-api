// src/sockets/index.js
export const configureSockets = (io, { productService }) => {
  io.on("connection", async (socket) => {
    console.log("🟢 Cliente conectado:", socket.id);

    // Lista inicial solo a este cliente
    try {
      const products = await productService.listAll(); // ← método del service
      socket.emit("products", products);
    } catch (e) {
      console.error(e);
      socket.emit("products:error", "No se pudo cargar la lista de productos");
    }

    // Agregar producto (y BROADCAST de la lista)
    socket.on("addProduct", async (prod) => {
      try {
        await productService.create({
          title: prod.title,
          description: prod.description,
          price: prod.price,
          thumbnail: prod.thumbnail, // el DAO lo mete como [thumbnail] si existe
          code: prod.code,
          stock: prod.stock,
          category: prod.category,
        });

        const updated = await productService.listAll();
        io.emit("products", updated); // ← broadcast a TODOS
      } catch (err) {
        console.error("addProduct error:", err);
        socket.emit("products:error", err.message || "Error al crear producto");
      }
    });

    // Eliminar producto (y BROADCAST de la lista)
    socket.on("deleteProduct", async (id) => {
      try {
        await productService.remove(id);

        const updated = await productService.listAll();
        io.emit("products", updated); // ← broadcast a TODOS
      } catch (err) {
        console.error("deleteProduct error:", err);
        socket.emit("products:error", err.message || "Error al eliminar producto");
      }
    });
  });
};
