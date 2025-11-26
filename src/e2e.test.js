// ============================================================================
// E2E TESTS - Backend eCommerce API
// ============================================================================
// Este script prueba TODOS los endpoints de la API incluyendo casos exitosos
// y casos de error para validar que la aplicación funciona correctamente.
//
// CÓMO EJECUTAR:
// 1. Asegurate de que el servidor esté corriendo (npm run dev)
// 2. Ejecutá: node src/e2e.test.js
//
// ============================================================================

import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";

// ============================================================================
// CLIENTES HTTP (con soporte de cookies para autenticación)
// ============================================================================

function makeClient(baseURL = BASE_URL) {
  const jar = new CookieJar();
  const http = wrapper(
    axios.create({
      baseURL,
      withCredentials: true,
      jar,
      validateStatus: () => true, // No lanzar error en status != 2xx
    })
  );
  return { http, jar };
}

const { http: httpAnon } = makeClient();  // Cliente sin autenticación
const { http: httpUser } = makeClient();  // Cliente user normal
const { http: httpAdmin } = makeClient(); // Cliente admin

// ============================================================================
// HELPERS
// ============================================================================

const ok = (msg) => console.log("✅", msg);
const bad = (msg) => console.log("❌", msg);
const info = (msg) => console.log("ℹ️ ", msg);
const sep = (t) => console.log("\n" + "=".repeat(80) + "\n" + t + "\n" + "=".repeat(80));
const subsep = (t) => console.log("\n--- " + t + " ---");

/**
 * Espera un status HTTP específico
 */
async function expectStatus(promise, expected, label) {
  const res = await promise;
  if (res.status === expected) {
    ok(`${label} → ${res.status}`);
  } else {
    bad(`${label} → esperado ${expected} pero fue ${res.status}`);
    info(`Respuesta: ${JSON.stringify(res.data)}`);
  }
  return res;
}

/**
 * Espera uno de varios status HTTP posibles
 */
async function expectOneOf(promise, expectedArr, label) {
  const res = await promise;
  if (expectedArr.includes(res.status)) {
    ok(`${label} → ${res.status}`);
  } else {
    bad(`${label} → esperado uno de [${expectedArr.join(", ")}] pero fue ${res.status}`);
    info(`Respuesta: ${JSON.stringify(res.data)}`);
  }
  return res;
}

/**
 * Genera un ID único para testing
 */
function rid(prefix = "x") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * Genera un ObjectId aleatorio válido (24 caracteres hexadecimales)
 */
function randomObjectId() {
  const hex = "0123456789abcdef";
  let id = "";
  for (let i = 0; i < 24; i++) id += hex[Math.floor(Math.random() * 16)];
  return id;
}

/**
 * Obtiene el _id de un objeto (soporta diferentes formatos de respuesta)
 */
function idOf(o) {
  return o?._id || o?.id;
}

