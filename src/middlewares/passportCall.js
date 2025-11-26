import passport from "passport";

export const passportCall = (estrategia) => (req, res, next) => {
  passport.authenticate(estrategia, { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const msg = info?.message || info?.toString?.() || "No autorizado";
      const status = info?.status || 401; // Usar el status que viene del strategy
      return res.status(status).json({ status: "error", error: msg });
    }
    req.user = user;
    next();
  })(req, res, next);
};