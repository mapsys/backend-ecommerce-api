# 📦 Backend eCommerce API - Documentación Técnica

## 🎯 Descripción General

Backend de un e-commerce desarrollado para el curso **Backend II**. Es una API REST completa con autenticación JWT, gestión de productos, carritos de compra, sistema de tickets y roles de usuario.

**Autor:** Mariano Pisano
**Tipo:** Proyecto de aprendizaje
**Estado:** Funcional y testeado

---

## 🏗️ Arquitectura

El proyecto sigue un patrón de **arquitectura en capas** limpia:

```
┌─────────────────────────────────────────┐
│   Routes (endpoints HTTP)               │
├─────────────────────────────────────────┤
│   Middlewares (auth, validation)        │
├─────────────────────────────────────────┤
│   Controllers (HTTP ↔ Services)         │
├─────────────────────────────────────────┤
│   Services (lógica de negocio)          │
├─────────────────────────────────────────┤
│   Repositories (abstracción de datos)   │
├─────────────────────────────────────────┤
│   DAOs (acceso a base de datos)         │
├─────────────────────────────────────────┤
│   Models (Mongoose schemas)             │
└─────────────────────────────────────────┘
```

### Estructura de Carpetas

```
src/
├── config/           # Configuración (Passport, MongoDB)
├── controllers/      # Controladores HTTP
├── dao/              # Data Access Objects (Mongoose)
├── dto/              # Data Transfer Objects (sanitización)
├── managers/         # [LEGACY] Versiones antiguas del patrón Repository
├── middlewares/      # Auth, validación, error handling
├── models/           # Schemas de Mongoose
├── repositories/     # Capa de abstracción sobre DAOs
├── routes/           # Definición de rutas
├── services/         # Lógica de negocio
├── sockets/          # WebSocket (Socket.io)
├── utils/            # Utilidades (mailer, etc.)
└── server.js         # Punto de entrada
```

---

## 🔧 Stack Tecnológico

### Backend
- **Node.js** + **Express 5**
- **MongoDB** + **Mongoose** (v8)
- **Mongoose Paginate v2** (paginación)

### Autenticación
- **Passport.js** (local + JWT)
- **JWT** (jsonwebtoken) en cookies httpOnly
- **bcryptjs** (hashing de passwords)

### Tiempo Real
- **Socket.io** (actualización en tiempo real de productos)

### Email
- **Nodemailer** (recuperación de contraseña)

### Testing
- **Axios** + **axios-cookiejar-support** (tests E2E)

---

## 👤 Sistema de Usuarios y Roles

### Roles

**User (usuario normal):**
- Email: cualquier dominio
- Permisos: consultar productos, gestionar su carrito, realizar compras, ver sus tickets

**Admin:**
- Email: debe terminar en `@coder.com`
- Permisos: CRUD completo de productos + todos los permisos de user

### Autenticación

**Estrategias de Passport:**
1. `"registro"` - Registro con validación de campos
2. `"login"` - Login con email/password
3. `"current"` - Validación de JWT desde cookie `cookieToken`

**JWT:**
- Almacenado en cookie `cookieToken` (httpOnly)
- Expiración: 1 hora
- Secret: `process.env.JWT_SECRET`

**Password Hashing:**
- Usa `bcryptjs` con salt rounds = 10
- El hash se ejecuta en un **hook `pre('save')`** del modelo User
- Esto garantiza que SIEMPRE se hashea (en registro y reset de password)

---

## 📊 Modelos de Datos

### User
```javascript
{
  first_name: String,
  last_name: String,
  email: String (unique, validado),
  age: Number (0-120),
  password: String (hasheado),
  cart: ObjectId → Cart,
  role: "user" | "admin"
}
```

### Product (Producto)
```javascript
{
  title: String,
  description: String,
  price: Number (> 0),
  code: String (unique, indexed),
  stock: Number (>= 0),
  category: String (indexed),
  thumbnails: [String],
  status: Boolean
}
```

