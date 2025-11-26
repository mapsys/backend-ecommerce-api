import passport from "passport";

export const passportCall = (estrategia) => (req, res, next) => {
  passport.authenticate(estrategia, { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const msg = info?.message || info?.toString?.() || "No autorizado";
      return res.status(401).json({ status: "error", error: msg });
    }
    req.user = user;
    next();
  })(req, res, next);
};