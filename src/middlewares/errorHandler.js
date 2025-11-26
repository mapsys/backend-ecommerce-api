// src/middlewares/errorHandler.js
export function errorHandler(err, req, res, _next) {
  // Log SIEMPRE el error en servidor con contexto
  console.error("❌ Error:", {
    path: req.path,
    method: req.method,
    message: err?.message,
    code: err?.code,
    stack: err?.stack,
    response: err?.response,   // nodemailer puede traer esto
    command: err?.command,     // idem
  });

  // Duplicado por índice único de Mongo
  if (err?.code === 11000) {
    const campo = Object.keys(err.keyPattern || err.keyValue || { code: 1 })[0];
    return res.status(400).json({
      status: "error",
      error: `El campo ${campo} debe ser único`,
    });
  }

  if (err?.name === "ValidationError") {
    const detalles = Object.values(err.errors).map(e => e.message || `Campo ${e?.path} inválido`);
    return res.status(400).json({ status: "error", error: detalles.join("; ") });
  }

  // Códigos comunes de Nodemailer/SMTP
  const smtpCodes = new Set(["EAUTH","ESOCKET","ECONNECTION","ETIMEDOUT","ECONNRESET"]);
  if (smtpCodes.has(err?.code)) {
    return res.status(502).json({
      status: "error",
      error: "No se pudo enviar el correo. Intentalo más tarde.",
    });
  }

  const status = err.status || 500;
  res.status(status).json({ status: "error", error: err.message || "Error interno del servidor" });
}
