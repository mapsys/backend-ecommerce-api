// e2e.test.js
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

// ---------- Config ----------
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";

// ---------- HTTP clients ----------
function makeClient(baseURL = BASE_URL) {
  const jar = new CookieJar();
  const http = wrapper(
    axios.create({
      baseURL,
      withCredentials: true,
      jar,
      validateStatus: () => true, // no throw en != 2xx
    })
  );
  return { http, jar };
}

const { http: httpAnon } = makeClient(); // sin cookies
const { http: httpUser } = makeClient(); // user normal
const { http: httpAdmin } = makeClient(); // admin

// ---------- Helpers ----------
const ok = (msg) => console.log("✅", msg);
const bad = (msg) => console.log("❌", msg);
const sep = (t) => console.log("\n— " + t + " " + "—".repeat(Math.max(0, 60 - t.length)));

async function expectStatus(promise, expected, label) {
  const res = await promise;
  if (res.status === expected) ok(`${label} → ${res.status}`);
  else bad(`${label} → esperado ${expected} pero fue ${res.status} :: ${JSON.stringify(res.data)}`);
  return res;
}

async function expectOneOf(promise, expectedArr, label) {
  const res = await promise;
  if (expectedArr.includes(res.status)) ok(`${label} → ${res.status}`);
  else bad(`${label} → esperado uno de [${expectedArr.join(", ")}] pero fue ${res.status} :: ${JSON.stringify(res.data)}`);
  return res;
}

function rid(prefix = "x") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function randomObjectId() {
  const hex = "0123456789abcdef";
  let id = "";
  for (let i = 0; i < 24; i++) id += hex[Math.floor(Math.random() * 16)];
  return id;
}

async function getProduct(http, id) {
  return http.get(`/api/products/${id}`);
}

function idOf(o) {
  return o?._id || o?.id;
}

