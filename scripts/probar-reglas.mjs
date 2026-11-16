// scripts/probar-reglas.mjs
// Pruebas de database.rules.json contra el emulador de Realtime Database (no toca
// staging ni producción: usa el proyecto ficticio demo-reglas). Hace falta Java.
//   npm run probar-reglas
// Los tokens van sin firmar: el emulador no los verifica.
const NS = "demo-reglas-default-rtdb";
const BASE = `http://127.0.0.1:${process.env.PUERTO || 9000}`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (claims) => `${b64({ alg: "none", typ: "JWT" })}.${b64({
  iss: "https://securetoken.google.com/demo-reglas",
  aud: "demo-reglas",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...claims,
})}.`;

const ANON_A = token({ sub: "uidA", user_id: "uidA", firebase: { sign_in_provider: "anonymous" } });
const USER_B = token({ sub: "uidB", user_id: "uidB", email: "b@example.com", email_verified: true, firebase: { sign_in_provider: "password" } });
const ADMIN_SIN = token({ sub: "uidAdm", user_id: "uidAdm", email: "lapurisimaconchioficial@gmail.com", email_verified: false, firebase: { sign_in_provider: "password" } });
const ADMIN = token({ sub: "uidAdm", user_id: "uidAdm", email: "lapurisimaconchioficial@gmail.com", email_verified: true, firebase: { sign_in_provider: "password" } });

