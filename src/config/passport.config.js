// src/config/passportConfig.js
import passport from "passport";
import passportJWT from "passport-jwt";
import local from "passport-local";
import UserService from "../services/user.service.js";

const userService = new UserService();
const JWT_SECRET = process.env.JWT_SECRET || "coderSecret";

const buscarToken = (req) => req?.cookies?.cookieToken || null;

export const iniciarPassport = () => {
  passport.use(
    "registro",
    new local.Strategy({ usernameField: "email", passReqToCallback: true }, async (req, username, password, done) => {
      try {
        const { first_name, last_name, age } = req.body;
        const user = await userService.register({
          first_name,
          last_name,
          email: username,
          password,
          age,
        });
        return done(null, user);
      } catch (error) {
        // Podés mapear status→message si querés
        return done(null, false, { message: error.message });
      }
    })
  );

  passport.use(
    "login",
    new local.Strategy({ usernameField: "email", passReqToCallback: true }, async (req, username, password, done) => {
      try {
        const { user } = await userService.login({ email: username, password });
        return done(null, user); // sin password
      } catch (error) {
        return done(null, false, { message: "Usuario/Contraseña incorrectos" });
      }
    })
  );

  passport.use(
    "current",
    new passportJWT.Strategy(
      {
        secretOrKey: JWT_SECRET,
        jwtFromRequest: passportJWT.ExtractJwt.fromExtractors([buscarToken]),
      },
      async (payload, done) => {
        try {
          // buscar el usuario “real” en BD para tener cart y demás campos frescos
          const user = await userService.findByIdSafe(payload._id);
          if (!user) return done(null, false, { message: "Usuario no encontrado" });
          delete user.password;
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
};
