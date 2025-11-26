# 🛍️ eCommerce Backend (JWT + Passport + MVC/DAO/Repository)

Backend del curso **Backend II** con autenticación por **JWT** y autorización con **Passport**. Implementa un e-commerce con **productos**, **carritos** y **tickets de compra**; vistas con **Handlebars**; tiempo real con **Socket.io**; **DTOs**; **Repository pattern**; middlewares de seguridad; y **recuperación de contraseña** vía email.

---

## 🚀 Features

- Login/registro con **JWT** (cookie `httpOnly`).
- Rutas protegidas con **Passport** (`current`) y **roles** (admin).
- Arquitectura por capas: **DAO → Repository → Service → Controller**.
- **DTO** para sanitizar `/api/sessions/current`.
- **Productos** (CRUD admin), **Carritos**, **Tickets**.
- **Compra**: valida stock, descuenta, marca carrito y genera **Ticket**.
- **Vistas** (Handlebars) + **Socket.io** (RealTime Products, admin).
- **Recuperación de contraseña** (link con expiración 1h, Nodemailer).
- **Manejo de errores** centralizado + validación de ObjectId.

---

## 🧱 Stack

- Node.js, Express
- MongoDB + Mongoose
- Passport.js (local + JWT)
- jsonwebtoken, bcryptjs
- Express-Handlebars
- Socket.io
- Nodemailer

---

## 📁 Estructura

```
src/
├─ config/          # Mongo, Passport, helpers de configuración
├─ controllers/     # Controladores HTTP
├─ dao/             # Acceso a datos (Mongoose)
├─ data/            # (opcional) semillas/fixtures
├─ dto/             # DTOs (UserDTO, etc.)
├─ managers/        # (legado) si aplica
├─ middleware/      # auth, authAdmin, ensureObjectId, errorHandler, passportCall
├─ models/          # Schemas Mongoose (user, producto, cart, ticket)
├─ public/          # Frontend (JS, CSS, imágenes)
├─ repositories/    # Abstracción sobre DAO (Repository pattern)
├─ routes/          # Rutas API y vistas
├─ services/        # Reglas de negocio (stock, compras, etc.)
├─ sockets/         # Socket.io (realTimeProducts)
├─ utils/           # mailer (Nodemailer), helpers
└─ views/           # Handlebars (home, cart, profile, password, etc.)
server.js           # punto de entrada
```

## Users
Para dar de alta productos o eliminar, debera tener Rol Admin
Para tener role admin el mail debe ser @coder.com
De lo contrario sera user

## 🔐 Autenticación y autorización

- **Estrategias**:
  - `registro` y `login` (local)
  - `current` (JWT tomado de cookie `cookieToken`)
- **Roles**:
  - `admin` (emails `@coder.com`)
  - `user` (resto)
- **DTO `/current`**: expone solo campos no sensibles (`_id, first_name, last_name, role, cart, email* si lo necesitás`).

---

## 🔌 Endpoints principales

### Sessions (`/api/sessions`)
- `POST   /register` → Registro (201)
- `POST   /login` → Login (setea cookie JWT) (200)
- `GET    /current` → Requiere `passportCall("current")` (200, DTO)
- `GET    /logout` → Limpia cookie (200)
- `PUT    /cart` → Asocia un carrito al usuario autenticado (200)
- `POST   /forgot-password` → Envía link de reset (200)
- `POST   /reset-password` → Cambia password (200)

### Products (`/api/products`)
- `GET    /` → Lista paginada (`page, limit, sort, query`)
- `GET    /:id`
- `POST   /` → **admin**
- `PUT    /:id` → **admin**
- `DELETE /:id` → **admin**

### Carts (`/api/carts`)
- `POST   /` → Crear carrito (201)
- `GET    /:cid` → (con `populate` desde service) 
- `POST   /:cid/products/:pid`  ({ qty })
- `PUT    /:cid/products/:pid`  ({ quantity })
- `DELETE /:cid/products/:pid`
- `DELETE /:cid` → Vaciar
- `PUT    /:cid/status` ({ status }) → `activo | comprado | cancelado`
  - Si pasa a **`comprado`**: valida **stock**, **descuenta**, marca carrito como **comprado** y crea **Ticket**