### Cart
```javascript
{
  products: [{
    product: ObjectId → Producto,
    quantity: Number
  }],
  estado: "activo" | "comprado" | "cancelado"
}
```

### Ticket
```javascript
{
  code: String (auto-generado),
  purchase_datetime: Date,
  amount: Number,
  purchaser: String (email),
  cartId: ObjectId → Cart,
  userId: ObjectId → User,
  payment_method: String
}
```

---

## 🛣️ Endpoints Principales

### 🔐 Autenticación (`/api/sessions`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/register` | - | Registrar nuevo usuario |
| POST | `/login` | - | Login (retorna cookie JWT) |
| GET | `/logout` | - | Logout (limpia cookie) |
| GET | `/current` | JWT | Obtener usuario actual (DTO) |
| PUT | `/cart` | JWT | Asociar carrito a usuario |
| POST | `/forgot-password` | - | Solicitar reset de password |
| POST | `/reset-password` | - | Cambiar password con token |

### 📦 Productos (`/api/products`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar productos (paginado) |
| GET | `/:id` | JWT | Obtener producto por ID |
| POST | `/` | Admin | Crear producto |
| PUT | `/:id` | Admin | Actualizar producto |
| DELETE | `/:id` | Admin | Eliminar producto |

**Query params para listado:**
- `page` - Número de página (default: 1)
- `limit` - Items por página (default: 10)
- `sort` - "asc" o "desc" (por precio)
- `query` - Filtro por categoría o "disponibles"

### 🛒 Carritos (`/api/carts`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/` | JWT | Crear carrito vacío |
| GET | `/:cid` | JWT | Obtener carrito (con populate) |
| POST | `/:cid/products/:pid` | JWT | Agregar producto (body: `{qty}`) |
| PUT | `/:cid/products/:pid` | JWT | Actualizar cantidad (body: `{quantity}`) |
| DELETE | `/:cid/products/:pid` | JWT | Eliminar producto del carrito |
| PUT | `/:cid/products` | JWT | Reemplazar todos los productos |
| DELETE | `/:cid` | JWT | Vaciar carrito |
| PUT | `/:cid/status` | JWT | Cambiar estado (compra) |
| GET | `/:cid/totals` | JWT | Obtener totales |

**Estados del carrito:**
- `"activo"` - Carrito en uso
- `"comprado"` - Compra finalizada (descuenta stock)
- `"cancelado"` - Carrito cancelado

### 🎫 Tickets (`/api/tickets`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar tickets del usuario actual |
| GET | `/:tid` | JWT | Obtener ticket por ID |

---

## ⚙️ Características Clave

### 1. Validación de ObjectId

**Implementación:** Validación en la capa de **Service**

Todos los métodos que reciben IDs validan que sean ObjectIds válidos de MongoDB (24 caracteres hexadecimales) ANTES de consultar la base de datos.

```javascript
if (!isObjectId(id)) {
  const err = new Error("ID inválido");
  err.status = 400;
  throw err;
}
```

**Beneficio:** Respuestas 400 claras en lugar de CastErrors 500.

### 2. Gestión de Stock

**Al agregar al carrito:**
- Valida que el producto exista
- Valida que haya stock suficiente (stock disponible - cantidad ya en carrito)
- Impide agregar más de lo disponible

**Al comprar (cambiar estado a "comprado"):**
1. Valida stock de TODOS los productos del carrito
2. Descuenta el stock de forma **atómica** usando:
   ```javascript
   Producto.updateOne(
     { _id: productId, stock: { $gte: quantity } },
     { $inc: { stock: -quantity } }
   )
   ```
3. Marca el carrito como "comprado"
4. Genera un **Ticket** con el total de la compra

**Beneficio:** Previene condiciones de carrera (race conditions) en compras simultáneas.

### 3. Password Reset Seguro