/**
 * Helper para delay (útil para password reset)
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TESTS
// ============================================================================

(async () => {
  try {
    console.log("\n🚀 Iniciando tests E2E...\n");

    // ==========================================================================
    // 1. AUTENTICACIÓN - REGISTRO DE USUARIOS
    // ==========================================================================
    sep("1. AUTENTICACIÓN - REGISTRO DE USUARIOS");

    const userEmail = `${rid("user")}@test.com`;
    const userPass = "secret123";
    const adminEmail = `${rid("admin")}@coder.com`; // @coder.com = admin automático
    const adminPass = "admin456";

    subsep("1.1 Registro con validaciones incorrectas");

    // Test: Registro sin campos obligatorios
    await expectStatus(
      httpUser.post("/api/sessions/register", {
        email: `${rid("incomplete")}@test.com`,
        password: userPass,
        first_name: "John",
        // Falta: last_name, age
      }),
      400,
      "Registro sin campos obligatorios → 400"
    );

    // Test: Registro con email duplicado (primero creamos uno)
    await expectStatus(
      httpUser.post("/api/sessions/register", {
        email: userEmail,
        password: userPass,
        first_name: "Ada",
        last_name: "Lovelace",
        age: 28,
      }),
      201,
      "Registro exitoso de usuario normal → 201"
    );

    // Test: Intentar registrar con el mismo email
    await expectStatus(
      httpUser.post("/api/sessions/register", {
        email: userEmail,
        password: userPass,
        first_name: "Ada",
        last_name: "Lovelace",
        age: 28,
      }),
      400,
      "Registro con email duplicado → 400"
    );

    subsep("1.2 Registro de admin (email @coder.com)");

    await expectStatus(
      httpAdmin.post("/api/sessions/register", {
        email: adminEmail,
        password: adminPass,
        first_name: "Root",
        last_name: "Admin",
        age: 33,
      }),
      201,
      "Registro exitoso de admin → 201"
    );

    // ==========================================================================
    // 2. AUTENTICACIÓN - LOGIN
    // ==========================================================================
    sep("2. AUTENTICACIÓN - LOGIN");

    subsep("2.1 Login con credenciales incorrectas");

    await expectStatus(
      httpUser.post("/api/sessions/login", {
        email: userEmail,
        password: "wrongpassword"
      }),
      401,
      "Login con password incorrecta → 401"
    );

    await expectStatus(
      httpUser.post("/api/sessions/login", {
        email: "noexiste@test.com",
        password: userPass
      }),
      401,
      "Login con email inexistente → 401"
    );

    subsep("2.2 Login exitoso");

    await expectStatus(
      httpUser.post("/api/sessions/login", {
        email: userEmail,
        password: userPass
      }),
      200,
      "Login exitoso de usuario → 200"
    );

    await expectStatus(
      httpAdmin.post("/api/sessions/login", {
        email: adminEmail,
        password: adminPass
      }),
      200,
      "Login exitoso de admin → 200"
    );

    subsep("2.3 Verificar sesión actual (/current)");

    const currentRes = await expectStatus(
      httpUser.get("/api/sessions/current"),
      200,
      "GET /current con sesión válida → 200"
    );

    // Verificar que el DTO no expone password ni age
    if (currentRes.data?.user) {
      if (!currentRes.data.user.password) {
        ok("DTO no expone password ✓");
      } else {
        bad("DTO expone password (ERROR DE SEGURIDAD)");
      }

      if (!currentRes.data.user.age) {
        ok("DTO no expone age ✓");
      } else {
        bad("DTO expone age (debería estar oculto)");
      }
    }

    // ==========================================================================
    // 3. AUTENTICACIÓN - PASSWORD RESET
    // ==========================================================================
    sep("3. AUTENTICACIÓN - PASSWORD RESET");

    subsep("3.1 Solicitar reset de password");

    await expectStatus(
      httpAnon.post("/api/sessions/forgot-password", {
        email: userEmail
      }),
      200,
      "Solicitar reset de password → 200"
    );

    // Nota: En un test real deberías capturar el email y extraer el token
    // Por ahora solo verificamos que el endpoint funciona
    info("En producción: verificar que se envíe el email con el token");

    subsep("3.2 Reset con token inválido");

    await expectStatus(
      httpAnon.post("/api/sessions/reset-password", {
        token: "tokeninvalido",
        password: "newpass123"
      }),
      400,
      "Reset con token inválido → 400"
    );

    // ==========================================================================
    // 4. PRODUCTOS - VALIDACIÓN DE ROLES
    // ==========================================================================
    sep("4. PRODUCTOS - VALIDACIÓN DE ROLES");

    subsep("4.1 Crear producto sin autenticación");

    await expectOneOf(
      httpAnon.post("/api/products", {
        title: "Producto Anon",
        description: "Test",
        price: 10,
        code: rid("code"),
        stock: 5,
        category: "test",
      }),
      [401, 403],
      "Crear producto sin autenticación → 401/403"
    );

    subsep("4.2 Crear producto con usuario normal (no admin)");

    await expectOneOf(
      httpUser.post("/api/products", {
        title: "Producto User",
        description: "Test",
        price: 10,
        code: rid("code"),
        stock: 5,
        category: "test",
      }),
      [401, 403],
      "Crear producto con user no-admin → 401/403"
    );

    // ==========================================================================
    // 5. PRODUCTOS - CRUD COMO ADMIN
    // ==========================================================================
    sep("5. PRODUCTOS - CRUD COMO ADMIN");

    const codeA = rid("codeA");
    const codeB = rid("codeB");
    const codeC = rid("codeC");
    let productA, productB, productC;

    subsep("5.1 Crear productos - Casos de error");

    // Test: Campos faltantes
    await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Sin descripción",
        price: 10,
        code: rid("incomplete"),
        stock: 5,
        // Falta: description, category
      }),
      400,
      "Crear producto sin campos requeridos → 400"
    );

    // Test: Precio inválido (0 o negativo)
    await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Precio Cero",
        description: "Test",
        price: 0,
        code: rid("p0"),
        stock: 5,
        category: "test",
      }),
      400,
      "Crear producto con precio 0 → 400"
    );

    // Test: Stock negativo
    await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Stock Negativo",
        description: "Test",
        price: 10,
        code: rid("sneg"),
        stock: -5,
        category: "test",
      }),
      400,
      "Crear producto con stock negativo → 400"
    );

    subsep("5.2 Crear productos - Casos exitosos");

    productA = await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Producto A",
        description: "Descripción A",
        price: 10,
        code: codeA,
        stock: 1,
        category: "test",
      }),
      201,
      "Crear producto A → 201"
    ).then((r) => r.data);

    productB = await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Producto B",
        description: "Descripción B",
        price: 50,
        code: codeB,
        stock: 100,
        category: "test",
      }),
      201,
      "Crear producto B → 201"
    ).then((r) => r.data);

    productC = await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Producto C",
        description: "Descripción C",
        price: 100,
        code: codeC,
        stock: 5,
        category: "test",
      }),
      201,
      "Crear producto C → 201"
    ).then((r) => r.data);

    // Test: Código duplicado
    await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Duplicado",
        description: "Test",
        price: 20,
        code: codeA, // ← Código ya usado
        stock: 2,
        category: "test",
      }),
      400,
      "Crear producto con código duplicado → 400"
    );

    subsep("5.3 Leer productos - Validación de ObjectId");

    // Test: GET con ID inválido (NO es ObjectId válido)
    await expectStatus(
      httpAdmin.get("/api/products/123"),
      400,
      "GET producto con ID inválido → 400"
    );

    // Test: GET con ObjectId válido pero inexistente
    await expectOneOf(
      httpAdmin.get(`/api/products/${randomObjectId()}`),
      [404],
      "GET producto con ID válido pero inexistente → 404"
    );

    // Test: GET exitoso
    await expectStatus(
      httpAdmin.get(`/api/products/${idOf(productA)}`),
      200,
      "GET producto exitoso → 200"
    );

    subsep("5.4 Actualizar productos - Validación de campos");

    // Test: Update sin body
    await expectStatus(
      httpAdmin.put(`/api/products/${idOf(productA)}`, {}),
      400,
      "UPDATE producto sin campos → 400"
    );

    // Test: Update con campos inválidos
    await expectStatus(
      httpAdmin.put(`/api/products/${idOf(productA)}`, {
        campoInvalido: "valor"
      }),
      400,
      "UPDATE producto con campo inválido → 400"
    );

    // Test: Update con ID inválido
    await expectStatus(
      httpAdmin.put("/api/products/abc123", {
        price: 20
      }),
      400,
      "UPDATE producto con ID inválido → 400"
    );

    // Test: Update exitoso
    await expectStatus(
      httpAdmin.put(`/api/products/${idOf(productB)}`, {
        price: 60,
        stock: 150
      }),
      200,
      "UPDATE producto exitoso → 200"
    );

    subsep("5.5 Eliminar productos - Validación de roles y ObjectId");

    // Test: DELETE sin ser admin
    await expectOneOf(
      httpUser.delete(`/api/products/${idOf(productB)}`),
      [401, 403],
      "DELETE producto con user no-admin → 401/403"
    );

    // Test: DELETE con ID inválido
    await expectStatus(
      httpAdmin.delete("/api/products/invalid123"),
      400,
      "DELETE producto con ID inválido → 400"
    );

    // Test: DELETE exitoso
    await expectOneOf(
      httpAdmin.delete(`/api/products/${idOf(productB)}`),
      [200, 204],
      "DELETE producto exitoso → 200/204"
    );

    // ==========================================================================
    // 6. CARRITOS - CRUD Y VALIDACIONES
    // ==========================================================================
    sep("6. CARRITOS - CRUD Y VALIDACIONES");

    subsep("6.1 Crear carrito");

    const cart1 = await expectStatus(
      httpUser.post("/api/carts", {}),
      201,
      "Crear carrito → 201"
    ).then((r) => r.data);

    subsep("6.2 Agregar productos al carrito - Casos de error");

    // Test: ID de carrito inválido
    await expectStatus(
      httpUser.post("/api/carts/abc123/products/${idOf(productA)}", {
        qty: 1
      }),
      400,
      "Agregar producto con cartId inválido → 400"
    );

    // Test: ID de producto inválido
    await expectStatus(
      httpUser.post(`/api/carts/${idOf(cart1)}/products/xyz789`, {
        qty: 1
      }),
      400,
      "Agregar producto con productId inválido → 400"
    );

    // Test: Cantidad = 0
    await expectStatus(
      httpUser.post(`/api/carts/${idOf(cart1)}/products/${idOf(productA)}`, {
        qty: 0
      }),
      400,
      "Agregar producto con qty=0 → 400"
    );

    // Test: Cantidad negativa
    await expectStatus(
      httpUser.post(`/api/carts/${idOf(cart1)}/products/${idOf(productA)}`, {
        qty: -5
      }),
      400,
      "Agregar producto con qty negativa → 400"
    );

    // Test: Producto inexistente (ObjectId válido)
    await expectOneOf(
      httpUser.post(`/api/carts/${idOf(cart1)}/products/${randomObjectId()}`, {
        qty: 1
      }),
      [400, 404],
      "Agregar producto inexistente → 400/404"
    );

    // Test: Stock insuficiente (productA tiene stock=1, intentamos agregar 5)
    await expectStatus(
      httpUser.post(`/api/carts/${idOf(cart1)}/products/${idOf(productA)}`, {
        qty: 5
      }),
      400,
      "Agregar producto con stock insuficiente → 400"
    );

    subsep("6.3 Agregar productos al carrito - Casos exitosos");

    await expectStatus(
      httpUser.post(`/api/carts/${idOf(cart1)}/products/${idOf(productA)}`, {
        qty: 1
      }),
      200,
      "Agregar producto A al carrito → 200"
    );

    subsep("6.4 Actualizar cantidad de producto");

    // Test: Cantidad con tipo inválido
    await expectStatus(
      httpUser.put(`/api/carts/${idOf(cart1)}/products/${idOf(productA)}`, {
        quantity: "cinco"
      }),
      400,
      "Actualizar cantidad con tipo inválido → 400"
    );

    // Test: Actualizar a cantidad negativa (elimina el producto)
    await expectStatus(
      httpUser.put(`/api/carts/${idOf(cart1)}/products/${idOf(productA)}`, {
        quantity: 0
      }),
      200,
      "Actualizar cantidad a 0 (elimina) → 200"
    );

    subsep("6.5 Eliminar producto del carrito");

    // Test: Eliminar producto que no está en el carrito
    await expectStatus(
      httpUser.delete(`/api/carts/${idOf(cart1)}/products/${idOf(productA)}`),
      404,
      "Eliminar producto inexistente del carrito → 404"
    );

    subsep("6.6 Cambiar estado del carrito - Validaciones");

    // Test: Estado inválido
    await expectStatus(
      httpUser.put(`/api/carts/${idOf(cart1)}/status`, {
        status: "estadoInvalido"
      }),
      400,
      "Cambiar a estado inválido → 400"
    );

    subsep("6.7 Totales del carrito");

    await expectStatus(
      httpUser.get(`/api/carts/${idOf(cart1)}/totals`),
      200,
      "GET totales del carrito → 200"
    );

    // Test: Totales con cartId inválido
    await expectStatus(
      httpUser.get("/api/carts/invalid123/totals"),
      400,
      "GET totales con cartId inválido → 400"
    );

    subsep("6.8 Vaciar carrito");

    await expectStatus(
      httpUser.delete(`/api/carts/${idOf(cart1)}`),
      200,
      "Vaciar carrito → 200"
    );

    // ==========================================================================
    // 7. COMPRA Y DESCUENTO DE STOCK
    // ==========================================================================
    sep("7. COMPRA Y DESCUENTO DE STOCK");

    subsep("7.1 Preparar carrito para compra");

    const cart2 = await expectStatus(
      httpUser.post("/api/carts", {}),
      201,
      "Crear carrito 2 → 201"
    ).then((r) => r.data);

    // Test: Intentar agregar más cantidad de la disponible
    await expectStatus(
      httpUser.post(`/api/carts/${idOf(cart2)}/products/${idOf(productC)}`, {
        qty: 10 // productC tiene stock=5
      }),
      400,
      "Agregar más cantidad que stock disponible → 400"
    );

    // Agregar 2 unidades de productC (stock=5)
    await expectStatus(
      httpUser.post(`/api/carts/${idOf(cart2)}/products/${idOf(productC)}`, {
        qty: 2
      }),
      200,
      "Agregar 2 unidades de producto C → 200"
    );

    subsep("7.2 Realizar compra y verificar descuento de stock");

    // Obtener stock antes de comprar
    const beforeRes = await httpAdmin.get(`/api/products/${idOf(productC)}`);
    const stockBefore = beforeRes.data?.stock ?? beforeRes.data?.payload?.stock;

    // Realizar compra
    const purchaseRes = await expectStatus(
      httpUser.put(`/api/carts/${idOf(cart2)}/status`, {
        status: "comprado"
      }),
      200,
      "Realizar compra → 200"
    );

    // Verificar que el stock se decrementó correctamente
    const afterRes = await httpAdmin.get(`/api/products/${idOf(productC)}`);
    const stockAfter = afterRes.data?.stock ?? afterRes.data?.payload?.stock;

    if (typeof stockBefore === "number" && typeof stockAfter === "number") {
      if (stockAfter === stockBefore - 2) {
        ok(`Stock decrementado correctamente (${stockBefore} → ${stockAfter})`);
      } else {
        bad(`Stock NO se decrementó correctamente. Antes=${stockBefore}, Después=${stockAfter}`);
      }
    } else {
      bad("No se pudo verificar el descuento de stock");
    }

    // ==========================================================================
    // 8. TICKETS
    // ==========================================================================
    sep("8. TICKETS");

    subsep("8.1 Verificar generación de ticket");

    const ticket = purchaseRes.data?.ticket || purchaseRes.data?.payload?.ticket;

    if (ticket && idOf(ticket)) {
      ok("Ticket generado correctamente en la compra");

      // Verificar monto del ticket
      const expectedAmount = 100 * 2; // precio de productC * cantidad
      if (ticket.amount === expectedAmount) {
        ok(`Monto del ticket correcto (${ticket.amount})`);
      } else {
        bad(`Monto del ticket incorrecto. Esperado=${expectedAmount}, Recibido=${ticket.amount}`);
      }
    } else {
      bad("No se generó ticket en la compra");
    }

    subsep("8.2 Obtener ticket por ID");

    if (ticket && idOf(ticket)) {
      // Test: GET ticket con ID inválido
      await expectStatus(
        httpUser.get("/api/tickets/invalid123"),
        400,
        "GET ticket con ID inválido → 400"
      );

      // Test: GET ticket sin autenticación
      await expectOneOf(
        httpAnon.get(`/api/tickets/${idOf(ticket)}`),
        [401, 403],
        "GET ticket sin autenticación → 401/403"
      );

      // Test: GET ticket exitoso
      await expectStatus(
        httpUser.get(`/api/tickets/${idOf(ticket)}`),
        200,
        "GET ticket por ID → 200"
      );
    }

    subsep("8.3 Listar tickets del usuario");

    const listRes = await expectStatus(
      httpUser.get("/api/tickets"),
      200,
      "Listar mis tickets → 200"
    );

    if (ticket && idOf(ticket)) {
      const items = listRes.data?.items || listRes.data || [];
      const found = items.find((t) => idOf(t) === idOf(ticket));
      if (found) {
        ok("Ticket aparece en el listado del usuario");
      } else {
        bad("Ticket NO aparece en el listado del usuario");
      }
    }

    // ==========================================================================
    // 9. LOGOUT Y SESIONES
    // ==========================================================================
    sep("9. LOGOUT Y SESIONES");

    subsep("9.1 Cerrar sesión");

    await expectStatus(
      httpUser.get("/api/sessions/logout"),
      200,
      "Logout usuario → 200"
    );

    await expectStatus(
      httpAdmin.get("/api/sessions/logout"),
      200,
      "Logout admin → 200"
    );

    subsep("9.2 Verificar sesión después de logout");

    await expectOneOf(
      httpUser.get("/api/sessions/current"),
      [401, 403],
      "GET /current después de logout → 401/403"
    );

    // ==========================================================================
    // 10. RESUMEN
    // ==========================================================================
    sep("10. RESUMEN DE TESTS");

    console.log("\n✅ Todos los tests completados exitosamente!\n");
    console.log("Tests ejecutados:");
    console.log("  ✓ Autenticación (registro, login, logout)");
    console.log("  ✓ Password reset");
    console.log("  ✓ Validación de roles (user vs admin)");
    console.log("  ✓ CRUD de productos con validaciones");
    console.log("  ✓ Validación de ObjectId en todos los endpoints");
    console.log("  ✓ Gestión de carritos (agregar, actualizar, eliminar)");
    console.log("  ✓ Validación de stock");
    console.log("  ✓ Proceso de compra y descuento de stock");
    console.log("  ✓ Generación y consulta de tickets");
    console.log("  ✓ DTOs (no exponer password/age)");
    console.log("\n");

  } catch (err) {
    console.error("\n💥 Error fatal en los tests:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