async function pedir(metodo, ruta, quien, cuerpo) {
  // El ID token va en ?auth= (la cabecera Bearer es la de las credenciales de servicio)
  const cabeceras = { "Content-Type": "application/json" };
  if (quien === "owner") cabeceras.Authorization = "Bearer owner";
  const auth = quien && quien !== "owner" ? `&auth=${quien}` : "";
  const r = await fetch(`${BASE}/${ruta}.json?ns=${NS}${auth}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  await r.text();
  return r.ok;
}

let fallos = 0;
async function caso(nombre, esperado, promesa) {
  const ok = await promesa;
  const bien = ok === esperado;
  if (!bien) fallos += 1;
  console.log(`${bien ? "OK  " : "MAL "} ${esperado ? "permite" : "deniega"}  ${nombre}`);
}

const pendiente = (uid, extra = {}) => ({ uid, estado: "Pendiente", estadoPago: "pendiente", orderId: "111122223333", plazas: 1, ...extra });
const F = "reservas/Taller/2026-12-01/10:00-12:00";

// Datos de partida (owner salta las reglas)
await pedir("PUT", "", "owner", {
  reservas: { Taller: { "2026-12-01": { "10:00-12:00": {
    "-Existente": pendiente("uidA", { estado: "Confirmada", estadoPago: "pagado" }),
    torno: { "-ExistenteTorno": pendiente("uidB") },
  } } } },
  usuarios: { uidA: { nombre: "A", bonos: { b1: { clasesRestantes: 1 } } }, uidB: { nombre: "B" } },
  reservasGrupos: { "-G2": { uid: "uidB", estado: "Pendiente" } },
  tarjetasRegalo: { "794082140983": { codigo: "REGALO-X", usado: false } },
  codigosTarjetaRegalo: { "REGALO-X": "794082140983" },
  bloqueosFechas: { "2026-12-24": { bloqueado: true, motivo: "Cerrado" } },
  clases: { Taller: { nombre: "Taller" } },
  usuariosNotas: { uidA: "nota" },
  pedidosPendientes: { "999988887777": { uid: "uidB", estadoPago: "pendiente" } },
});

console.log("— Sin sesión");
await caso("leer clases", true, pedir("GET", "clases", null));
await caso("leer bloqueosFechas", true, pedir("GET", "bloqueosFechas", null));
await caso("leer usuarios", false, pedir("GET", "usuarios", null));
await caso("leer reservas", false, pedir("GET", "reservas", null));
await caso("crear pedido pendiente", false, pedir("PUT", "pedidosPendientes/123412341234", null, { orderId: "123412341234", uid: "x", estadoPago: "pendiente", procesado: false }));

console.log("— Invitado anónimo (uidA)");
await caso("leer /usuarios", false, pedir("GET", "usuarios", ANON_A));
await caso("leer su perfil", true, pedir("GET", "usuarios/uidA", ANON_A));
await caso("leer el perfil de otro", false, pedir("GET", "usuarios/uidB", ANON_A));
await caso("actualizar su perfil (update)", true, pedir("PATCH", "usuarios/uidA", ANON_A, { nombre: "A2", telefono: "600" }));
await caso("set de su perfil entero", false, pedir("PUT", "usuarios/uidA", ANON_A, { nombre: "A3" }));
await caso("escribir sus bonos", false, pedir("PUT", "usuarios/uidA/bonos/b1/clasesRestantes", ANON_A, 99));
await caso("update de perfil con bonos", false, pedir("PATCH", "usuarios/uidA", ANON_A, { nombre: "A", bonos: { b2: { clasesRestantes: 9 } } }));
await caso("escribir sus tarjetasRegalo", false, pedir("PUT", "usuarios/uidA/tarjetasRegalo/t1", ANON_A, { usado: false }));
await caso("añadir a su listaReservas", true, pedir("PUT", "usuarios/uidA/listaReservas/-L1", ANON_A, { clase: "x" }));
await caso("escribir el perfil de otro", false, pedir("PUT", "usuarios/uidB/nombre", ANON_A, "hack"));
await caso("borrar /usuarios", false, pedir("DELETE", "usuarios", ANON_A));

await caso("leer /reservas", false, pedir("GET", "reservas", ANON_A));
await caso("leer una reserva", false, pedir("GET", `${F}/-Existente`, ANON_A));
await caso("crear reserva pendiente (set)", true, pedir("PUT", `${F}/-Nueva1`, ANON_A, pendiente("uidA")));
await caso("crear reserva pendiente (update)", true, pedir("PATCH", `${F}/-Nueva2`, ANON_A, pendiente("uidA")));
await caso("crear reserva pendiente con método", true, pedir("PATCH", `${F}/torno/-Nueva3`, ANON_A, pendiente("uidA")));
await caso("crear reserva Confirmada", false, pedir("PUT", `${F}/-Nueva4`, ANON_A, pendiente("uidA", { estado: "Confirmada", estadoPago: "pagado" })));
await caso("crear reserva a nombre de otro", false, pedir("PUT", `${F}/-Nueva5`, ANON_A, pendiente("uidB")));
await caso("crear reserva que guarda plaza (reservadaHasta)", false, pedir("PUT", `${F}/-Nueva6`, ANON_A, pendiente("uidA", { reservadaHasta: "2099-01-01T00:00:00Z" })));
await caso("crear reserva recuperable", false, pedir("PUT", `${F}/-Nueva7`, ANON_A, pendiente("uidA", { cancelacionEstudio: { motivo: "x" } })));
await caso("crear reserva sin clave de push", false, pedir("PUT", `${F}/miClave`, ANON_A, pendiente("uidA")));
await caso("confirmar una reserva existente", false, pedir("PATCH", `${F}/-Existente`, ANON_A, { estado: "Confirmada" }));
await caso("cambiar un campo de una reserva", false, pedir("PUT", `${F}/-Existente/plazas`, ANON_A, 9));
await caso("colar un hijo en una reserva ajena", false, pedir("PUT", `${F}/torno/-ExistenteTorno/-x`, ANON_A, pendiente("uidA")));
await caso("colar un hijo en una reserva sin método", false, pedir("PUT", `${F}/-Existente/-x`, ANON_A, pendiente("uidA")));
await caso("sobrescribir una reserva ajena", false, pedir("PUT", `${F}/torno/-ExistenteTorno`, ANON_A, pendiente("uidA")));
await caso("borrar una reserva", false, pedir("DELETE", `${F}/-Existente`, ANON_A));
await caso("borrar /reservas", false, pedir("DELETE", "reservas", ANON_A));
await caso("borrar un taller de /reservas", false, pedir("DELETE", "reservas/Taller", ANON_A));

await caso("crear grupo pendiente", true, pedir("PUT", "reservasGrupos/-G1", ANON_A, { uid: "uidA", estado: "Pendiente", estadoPago: "pendiente", modoPago: "completo", orderId: "1", plazas: 6 }));
await caso("leer su grupo", true, pedir("GET", "reservasGrupos/-G1", ANON_A));
await caso("leer el grupo de otro", false, pedir("GET", "reservasGrupos/-G2", ANON_A));
await caso("leer /reservasGrupos", false, pedir("GET", "reservasGrupos", ANON_A));
await caso("confirmar su grupo", false, pedir("PUT", "reservasGrupos/-G1/estado", ANON_A, "Confirmada"));
await caso("crear grupo confirmado", false, pedir("PUT", "reservasGrupos/-G3", ANON_A, { uid: "uidA", estado: "Confirmada", estadoPago: "pagado", modoPago: "completo", orderId: "1" }));
await caso("pago individual en un grupo", false, pedir("PUT", "reservasGrupos/-G2/pagosIndividuales/p1", ANON_A, { estadoPago: "pagado" }));
await caso("borrar /reservasGrupos", false, pedir("DELETE", "reservasGrupos", ANON_A));

await caso("crear pedido pendiente", true, pedir("PUT", "pedidosPendientes/123412341234", ANON_A, { orderId: "123412341234", uid: "uidA", estadoPago: "pendiente", procesado: false, precioTotal: 45 }));
await caso("sobrescribir su pedido", false, pedir("PUT", "pedidosPendientes/123412341234", ANON_A, { orderId: "123412341234", uid: "uidA", estadoPago: "pendiente", procesado: false, precioTotal: 1 }));
await caso("crear pedido a nombre de otro", false, pedir("PUT", "pedidosPendientes/123412341235", ANON_A, { orderId: "123412341235", uid: "uidB", estadoPago: "pendiente", procesado: false }));
await caso("crear pedido ya pagado", false, pedir("PUT", "pedidosPendientes/123412341236", ANON_A, { orderId: "123412341236", uid: "uidA", estadoPago: "pagado", procesado: false }));
await caso("leer un pedido", false, pedir("GET", "pedidosPendientes/999988887777", ANON_A));
await caso("borrar /pedidosPendientes", false, pedir("DELETE", "pedidosPendientes", ANON_A));

await caso("leer tarjeta regalo", false, pedir("GET", "tarjetasRegalo/794082140983", ANON_A));
await caso("leer índice de códigos", false, pedir("GET", "codigosTarjetaRegalo/REGALO-X", ANON_A));
await caso("marcar tarjeta usada", false, pedir("PUT", "tarjetasRegalo/794082140983/usado", ANON_A, true));
await caso("crear tarjeta", false, pedir("PUT", "tarjetasRegalo/1", ANON_A, { codigo: "X" }));
await caso("leer bloqueos", true, pedir("GET", "bloqueosFechas", ANON_A));
await caso("bloquear un día", false, pedir("PUT", "bloqueosFechas/2026-12-25", ANON_A, { bloqueado: true }));
await caso("habilitar un día", false, pedir("PUT", "fechasHabilitadas/2026-12-25", ANON_A, { habilitada: true }));
await caso("leer notas de usuarios", false, pedir("GET", "usuariosNotas", ANON_A));
await caso("escribir notas de reservas", false, pedir("PUT", "reservasNotas/x", ANON_A, "n"));
await caso("leer solicitudesEliminacion", false, pedir("GET", "solicitudesEliminacion", ANON_A));
await caso("escribir esperaFundamentalMini", false, pedir("PUT", "esperaFundamentalMini/x", ANON_A, 1));
await caso("leer notificaciones", false, pedir("GET", "notificaciones", ANON_A));
await caso("editar un taller", false, pedir("PUT", "clases/Taller/nombre", ANON_A, "hack"));
await caso("leer codigosReserva", false, pedir("GET", "codigosReserva", ANON_A));

console.log("— Cuenta normal (uidB)");
await caso("leer /reservas", false, pedir("GET", "reservas", USER_B));
await caso("leer bonos de otro", false, pedir("GET", "usuarios/uidA/bonos", USER_B));

console.log("— Admin con el email sin verificar");
await caso("leer /reservas", false, pedir("GET", "reservas", ADMIN_SIN));
await caso("editar un taller", false, pedir("PUT", "clases/Taller/nombre", ADMIN_SIN, "x"));

console.log("— Admin verificado");
await caso("leer /reservas", true, pedir("GET", "reservas", ADMIN));
await caso("leer /usuarios", true, pedir("GET", "usuarios", ADMIN));
await caso("confirmar una reserva", true, pedir("PATCH", `${F}/-Existente`, ADMIN, { estado: "Cancelada" }));
await caso("editar bonos de un usuario", true, pedir("PUT", "usuarios/uidA/bonos/b1/clasesRestantes", ADMIN, 3));
await caso("bloquear un día", true, pedir("PUT", "bloqueosFechas/2026-12-25", ADMIN, { bloqueado: true }));
await caso("notas de reservas", true, pedir("PUT", "reservasNotas/x", ADMIN, "n"));
await caso("leer tarjetas regalo", true, pedir("GET", "tarjetasRegalo", ADMIN));
await caso("pago manual de grupo", true, pedir("PUT", "reservasGrupos/-G2/pagosIndividuales/p1", ADMIN, { estadoPago: "pagado_manual" }));
await caso("editar un taller", true, pedir("PUT", "clases/Taller/nombre", ADMIN, "Taller 2"));
await caso("leer pedidosPendientes", true, pedir("GET", "pedidosPendientes", ADMIN));
await caso("leer codigosReserva (solo servidor)", false, pedir("GET", "codigosReserva", ADMIN));

console.log(fallos ? `\n${fallos} caso(s) no cumplen lo esperado` : "\nTodas las reglas se comportan como se espera");
process.exit(fallos ? 1 : 0);