**Flujo:**
1. Usuario solicita reset (`/forgot-password` con email)
2. Se genera un **JWT temporal** (1 hora) con `{ uid: user._id }`
3. Se envía email con link: `APP_BASE_URL/password?token=...`
4. Usuario hace POST a `/reset-password` con `{ token, password }`
5. Se valida el token, se verifica que la nueva password NO sea igual a la anterior
6. Se actualiza la password (el hook `pre('save')` la hashea automáticamente)

**Seguridad:**
- Token expira en 1 hora
- No se puede reutilizar la password anterior
- El token solo se puede usar una vez (aunque técnicamente podría reutilizarse dentro de la hora)

### 4. DTOs para Seguridad

**UserDTO** expone solo:
- `_id`, `first_name`, `last_name`, `role`, `cart`, `email`

**NO expone:**
- `password` (sensible)
- `age` (dato personal innecesario)

El DTO se usa en:
- Respuestas de `/current`
- Respuestas de `/login` y `/register`
- Cualquier lugar donde se retorna info del usuario

### 5. Socket.io para Tiempo Real

**Ubicación:** `src/sockets/index.js`

**Eventos:**
- `connection` - Envía lista inicial de productos
- `addProduct` - Admin agrega producto, broadcast a todos
- `deleteProduct` - Admin elimina producto, broadcast a todos

**Uso:** Panel de administración en tiempo real (RealTimeProducts view)

### 6. Error Handling Centralizado

**Middleware:** `errorHandler` en `src/middlewares/errorHandler.js`

Maneja:
- Errores de Mongoose (ValidationError, duplicados con code 11000)
- Errores de Nodemailer (SMTP)
- Errores custom con `error.status`
- Fallback a 500 si no hay status

**Logs:** Registra todos los errores en consola con contexto (path, method, stack)

---

## 🔒 Middlewares de Seguridad

### `passportCall(strategy)`
Wrapper sobre `passport.authenticate` que:
- Extrae el JWT de la cookie
- Valida y decodifica el token
- Inyecta `req.user` con los datos del usuario
- Retorna el status HTTP correcto (preserva status del error original)

### `authAdmin`
Middleware que verifica `req.user.role === "admin"`
- Responde 403 si no es admin
- Se usa antes de endpoints de modificación de productos

### `errorHandler`
Middleware final que captura todos los errores y formatea la respuesta

---

## 📝 Decisiones de Diseño Importantes

### ¿Por qué Services validan ObjectId y no un middleware?

**Decisión:** Validación en Services (no en rutas)

**Razón:**
- Los Services son reutilizables (pueden llamarse desde HTTP, sockets, otros services)
- Si la validación está solo en las rutas, un call desde sockets podría pasar un ID inválido
- Principio de "self-contained" services

### ¿Por qué el hook `pre('save')` para hashear passwords?

**Decisión:** Hook automático en el modelo

**Razón:**
- Garantiza que NUNCA se guarde una password sin hashear
- Funciona tanto en `create` como en `save` (después de modificar el documento)
- No hay que recordar hashear manualmente en cada lugar

**Importante:**
- `findByIdAndUpdate` NO ejecuta el hook
- Por eso se creó `updatePassword` en el DAO que usa `.save()`

### ¿Por qué Passport + JWT en cookies?

**Decisión:** JWT almacenado en cookies httpOnly

**Razones:**
- **httpOnly:** Previene ataques XSS (JavaScript no puede acceder)
- **Passport:** Abstracción sobre estrategias de autenticación (fácil agregar OAuth, etc.)
- **JWT:** Stateless, no requiere almacenar sesiones en el servidor

### ¿Por qué DAOs retornan `null` en lugar de lanzar errores?

**Decisión:** DAOs retornan `null`, Services lanzan errores con status

**Razón:**
- El DAO solo accede a datos, no tiene lógica de negocio
- El Service decide si "no encontrado" es un error 404 o simplemente un resultado vacío
- Separación de responsabilidades: DAO = datos, Service = lógica

