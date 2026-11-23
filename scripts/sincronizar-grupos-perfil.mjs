#!/usr/bin/env node
// Copia al perfil de cada cliente (usuarios/{uid}/listaReservas) lo que el panel cambió en su
// reserva de grupo ANTES de que el panel actualizara también el perfil: cancelaciones y
// cambios de día o turno. Sin esto, un grupo cancelado sigue saliendo en «Próximas reservas».
//
// Uso:
//   node scripts/sincronizar-grupos-perfil.mjs --project <proyecto> [--instance <bd>] [--aplicar]
//
//   --project   proyecto de Firebase (obligatorio, para no tocar uno por error)
//   --instance  base de datos, si no es la de por defecto del proyecto
//   --aplicar   escribe; sin él solo cuenta y enseña lo que haría
//
// Usa tu sesión de Firebase CLI (npx firebase-tools login). Solo toca estado, cancelada,
// canceladaEn, canceladaPor, motivoCancelacion, fecha y turno de las entradas del perfil
// cuyo orderId es el de un grupo. Se puede repetir sin riesgo.
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
  salir("Falta --project.\nUso: node scripts/sincronizar-grupos-perfil.mjs --project <proyecto> [--instance <bd>] [--aplicar]");
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

const grupos = leer("/reservasGrupos");
const usuarios = leer("/usuarios");

const CAMPOS = ["estado", "cancelada", "canceladaEn", "canceladaPor", "motivoCancelacion", "fecha", "turno"];
const cambios = {};
let entradas = 0;

for (const [grupoId, grupo] of Object.entries(grupos)) {
  if (!grupo?.uid || !grupo?.orderId) continue;
  const lista = usuarios[grupo.uid]?.listaReservas || {};

  for (const [clave, entrada] of Object.entries(lista)) {
    if (entrada?.orderId !== grupo.orderId) continue;

    let hay = false;
    for (const campo of CAMPOS) {
      if (grupo[campo] === undefined || grupo[campo] === entrada[campo]) continue;
      cambios[`${grupo.uid}/listaReservas/${clave}/${campo}`] = grupo[campo];
      hay = true;
    }
    if (hay) {
      entradas += 1;
      console.log(`Grupo ${grupoId} (${grupo.estado}, ${grupo.fecha}) → perfil de ${grupo.uid}, entrada ${clave}`);
    }
  }
}

console.log(`${Object.keys(grupos).length} grupos en ${proyecto}; ${entradas} entradas del perfil por corregir.`);

if (!aplicar || !entradas) {
  console.log(entradas ? "Simulacro: no se ha escrito nada. Añade --aplicar para corregirlas." : "Nada que hacer.");
  process.exit(0);
}

const carpeta = mkdtempSync(join(tmpdir(), "grupos-"));
try {
  const archivo = join(carpeta, "cambios.json");
  writeFileSync(archivo, JSON.stringify(cambios));
  firebase("database:update", "/usuarios", archivo, "--force");
} finally {
  rmSync(carpeta, { recursive: true, force: true });
}
console.log(`Corregidas ${entradas} entradas.`);
