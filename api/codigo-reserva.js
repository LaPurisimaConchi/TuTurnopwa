// api/codigo-reserva.js
// Código de reserva de quien acaba de reservar: lo crea si aún no existe y lo
// devuelve para enseñárselo en pantalla (el aviso del TPV puede tardar unos
// segundos y los grupos con pago individual no pasan por él al reservar).
//
// POST Authorization: Bearer <idToken de Firebase>
//      { tipo: "grupo", grupoId }  |  { tipo: "pedido", orderId }
//      { tipo: "cancelacion", ruta, enviarCorreo, permitirReprogramar? }
//      { tipo: "reservar", claseId, items: [{ fecha, turno, metodo, plazas, reserva }], edicionId? }
//      { tipo: "tarjeta", codigo }  |  { tipo: "canjear", codigo, orderId, bono? }
//      { tipo: "restablecerContrasena", email }  (sin sesión: correo de «has olvidado tu contraseña»)
//      { tipo: "verificarEmail" }  (correo para confirmar el email de la cuenta)
//      { tipo: "usarBono", bonoId, fecha, turno }
//      { tipo: "gestionarSesionBono", accion: "cancelar"|"reprogramar", bonoId, reservaId, fecha?, turno? }
//      { tipo: "sesionesPendientes" }  |  { tipo: "siguienteSesion", orderId, fecha, turno }
//      { tipo: "prepararPago", pedido: "reserva"|"bono"|"grupo"|"tarjeta_regalo", orderId, … }
// "pedido" sirve tanto para una reserva individual como para un grupo pagado de una vez.
// "cancelacion" (solo admins) deja recuperable una reserva que cancela el estudio y envía
// el correo de aviso (api/_cancelacionReserva.js).
// "reservar" crea la reserva pendiente comprobando el aforo real (api/_reservarServidor.js).
// "tarjeta", "canjear" y "usarBono" (api/_canjeServidor.js): comprobar un código de tarjeta
// regalo, confirmar con ella las reservas pendientes de un pedido (y crear el bono, y
// enviar el correo de confirmación) y reservar una clase de un bono. Las reglas de la
// base de datos no dejan al navegador escribir tarjetas ni bonos.
// "prepararPago" crea el pedido con el importe calculado en el servidor, el único que
// firma api/crear-sesion.js (api/_pedidoServidor.js).
// Todo vive aquí y no en funciones propias porque Vercel limita a 12 funciones por proyecto.
//
// Solo responde al dueño de la reserva (uid del token = uid de la reserva).
import { adminAuth, adminDb } from "./_firebaseAdmin.js";
import { applyCors } from "./_cors.js";
import {
  asegurarCodigo,
  buscarGrupoPorOrderId,
  buscarReservaIndividual,
  formatearCodigo,
} from "./_codigosReserva.js";
import { esReservaValida } from "../src/utils/plazasOcupadas.js";
import { reservarConAforo } from "./_reservarServidor.js";
import { registrarCancelacion } from "./_cancelacionReserva.js";
import { canjearTarjeta, consultarTarjeta, usarBono } from "./_canjeServidor.js";
import { gestionarSesionBono } from "./_bonoSesionServidor.js";
import { reservarSiguienteSesion, sesionesPendientes } from "./_sesionesServidor.js";
import { esTokenAdministrador } from "../src/utils/administradores.js";
import { cuentaActiva } from "./_cuentaActiva.js";
import { enviarCorreoRestablecer, enviarCorreoVerificacion } from "./_correoVerificacion.js";
import { prepararPago } from "./_pedidoServidor.js";
import { consumirIntento, hash, ipDe, limiteAlcanzado } from "./_limiteIntentos.js";

export const config = { runtime: "nodejs" };

