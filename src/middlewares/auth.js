

export const authAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Acceso restringido a administradores" });
  }

  next();
};

export function authAdminView(req, res, next) {
  if (req.user?.role === "admin") return next();

  const msg = "Solo los administradores están autorizados";
  // Devolvemos una mini-página que ejecuta alert y vuelve
  return res
    .status(403)
    .send(`<!doctype html>
<html><head><meta charset="utf-8"><title>No autorizado</title></head>
<body>
<script>
  alert(${JSON.stringify(msg)});
  if (document.referrer) {
    // vuelve a la página anterior sin dejar la URL de /realtimeproducts en el historial
    window.location.replace(document.referrer);
  } else {
    // fallback si no hay referrer
    window.location.replace("/");
  }
</script>
</body></html>`);
}
