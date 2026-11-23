#!/usr/bin/env node
// Dos arreglos de datos en usuarios/{uid}, para reservas hechas antes de que existieran:
//  1) listaReservas: copia la opción elegida (tipoPieza, nombreTipoPieza) desde la reserva de
//     reservas/… (mismo orderId), para que el perfil enseñe «tumba · torno».
//  2) Borra el campo numérico usuarios/{uid}/reservas, un contador que nadie leía y que se
//     desfasaba (el panel cuenta las entradas de listaReservas).
//
// Uso:
//   node scripts/completar-perfil-reservas.mjs --project <proyecto> [--instance <bd>] [--aplicar]
//
//   --project   proyecto de Firebase (obligatorio, para no tocar uno por error)
//   --instance  base de datos, si no es la de por defecto del proyecto
//   --aplicar   escribe; sin él solo cuenta lo que haría
//
// Usa tu sesión de Firebase CLI (npx firebase-tools login). Solo añade esos dos campos a
// entradas que no los tienen y quita el contador numérico. Se puede repetir sin riesgo.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const valorDe = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const salir = (mensaje) => {
  console.error(mensaje);
  process.exit(1);
};

const proyecto = valorDe("--project");
const instancia = valorDe("--instance");
const aplicar = args.includes("--aplicar");
if (!proyecto || proyecto.startsWith("--")) {
  salir("Falta --project.\nUso: node scripts/completar-perfil-reservas.mjs --project <proyecto> [--instance <bd>] [--aplicar]");
}

const opcionesInstancia = instancia ? ["--instance", instancia] : [];
function firebase(...argumentos) {
  try {
    return execFileSync("npx", ["--yes", "firebase-tools", ...argumentos, "--project", proyecto, ...opcionesInstancia], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return salir(`Firebase CLI ha fallado:\n${`${error.stdout || ""}${error.stderr || ""}`.trim() || error.message}`);
  }
}
const leer = (ruta) => JSON.parse(firebase("database:get", ruta).trim() || "null") || {};

// orderId → { tipoPieza, nombreTipoPieza } de las reservas que llevan opción
const opciones = {};
(function recorrer(nodo) {
  if (!nodo || typeof nodo !== "object") return;
  if (typeof nodo.orderId === "string" && (nodo.tipoPieza || nodo.nombreTipoPieza)) {
    opciones[nodo.orderId] ??= { tipoPieza: nodo.tipoPieza || "", nombreTipoPieza: nodo.nombreTipoPieza || "" };
    return;
  }
  Object.values(nodo).forEach(recorrer);
})(leer("/reservas"));

const usuarios = leer("/usuarios");
const cambios = {};
let entradas = 0;
let contadores = 0;

for (const [uid, usuario] of Object.entries(usuarios)) {
  if (typeof usuario?.reservas === "number") {
    cambios[`${uid}/reservas`] = null;
    contadores += 1;
  }
  for (const [clave, entrada] of Object.entries(usuario?.listaReservas || {})) {
    const opcion = opciones[entrada?.orderId];
    if (!opcion || entrada.tipoPieza || entrada.nombreTipoPieza) continue;
    cambios[`${uid}/listaReservas/${clave}/tipoPieza`] = opcion.tipoPieza;
    cambios[`${uid}/listaReservas/${clave}/nombreTipoPieza`] = opcion.nombreTipoPieza;
    entradas += 1;
  }
}

console.log(`${Object.keys(usuarios).length} usuarios en ${proyecto}: ${entradas} entradas sin opción y ${contadores} contadores numéricos.`);

if (!aplicar || !(entradas + contadores)) {
  console.log(entradas + contadores ? "Simulacro: no se ha escrito nada. Añade --aplicar para corregirlo." : "Nada que hacer.");
  process.exit(0);
}

const carpeta = mkdtempSync(join(tmpdir(), "perfil-"));
try {
  const archivo = join(carpeta, "cambios.json");
  writeFileSync(archivo, JSON.stringify(cambios));
  firebase("database:update", "/usuarios", archivo, "--force");
} finally {
  rmSync(carpeta, { recursive: true, force: true });
}
console.log("Hecho.");