// Comprobar o canjear códigos de tarjeta regalo tiene límite: sin él se podrían probar
// códigos hasta acertar uno. Por IP, 30 intentos cada 15 minutos y 8 códigos que no
// existen por hora.
const LIMITES_TARJETA = "limitesTarjetaRegalo";
const DEMASIADOS = { ok: false, error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.", codigo: "demasiados_intentos" };

async function conLimiteDeTarjeta(req, res, comprobar) {
  const ip = hash(ipDe(req));
  const claveFallos = `fallos_${ip}`;
  if (
    !(await consumirIntento(adminDb, LIMITES_TARJETA, `ip_${ip}`, 30, 15 * 60_000)) ||
    (await limiteAlcanzado(adminDb, LIMITES_TARJETA, claveFallos, 8, 60 * 60_000))
  ) {
    return res.status(429).json(DEMASIADOS);
  }

  const { status, ...resto } = await comprobar();
  if (status === 404 && resto.codigo === "no_existe") {
    await consumirIntento(adminDb, LIMITES_TARJETA, claveFallos, Number.MAX_SAFE_INTEGER, 60 * 60_000);
  }
  return res.status(status).json(resto);
}

// Web desde la que se llama (https://dominio). El enlace del correo de confirmación vuelve
// a ella; sale de la cabecera Host, que fija Vercel según el dominio, no del cuerpo.
function origenDeLaWeb(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return "";
  return `${/^(localhost|127\.0\.0\.1)(:|$)/i.test(host) ? "http" : "https"}://${host}`;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    // «¿Has olvidado tu contraseña?»: sin sesión (quien lo pide no puede entrar)
    const cuerpoPublico = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    if (cuerpoPublico.tipo === "restablecerContrasena") {
      const { status, ...resto } = await enviarCorreoRestablecer(cuerpoPublico.email, {
        origen: origenDeLaWeb(req),
        ip: ipDe(req),
      });
      return res.status(status).json(resto);
    }

    const token = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return res.status(401).json({ ok: false, error: "Autenticación requerida" });

    let decodificado;
    try {
      decodificado = await adminAuth.verifyIdToken(token);
    } catch {
      // Token caducado o falso: es un fallo de sesión, no del servidor
      return res.status(401).json({ ok: false, error: "Sesión no válida. Vuelve a iniciar sesión.", codigo: "sesion_no_valida" });
    }
    const { uid } = decodificado;
    const cuerpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    // Solo el panel: prepara una reserva cancelada por el estudio para que el cliente
    // pueda volver a reservar con su código, y le avisa por correo si se pide
    if (cuerpo.tipo === "cancelacion") {
      if (!esTokenAdministrador(decodificado)) {
        return res.status(403).json({ ok: false, error: "Solo los administradores" });
      }
      const { status, ...resto } = await registrarCancelacion(adminDb, {
        ruta: cuerpo.ruta,
        enviarCorreo: cuerpo.enviarCorreo === true,
        permitirReprogramar: cuerpo.permitirReprogramar !== false,
      });
      return res.status(status).json(resto);
    }

    // Correo de confirmación del email de la cuenta (registro y reenvío desde el login):
    // es lo único que puede hacer una cuenta nueva sin confirmar
    if (cuerpo.tipo === "verificarEmail") {
      const { status, ...resto } = await enviarCorreoVerificacion(uid, { origen: origenDeLaWeb(req) });
      return res.status(status).json(resto);
    }

    if (!(await cuentaActiva(decodificado))) {
      return res.status(403).json({
        ok: false,
        error: "Confirma tu correo para continuar.",
        codigo: "email_sin_verificar",
      });
    }

    if (cuerpo.tipo === "tarjeta") {
      return conLimiteDeTarjeta(req, res, () => consultarTarjeta(adminDb, uid, cuerpo.codigo));
    }

    if (cuerpo.tipo === "canjear") {
      return conLimiteDeTarjeta(req, res, () =>
        canjearTarjeta(adminDb, uid, {
          codigo: cuerpo.codigo,
          orderId: cuerpo.orderId,
          bono: cuerpo.bono,
        })
      );
    }

    if (cuerpo.tipo === "usarBono") {
      const { status, ...resto } = await usarBono(adminDb, uid, {
        bonoId: cuerpo.bonoId,
        fecha: cuerpo.fecha,
        turno: cuerpo.turno,
      });
      return res.status(status).json(resto);
    }

    // Cancelar o reprogramar desde el perfil una sesión reservada con un bono
    if (cuerpo.tipo === "gestionarSesionBono") {
      const { status, ...resto } = await gestionarSesionBono(adminDb, uid, {
        accion: cuerpo.accion,
        bonoId: cuerpo.bonoId,
        reservaId: cuerpo.reservaId,
        fecha: cuerpo.fecha,
        turno: cuerpo.turno,
      });
      return res.status(status).json(resto);
    }

    // Taller de varias sesiones reservado solo con la primera: lista y reserva las siguientes
    if (cuerpo.tipo === "sesionesPendientes") {
      const { status, ...resto } = await sesionesPendientes(adminDb, uid);
      return res.status(status).json(resto);
    }

    if (cuerpo.tipo === "siguienteSesion") {
      const { status, ...resto } = await reservarSiguienteSesion(adminDb, uid, {
        orderId: cuerpo.orderId,
        fecha: cuerpo.fecha,
        turno: cuerpo.turno,
      });
      return res.status(status).json(resto);
    }

    if (cuerpo.tipo === "prepararPago") {
      const { status, ...resto } = await prepararPago(adminDb, uid, cuerpo);
      return res.status(status).json(resto);
    }

    if (cuerpo.tipo === "reservar") {
      const resultado = await reservarConAforo(adminDb, uid, cuerpo.claseId, cuerpo.items, {
        edicionId: cuerpo.edicionId,
      });
      const { status, ...resto } = resultado;
      return res.status(status).json(resto);
    }

    if (cuerpo.tipo === "grupo") {
      const grupoId = String(cuerpo.grupoId || "");
      if (!/^[A-Za-z0-9_-]{10,40}$/.test(grupoId)) {
        return res.status(400).json({ ok: false, error: "Reserva no válida" });
      }

      const grupo = await adminDb.ref(`reservasGrupos/${grupoId}`).get();
      if (!grupo.exists() || grupo.val()?.uid !== uid) {
        return res.status(404).json({ ok: false, error: "Reserva no encontrada" });
      }

      const codigo = await asegurarCodigo(adminDb, {
        clave: `grupo_${grupoId}`,
        datos: { tipo: "grupo", grupoId, uid },
      });
      await adminDb.ref(`reservasGrupos/${grupoId}/codigoReserva`).set(codigo);

      return res.status(200).json({ ok: true, codigo: formatearCodigo(codigo) });
    }

    if (cuerpo.tipo === "pedido") {
      const orderId = String(cuerpo.orderId || "");
      if (!/^\d{4,20}$/.test(orderId)) {
        return res.status(400).json({ ok: false, error: "Reserva no válida" });
      }

      const encontrada = await buscarReservaIndividual(adminDb, orderId);

      // Solo reservas ya pagadas: una pendiente aún no puede cambiarse
      if (encontrada && encontrada.reserva.uid === uid && esReservaValida(encontrada.reserva)) {
        const ruta = encontrada.segmentos.join("/");
        const codigo = await asegurarCodigo(adminDb, {
          clave: orderId,
          datos: { tipo: "individual", orderId, ruta, uid },
        });
        await adminDb.ref(`${ruta}/codigoReserva`).set(codigo);

        return res.status(200).json({ ok: true, codigo: formatearCodigo(codigo) });
      }

      const grupo = await buscarGrupoPorOrderId(adminDb, orderId);
      if (grupo && grupo.grupo.uid === uid) {
        const codigo = await asegurarCodigo(adminDb, {
          clave: `grupo_${grupo.id}`,
          datos: { tipo: "grupo", grupoId: grupo.id, uid },
        });
        await adminDb.ref(`reservasGrupos/${grupo.id}/codigoReserva`).set(codigo);

        return res.status(200).json({ ok: true, codigo: formatearCodigo(codigo) });
      }

      // Tarjeta regalo comprada: el mismo código que lleva su correo de confirmación
      const tarjeta = await adminDb.ref(`tarjetasRegalo/${orderId}`).get();
      if (tarjeta.exists() && tarjeta.val()?.uidComprador === uid && tarjeta.val()?.estadoPago === "pagado") {
        const codigo = await asegurarCodigo(adminDb, {
          clave: orderId,
          datos: { tipo: "tarjeta_regalo", orderId, uid },
        });

        return res.status(200).json({ ok: true, codigo: formatearCodigo(codigo) });
      }

      return res.status(404).json({ ok: false, error: "Reserva no encontrada" });
    }

    return res.status(400).json({ ok: false, error: "Tipo no válido" });
  } catch (error) {
    console.error("Error en /api/codigo-reserva:", error);
    return res.status(500).json({ ok: false, error: "No se pudo obtener el código" });
  }
}