---

## 🧪 Testing

**Ubicación:** `src/e2e.test.js`

**Cobertura:**
- ✅ Autenticación (registro, login, logout, password reset)
- ✅ Roles (user vs admin)
- ✅ CRUD de productos con validaciones
- ✅ Validación de ObjectId en todos los endpoints
- ✅ Gestión de carritos (agregar, actualizar, vaciar)
- ✅ Validación de stock
- ✅ Proceso de compra y descuento atómico
- ✅ Generación y consulta de tickets
- ✅ DTOs (no exponer datos sensibles)

**Cómo ejecutar:**
```bash
# Terminal 1: Levantar el servidor
npm run dev

# Terminal 2: Ejecutar tests
node src/e2e.test.js
```

**Resultado esperado:** Todos los tests en verde ✅

---

## 🗂️ Archivos Legacy

La carpeta `src/managers/` contiene implementaciones antiguas del patrón Repository:
- `productManager.js` - Versión file-based
- `productManagerMongo.js` - Versión MongoDB sin Repository
- `cartManager.js` - Versión file-based
- `cartManagerMongo.js` - Versión MongoDB sin Repository

**Estado:** NO se usan en el código activo, se mantienen como referencia de aprendizaje del patrón Repository.

---

## 🚀 Scripts Disponibles

```bash
npm run dev     # Desarrollo con nodemon
npm test        # Ejecutar tests E2E
```

---

## 🔐 Variables de Entorno Requeridas

```env
# Base de datos
MONGO_URL=mongodb+srv://...

# Server
PORT=8080
APP_BASE_URL=http://localhost:8080

# Autenticación
JWT_SECRET=tu_secreto_jwt
JWT_RESET_SECRET=secreto_para_password_reset
SESSION_SECRET=secreto_para_sesiones

# Email (SMTP - Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password
MAIL_FROM="Tu App <tu_email@gmail.com>"

# CORS (opcional)
CORS_ORIGIN=*
```

**Nota:** Para Gmail SMTP necesitás generar una "App Password" en la configuración de seguridad de tu cuenta.

---

## 📌 Notas Importantes

### Para Desarrollo
- **Passwords simples:** No hay validación de complejidad de password (facilitá el testing)
- **CORS abierto:** Configurado con `*` para facilitar desarrollo
- **Rate limiting:** NO implementado (no es necesario para aprendizaje)
- **Logging:** Se usa `console.log/error` (en producción usarías Winston/Pino)

### Consideraciones de Seguridad (NO implementadas por ser proyecto de aprendizaje)
- ❌ Rate limiting en endpoints sensibles
- ❌ Validación de complejidad de passwords
- ❌ Refresh tokens
- ❌ Email verification al registrarse
- ❌ 2FA
- ❌ CSRF tokens
- ❌ Helmet.js

### Si fuera a Producción
Necesitarías:
1. Cambiar `JWT_SECRET` y todas las credenciales
2. Configurar CORS con dominios específicos
3. Implementar rate limiting
4. Agregar validación de passwords complejos
5. Usar un logger profesional (Winston)
6. Agregar monitoreo (Sentry, New Relic)
7. Implementar caching (Redis)
8. SSL/HTTPS obligatorio

---

## 🎓 Conceptos Aprendidos en este Proyecto

1. **Arquitectura en capas** (DAO → Repository → Service → Controller)
2. **Patrón Repository** (abstracción de la persistencia)
3. **DTOs** (Data Transfer Objects)
4. **JWT** en cookies httpOnly
5. **Passport.js** con múltiples estrategias
6. **Mongoose hooks** (pre-save)
7. **Validación de ObjectId**
8. **Gestión de stock** con operaciones atómicas
9. **Error handling** centralizado
10. **Testing E2E** con cookies y autenticación

---

**Última actualización:** Noviembre 2025