(async () => {
  try {
    // ---------------- SESSIONS (USER) ----------------
    sep("SESSIONS (USER)");
    const userEmail = `${rid("user")}@test.com`;
    const userPass = "secret123";

    await expectStatus(
      httpUser.post("/api/sessions/register", {
        email: `${rid("bad")}@test.com`,
        password: userPass,
        first_name: "A",
      }),
      401,
      "register faltan campos (user)"
    );

    await expectStatus(
      httpUser.post("/api/sessions/register", {
        email: userEmail,
        password: userPass,
        first_name: "Ada",
        last_name: "Lovelace",
        age: 28,
      }),
      201,
      "register ok (user)"
    );

    await expectStatus(
      httpUser.post("/api/sessions/register", {
        email: userEmail,
        password: userPass,
        first_name: "Ada",
        last_name: "Lovelace",
        age: 28,
      }),
      401,
      "register duplicado (user)"
    );

    await expectStatus(httpUser.post("/api/sessions/login", { email: userEmail, password: "nope" }), 401, "login credenciales inválidas (user)");
    await expectStatus(httpUser.post("/api/sessions/login", { email: userEmail, password: userPass }), 200, "login ok (user)");
    await expectStatus(httpUser.get("/api/sessions/current"), 200, "current ok (user)");

    // ---------------- PRODUCTS: auth/roles ----------------
    sep("PRODUCTS (auth/roles)");

    const codeA = rid("codeA");
    const codeB = rid("codeB");
    let productA, productB;

    await expectOneOf(
      httpAnon.post("/api/products", {
        title: "Anon Prod",
        description: "X",
        price: 10,
        code: rid("codeAnon"),
        stock: 1,
        category: "test",
      }),
      [401, 403],
      "crear producto sin login"
    );

    await expectOneOf(
      httpUser.post("/api/products", {
        title: "User Prod",
        description: "X",
        price: 10,
        code: rid("codeUser"),
        stock: 1,
        category: "test",
      }),
      [401, 403],
      "crear producto con user no admin"
    );

    // ---------------- SESSIONS (ADMIN) ----------------
    sep("SESSIONS (ADMIN)");
    const adminEmail = `${rid("admin")}@coder.com`;
    const adminPass = "secret123";

    await expectStatus(
      httpAdmin.post("/api/sessions/register", {
        email: adminEmail,
        password: adminPass,
        first_name: "Root",
        last_name: "Admin",
        age: 33,
      }),
      201,
      "register ok (admin)"
    );

    await expectStatus(httpAdmin.post("/api/sessions/login", { email: adminEmail, password: adminPass }), 200, "login ok (admin)");
    await expectStatus(httpAdmin.get("/api/sessions/current"), 200, "current ok (admin)");

    // ---------------- PRODUCTS (admin) ----------------
    sep("PRODUCTS (admin happy path + errores)");

    productA = await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Prod A",
        description: "A",
        price: 10,
        code: codeA,
        stock: 1,
        category: "test",
        thumbnail: "",
      }),
      201,
      "crear producto A (admin)"
    ).then((r) => r.data);

    await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Otro",
        description: "dup",
        price: 20,
        code: codeA,
        stock: 2,
        category: "test",
      }),
      400,
      "crear duplicado code (admin)"
    );

    await expectStatus(
      httpAdmin.post("/api/products", {
        title: "SinCampos",
        price: 10,
        code: rid("missing"),
        stock: 1,
        // falta description/category
      }),
      400,
      "crear producto con campos faltantes (admin)"
    );

    await expectStatus(
      httpAdmin.post("/api/products", {
        title: "PrecioCero",
        description: "X",
        price: 0,
        code: rid("p0"),
        stock: 1,
        category: "test",
      }),
      400,
      "crear con precio 0 (admin)"
    );

    await expectStatus(
      httpAdmin.post("/api/products", {
        title: "StockNeg",
        description: "X",
        price: 10,
        code: rid("sneg"),
        stock: -5,
        category: "test",
      }),
      400,
      "crear con stock negativo (admin)"
    );

    await expectStatus(httpAdmin.get("/api/products/123"), 400, "get product id inválido");
    await expectStatus(httpAdmin.put(`/api/products/${productA.id || productA._id}`, {}), 400, "update body vacío");

    productB = await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Prod B",
        description: "B",
        price: 50,
        code: codeB,
        stock: 100,
        category: "test",
      }),
      201,
      "crear producto B (admin)"
    ).then((r) => r.data);

    await expectStatus(httpAdmin.put(`/api/products/${productB.id || productB._id}`, { foo: "bar" }), 400, "update con campo inválido");

    // ---------------- CARTS ----------------
    sep("CARTS");

    const cart = await expectStatus(httpUser.post("/api/carts", {}), 201, "crear carrito").then((r) => r.data);

    await expectStatus(httpUser.post(`/api/carts/${cart._id || cart.id}/products/${productB.id || productB._id}`, { qty: 0 }), 400, "add product qty=0");
    await expectStatus(httpUser.post(`/api/carts/${cart._id || cart.id}/products/123`, { qty: 1 }), 400, "add product id inválido");
    await expectOneOf(httpUser.post(`/api/carts/${cart._id || cart.id}/products/${randomObjectId()}`, { qty: 1 }), [400, 404], "add product id válido pero inexistente");
    await expectStatus(httpUser.post(`/api/carts/${cart._id || cart.id}/products/${productA.id || productA._id}`, { qty: 5 }), 400, "add product stock insuficiente");
    await expectStatus(httpUser.post(`/api/carts/${cart._id || cart.id}/products/${productA.id || productA._id}`, { qty: 1 }), 200, "add product A ok");
    await expectStatus(httpUser.put(`/api/carts/${cart._id || cart.id}/products/${productA.id || productA._id}`, { quantity: "cinco" }), 400, "update qty tipo inválido");
    await expectStatus(httpUser.put(`/api/carts/${cart._id || cart.id}/products/${productA.id || productA._id}`, { quantity: -3 }), 200, "update qty negativo (elimina)");
    await expectStatus(httpUser.delete(`/api/carts/${cart._id || cart.id}/products/${productA.id || productA._id}`), 404, "remove product inexistente en carrito");
    await expectStatus(httpUser.get(`/api/carts/${cart._id || cart.id}/totals`), 200, "totals ok");
    await expectStatus(httpUser.put(`/api/carts/${cart._id || cart.id}/status`, { status: "desconocido" }), 400, "status inválido");
    await expectStatus(httpUser.delete(`/api/carts/${cart._id || cart.id}`), 200, "vaciar carrito");

    // ---------------- STOCK & PURCHASE ----------------
    sep("STOCK & PURCHASE");

    const productC = await expectStatus(
      httpAdmin.post("/api/products", {
        title: "Prod C",
        description: "C",
        price: 100,
        code: rid("codeC"),
        stock: 1,
        category: "test",
      }),
      201,
      "crear producto C (admin)"
    ).then((r) => r.data);

    const cart2 = await expectStatus(httpUser.post("/api/carts", {}), 201, "crear carrito 2").then((r) => r.data);

    await expectStatus(httpUser.post(`/api/carts/${cart2._id || cart2.id}/products/${productC._id || productC.id}`, { qty: 2 }), 400, "add C (2 uds) stock insuficiente");
    await expectStatus(httpAdmin.put(`/api/products/${productC._id || productC.id}`, { stock: 5 }), 200, "subir stock C a 5 (admin)");

    const baseProd = await getProduct(httpAdmin, productC._id || productC.id);
    const stockBefore = baseProd.status === 200 ? baseProd.data.stock ?? baseProd.data?.payload?.stock : undefined;

    await expectStatus(httpUser.post(`/api/carts/${cart2._id || cart2.id}/products/${productC._id || productC.id}`, { qty: 2 }), 200, "add C (2 uds) ok");

    // COMPRA
    const purchaseRes = await expectStatus(httpUser.put(`/api/carts/${cart2._id || cart2.id}/status`, { status: "comprado" }), 200, "comprar OK con stock suficiente");

    // Verificar decremento de stock (5 -> 3)
    const afterProd = await getProduct(httpAdmin, productC._id || productC.id);
    if (afterProd.status === 200 && typeof stockBefore === "number") {
      const stockAfter = afterProd.data.stock ?? afterProd.data?.payload?.stock;
      if (typeof stockAfter === "number" && stockAfter === stockBefore - 2) {
        ok(`stock decrementado correctamente (${stockBefore} -> ${stockAfter})`);
      } else {
        bad(`stock no se decrementó como se esperaba. Antes=${stockBefore}, Después=${stockAfter}`);
      }
    } else {
      bad("no se pudo leer stock para la verificación post-compra");
    }

    // ---------------- TICKETS ----------------
    sep("TICKETS");

    // Se espera que updateStatus haya devuelto { cart, ticket }
    const ticketFromPurchase = purchaseRes.data?.ticket || purchaseRes.data?.payload?.ticket || purchaseRes.data?.data?.ticket;

    if (!ticketFromPurchase || !idOf(ticketFromPurchase)) {
      bad("no vino ticket en la respuesta de compra; revisá que /api/carts/:cid/status genere y devuelva { ticket }");
    } else {
      ok("ticket presente en la respuesta de compra");
    }

    // Monto esperado = precio * cantidad (2 uds)
    const expectedAmount = Number(productC.price) * 2;

    // GET /api/tickets/:id (user)
    if (ticketFromPurchase && idOf(ticketFromPurchase)) {
      const tId = idOf(ticketFromPurchase);
      const tRes = await expectStatus(httpUser.get(`/api/tickets/${tId}`), 200, "GET ticket por id (user)");
      const t = tRes.data;

      if (typeof t?.amount === "number" && t.amount === expectedAmount) {
        ok(`amount del ticket OK (${t.amount})`);
      } else {
        bad(`amount del ticket inesperado. Esperado=${expectedAmount}, Recibido=${t?.amount}`);
      }

      // GET /api/tickets (list mine)
      const listRes = await expectStatus(httpUser.get(`/api/tickets`), 200, "listar mis tickets (user)");
      const items = listRes.data?.items || [];
      const found = items.find((x) => idOf(x) === tId);
      if (found) ok("ticket aparece en el listado del usuario");
      else bad("ticket NO figura en el listado del usuario");

      // Acceso anónimo prohibido
      await expectOneOf(httpAnon.get(`/api/tickets/${tId}`), [401, 403], "GET ticket sin login → 401/403");
    }

    // ---------------- PRODUCTS delete (roles) ----------------
    sep("PRODUCTS DELETE (roles)");

    await expectOneOf(httpUser.delete(`/api/products/${productB.id || productB._id}`), [401, 403], "delete product con user no admin");
    await expectStatus(httpAdmin.delete("/api/products/123"), 400, "delete id inválido (admin)");
    await expectOneOf(httpAdmin.delete(`/api/products/${productB.id || productB._id}`), [200, 204], "delete product B (admin)");

    // ---------------- LOGOUTS ----------------
    sep("SESSIONS (logout)");

    await expectStatus(httpUser.get("/api/sessions/logout"), 200, "logout ok (user)");
    await expectStatus(httpAdmin.get("/api/sessions/logout"), 200, "logout ok (admin)");
    await expectOneOf(httpAnon.get("/api/sessions/current"), [401, 403], "current sin cookie");

    sep("LISTO ✅");
  } catch (err) {
    console.error("💥 Error en tests:", err);
    process.exit(1);
  }
})();
