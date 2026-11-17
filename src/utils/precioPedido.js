// src/utils/precioPedido.js
// Precio de cada producto a partir de la ficha del taller (clases/{id}). Sin SDK:
// el servidor (api/_pedidoServidor.js) calcula con estas funciones el importe que
// se cobra, y son las mismas reglas que enseñan las pantallas de reserva.
import {
  MAX_PERSONAS_GRUPO,
  idRealDeAliasRegalo,
  metodosDelTaller,
  normalizarTaller,
  opcionesRegaloDinamicas,
  precioDesde,
  variantesDelTaller,
} from "../catalogoBase.js";
import { OPCIONES_TARJETA_REGALO } from "../opcionesTarjetaRegalo.js";
import { MAX_PLAZAS_TARJETA_REGALO } from "./tarjetasRegalo.js";

export const MAX_PLAZAS_RESERVA = MAX_PERSONAS_GRUPO;

const texto = (valor) => String(valor ?? "").trim();

// Precio por persona de una reserva de taller (lo que calcula /reservar/:id y las
// pantallas de siempre): con variantes (tipo, tamaño…), el de la variante más el
// extra del método; con métodos, el del método; si no, el precio del taller.
// 0 si la reserva no corresponde a ninguna opción de la ficha.
export function precioPorPersona(clase = {}, reserva = {}) {
  const variantes = variantesDelTaller(clase);
  const metodos = metodosDelTaller(clase);
  // Algunas pantallas antiguas guardan el método en tipoClase
  const metodo = texto(reserva.metodo || reserva.tipoClase).toLowerCase();

  if (variantes.length) {
    const campo = clase.variante?.campo || "tipoPieza";
    const variante = variantes.find((v) => v.id === texto(reserva[campo]));
    if (!variante) return 0;
    const metodoElegido = metodos.find((m) => m.id === metodo);
    if (metodos.length && !metodoElegido) return 0;
    return variante.precio + (metodoElegido?.extra || 0);
  }

  if (metodos.length) {
    return metodos.find((m) => m.id === metodo)?.precio || 0;
  }

  return Number(clase.precio) || 0;
}

// Precio de un bono: el del taller más el extra por cambiar clases a torno, si lo permite
export function precioBono(clase = {}, { cambioTorno = false } = {}) {
  const precioBase = Number(clase.precio) || 0;
  const permite = clase.permiteCambioTorno === true;
  const extra = permite && cambioTorno
    ? Number(clase.extraCambioTorno ?? clase.ExtraCambioTorno ?? 0) || 0
    : 0;
  return { precioBase, extraCambioTorno: extra, precioTotal: precioBase + extra };
}

// Precio por persona de una reserva de grupo (ReservaGrupos): por variante o por
// método si el taller los tiene; si no, su precio o el más bajo de la ficha.
// `opcionId` es la variante o el método elegido.
export function precioGrupoPorPersona(clase = {}, opcionId = "", metodoId = "") {
  const opcion = texto(opcionId);
  const variantes = variantesDelTaller(clase);
  if (variantes.length) {
    const precio = variantes.find((v) => v.id === opcion)?.precio || 0;
    // Con tipo o tamaño, el método elegido puede sumar un extra
    const extra = metodosDelTaller(clase).find((m) => m.id === texto(metodoId))?.extra || 0;
    return precio > 0 ? precio + extra : 0;
  }

  const metodos = metodosDelTaller(clase).filter((m) => m.precio > 0);
  if (metodos.length) return metodos.find((m) => m.id === opcion)?.precio || 0;

  return Number(clase.precio) || precioDesde(clase) || 0;
}

// Opción de tarjeta regalo con su precio, tal como la ofrece /comprar-tarjeta-regalo:
// las de los talleres del panel salen de su ficha; las de siempre, de la lista fija
// (solo mientras su taller no esté migrado, oculto ni borrado). `clases` = { id: ficha }
// con las fichas que hagan falta. null si la opción no existe o ya no se vende.
export function opcionTarjetaRegalo(opcionId, clases = {}) {
  const id = texto(opcionId);
  if (!id) return null;

  const fija = OPCIONES_TARJETA_REGALO.find((o) => o.id === id);
  if (fija) {
    const idReal = idRealDeAliasRegalo(fija.claseId);
    if (!idReal) return fija;
    const taller = normalizarTaller(idReal, clases[idReal] || undefined);
    return clases[idReal] && taller && !taller.dinamica && taller.estado === "activa" ? fija : null;
  }

  // taller-{claseId}[-{variante}][-{método}]: se recalculan las de ese taller
  const claseId = Object.keys(clases).find((c) => id === `taller-${c}` || id.startsWith(`taller-${c}-`));
  if (!claseId) return null;
  const taller = normalizarTaller(claseId, clases[claseId]);
  if (!taller || taller.estado !== "activa") return null;
  return opcionesRegaloDinamicas([taller]).find((o) => o.id === id) || null;
}

// Plazas que admite una tarjeta regalo de esa opción (los bonos, una)
export function plazasTarjetaValidas(opcion, plazas) {
  const n = Number(plazas);
  const max = opcion?.tipoTaller === "bono_mensual" ? 1 : MAX_PLAZAS_TARJETA_REGALO;
  return Number.isInteger(n) && n >= 1 && n <= max;
}
