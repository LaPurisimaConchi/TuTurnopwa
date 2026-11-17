#!/usr/bin/env node
// Marca con usuarios/{uid}/cuentaAnterior = true las cuentas con email y contraseña
// creadas ANTES de que existiera la confirmación de correo. Esas cuentas siguen operando
// sin confirmar; las nuevas (sin la marca) necesitan el correo verificado
// (database.rules.json, api/_cuentaActiva.js y la web).
//
// Hay que ejecutarlo ANTES de desplegar las reglas nuevas y de fusionar en producción.
//
// Uso:
//   node scripts/marcar-cuentas-anteriores.mjs --project <proyecto> --hasta <fecha ISO> [--instance <bd>] [--aplicar]
//
//   --project   proyecto de Firebase (obligatorio, para no tocar uno por error)
//   --hasta     solo se marcan las cuentas creadas antes de esta fecha (obligatorio),
//               p. ej. 2026-11-17T00:00:00Z
//   --instance  base de datos, si no es la de por defecto del proyecto
//   --aplicar   escribe; sin él solo cuenta lo que haría
//
// Usa tu sesión de Firebase CLI (npx firebase-tools login): no hacen falta claves de
// administrador. Solo añade el campo cuentaAnterior a usuarios/{uid}; no toca nada más.
// Se puede repetir sin riesgo. No marca las cuentas anónimas (sin email).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const hasta = new Date(valorDe("--hasta") || "");
const aplicar = args.includes("--aplicar");

if (!proyecto || proyecto.startsWith("--") || Number.isNaN(hasta.getTime())) {
  salir(
    "Faltan datos.\nUso: node scripts/marcar-cuentas-anteriores.mjs --project <proyecto> --hasta <fecha ISO> [--instance <bd>] [--aplicar]"
  );
}

function firebase(...argumentos) {
  try {
    return execFileSync("npx", ["--yes", "firebase-tools", ...argumentos, "--project", proyecto], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return salir(`Firebase CLI ha fallado:\n${`${error.stdout || ""}${error.stderr || ""}`.trim() || error.message}`);
  }
}

// La exportación lleva hashes de contraseña: va a una carpeta temporal y se borra siempre
const carpeta = mkdtempSync(join(tmpdir(), "cuentas-"));
let usuarios;
try {
  const archivo = join(carpeta, "usuarios.json");
  firebase("auth:export", archivo, "--format=json");
  usuarios = JSON.parse(readFileSync(archivo, "utf8")).users || [];
} finally {
  rmSync(carpeta, { recursive: true, force: true });
}

// Cuenta con email: tiene correo (las anónimas no). La exportación no siempre lista
// el proveedor "password", así que no se depende de él.
const esConEmail = (u) => Boolean(u.email);
const creadaAntes = (u) => Number(u.createdAt) < hasta.getTime();
const sinFecha = usuarios.filter((u) => esConEmail(u) && !Number(u.createdAt)).length;
if (sinFecha) console.warn(`Aviso: ${sinFecha} cuentas con email sin fecha de creación; no se marcan.`);

const aMarcar = usuarios.filter((u) => esConEmail(u) && creadaAntes(u)).map((u) => u.localId);

console.log(
  `${usuarios.length} cuentas en ${proyecto}; ${aMarcar.length} con email creadas antes de ${hasta.toISOString()}.`
);

const conEmail = usuarios.filter(esConEmail);
const fechas = conEmail.map((u) => Number(u.createdAt)).filter(Boolean).sort((a, b) => a - b);
console.log(
  `Cuentas con email: ${conEmail.length}` +
    (fechas.length
      ? ` (la más antigua: ${new Date(fechas[0]).toISOString()}, la más reciente: ${new Date(fechas.at(-1)).toISOString()})`
      : "")
);

if (!aplicar) {
  console.log("Simulacro: no se ha escrito nada. Añade --aplicar para marcarlas.");
  process.exit(0);
}

// Claves con "/" = rutas: se añade solo cuentaAnterior, sin reemplazar el perfil
const cambios = Object.fromEntries(aMarcar.map((uid) => [`${uid}/cuentaAnterior`, true]));
const archivoCambios = join(mkdtempSync(join(tmpdir(), "cambios-")), "cambios.json");
try {
  writeFileSync(archivoCambios, JSON.stringify(cambios));
  firebase("database:update", "/usuarios", archivoCambios, "--force", ...(instancia ? ["--instance", instancia] : []));
} finally {
  rmSync(join(archivoCambios, ".."), { recursive: true, force: true });
}
console.log(`Marcadas ${aMarcar.length} cuentas.`);
