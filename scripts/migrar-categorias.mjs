#!/usr/bin/env node
// Migra las categorías de talleres de siempre a categoriasTalleres/{id}, para
// gestionarlas desde el panel (editar, ordenar, ocultar y borrar).
//
// Uso:
//   node scripts/migrar-categorias.mjs --project <proyecto> [--instance <bd>] [--dry-run] [--yes]
//
//   --project   proyecto de Firebase (obligatorio, para no migrar uno por error)
//   --instance  base de datos, si no es la de por defecto del proyecto
//   --dry-run   solo muestra qué haría, sin escribir nada
//   --yes       no pregunta antes de escribir (en proyectos que no sean de staging
//               se pide siempre escribir el nombre del proyecto)
//
// Usa tu sesión de Firebase CLI (npx firebase-tools login): no hace falta entrar
// como admin en la web. Solo escribe en categoriasTalleres/: los talleres (clases/)
// y las reservas (reservas/) no se tocan. Se puede repetir sin riesgo: las
// categorías que ya están en la base de datos (migradas, editadas o eliminadas)
// se dejan como están.
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { GRUPOS_TALLER, registrosDeMigracion } from "../src/categoriasDeSiempre.js";

const args = process.argv.slice(2);
const valorDe = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};

const proyecto = valorDe("--project");
const instancia = valorDe("--instance");
const simulacro = args.includes("--dry-run");
const sinPreguntar = args.includes("--yes");

const salir = (mensaje, codigo = 1) => {
  console.error(mensaje);
  process.exit(codigo);
};

if (!proyecto || proyecto.startsWith("--")) {
  salir(
    "Falta el proyecto.\nUso: node scripts/migrar-categorias.mjs --project <proyecto> [--instance <bd>] [--dry-run] [--yes]"
  );
}

function firebase(...argumentos) {
  const destino = ["--project", proyecto, ...(instancia ? ["--instance", instancia] : [])];

  try {
    return execFileSync("npx", ["--yes", "firebase-tools", ...argumentos, ...destino], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detalle = `${error.stdout || ""}${error.stderr || ""}`.trim();
    return salir(`Firebase CLI ha fallado:\n${detalle || error.message}`);
  }
}

function leerCategorias() {
  const salida = firebase("database:get", "/categoriasTalleres").trim();

  try {
    return JSON.parse(salida || "null") || {};
  } catch {
    return salir(`No se ha entendido la respuesta de la base de datos:\n${salida}`);
  }
}

async function preguntar(texto) {
  const lector = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await lector.question(texto);
  lector.close();
  return respuesta.trim();
}

console.log(`Proyecto: ${proyecto}${instancia ? ` (base de datos ${instancia})` : ""}`);

const actual = leerCategorias();
const pendientes = [];

GRUPOS_TALLER.forEach((g) => {
  const registro = actual[g.id];
  let estado = "pendiente de migrar";

  if (registro) estado = registro.eliminada ? "eliminada (se deja)" : "ya migrada (se deja)";
  else pendientes.push(g.id);

  console.log(`  - ${g.titulo} [${g.id}]: ${estado}`);
});

if (!pendientes.length) {
  console.log("\nNada que migrar.");
  process.exit(0);
}

const nuevos = registrosDeMigracion(pendientes);
console.log(`\nSe escribirán ${pendientes.length} en categoriasTalleres/:`);
console.log(JSON.stringify(nuevos, null, 2));

if (simulacro) {
  console.log("\n--dry-run: no se ha escrito nada.");
  process.exit(0);
}

const esStaging = /staging/i.test(proyecto);

if (!esStaging) {
  const escrito = await preguntar(`\n«${proyecto}» no es staging. Escribe el nombre del proyecto para continuar: `);
  if (escrito !== proyecto) salir("No coincide. No se ha escrito nada.", 0);
} else if (!sinPreguntar) {
  const respuesta = await preguntar("\n¿Continuar? (s/N): ");
  if (!/^s(í|i)?$/i.test(respuesta)) salir("No se ha escrito nada.", 0);
}

firebase("database:update", "/categoriasTalleres", "--data", JSON.stringify(nuevos), "--force");

const tras = leerCategorias();
const faltan = pendientes.filter((id) => !tras[id]);

if (faltan.length) salir(`\nNo se han guardado: ${faltan.join(", ")}.`);

console.log(`\nListo: ${pendientes.length} categorías migradas.`);