- `GET    /:cid/totals` → Totales (cantidad y monto)

### Tickets (`/api/tickets`)
- `GET /` → Lista de tickets del usuario autenticado
- `GET /:tid` → Ticket por id (dueño o admin)

### Vistas (Handlebars)
- `/` → Home (Auth)
- `/realtimeproducts` → RealTime (Auth + Admin)
- `/carts/:cid` → Carrito (Auth)
- `/profile` → Perfil (Auth)
- `/login`, `/register`, `/forgot-password`, `/password` (reset)

---

## 🧭 Arquitectura por capas

- **Model**: Schemas Mongoose.
- **DAO**: Queries a BD.
- **Repository**: Envuelve el DAO (permite cambiar la persistencia sin tocar Services).
- **Service**: Reglas de negocio (validaciones, stock, compra, etc.).
- **Controller**: Traduce HTTP ↔ Service (status, JSON, render).
- **Routes**: Declaran endpoints y middlewares.
- **DTO**: Sanitiza datos salientes (no exponer `password`, etc.).

---

## 🧬 DTO de Usuario


## 📬 Recuperación de contraseña (simple)

- `POST /api/sessions/forgot-password`: genera **JWT efímero (1h)** y envía link `APP_BASE_URL/password?token=...`.
- `POST /api/sessions/reset-password`: valida token, evita repetir la misma password y actualiza.



## ⚙️ Requisitos & Scripts

**Requisitos**: Node 18+ y MongoDB en ejecución.

```bash
# Instalación
npm install

# Desarrollo
npm run dev       # nodemon

# Producción
npm start
```

---

## 🧪 E2E (opcional)

Archivo `e2e.test.js` (HTTP con cookies) que:
- Crea usuarios (user/admin), testea roles y auth.
- Valida errores comunes (ids inválidos, body vacío, duplicados).
- Prueba carritos (agregar, actualizar, vaciar).
- Ejecuta compra: valida y **descuenta stock**.
- Verifica **ticket** generado y endpoints `/api/tickets`.

Ejecutar (con server levantado):
```bash
node e2e.test.js
# o
BASE_URL=http://localhost:8080 node e2e.test.js
```

---

## 🔄 Flujo de compra

1. Cliente arma carrito.
2. `PUT /api/carts/:cid/status` con `{ status: "comprado" }`.
3. Service valida stock de cada ítem, **descuenta** el stock, marca carrito como **comprado**.
4. Crea **Ticket** con total, método de pago, `cartId`, `userId`.
5. Respuesta `{ cart, ticket }`.

---

## 🧰 Middlewares útiles

- `passportCall("current")` → JWT auth por cookie.
- `authAdmin` / `authAdminView` → `req.user.role === 'admin'`.
- `ensureObjectId` → 400 si el id no es válido.
- `errorHandler` → mapea errores de Mongo/validación y cualquier `err.status`.

---

## 🪲 Troubleshooting

- **Mailer 500**: verificá `SMTP_*` y `FROM_EMAIL`; si usás Gmail, activá *App Passwords* y usá esa clave.
- **JWT 401**: asegurate de setear cookie en login y enviar cookie en requests.
- **CastError (ObjectId)**: usá `ensureObjectId` → responde 400.
- **RealTime sin actualizar**: el server debe emitir `io.emit("products", updated)` y el cliente escuchar `socket.on("products", ...)`.
- **/current filtrado**: devolvé `new UserDTO(user)`.

---

## 📎 Autor

**Mariano Pisano**  
Proyecto del curso **Backend II** — refactor con DAO/Repository/Service/Controller, DTOs, tickets, recuperación de contraseña, Socket.io y vistas Handlebars.
