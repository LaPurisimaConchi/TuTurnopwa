#!/usr/bin/env node
// Marca con usuarios/{uid}/cuentaAnterior = true las cuentas con email y contraseña
// creadas ANTES de que existiera la confirmación de correo. Esas cuentas siguen operando
// sin confirmar; las nuevas (sin la marca) necesitan el correo verificado
// (database.rules.json, api/_cuentaActiva.js y la web).
//
// Hay que ejecutarlo ANTES de desplegar las reglas nuevas y de fusionar en producción.
//
// Uso (credenciales de administrador en las variables de entorno, como en Vercel):
//   FIREBASE_ADMIN_PROJECT_ID=… FIREBASE_ADMIN_CLIENT_EMAIL=… FIREBASE_ADMIN_PRIVATE_KEY=… \
//   FIREBASE_DATABASE_URL=… \
//   node scripts/marcar-cuentas-anteriores.mjs --hasta 2026-11-17T00:00:00Z [--aplicar]
//
//   --hasta    fecha (ISO): solo se marcan las cuentas creadas antes de ella (obligatorio)
//   --aplicar  escribe; sin él solo cuenta lo que haría
// Se puede repetir sin riesgo. No toca las cuentas anónimas ni las ya marcadas.
import admin from "firebase-admin";

const args = process.argv.slice(2);
const valorDe = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const hasta = new Date(valorDe("--hasta") || "");
const aplicar = args.includes("--aplicar");

if (Number.isNaN(hasta.getTime())) {
  console.error("Falta --hasta con una fecha ISO. Ejemplo: --hasta 2026-11-17T00:00:00Z");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: String(process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();
const aMarcar = [];
let total = 0;
let token;
do {
  const lote = await admin.auth().listUsers(1000, token);
  for (const u of lote.users) {
    total += 1;
    const conEmail = u.providerData.some((p) => p.providerId === "password");
    if (conEmail && new Date(u.metadata.creationTime) < hasta) aMarcar.push(u.uid);
  }
  token = lote.pageToken;
} while (token);

console.log(`${total} cuentas en total; ${aMarcar.length} con email creadas antes de ${hasta.toISOString()}.`);

if (!aplicar) {
  console.log("Simulacro: no se ha escrito nada. Añade --aplicar para marcarlas.");
  process.exit(0);
}

for (let i = 0; i < aMarcar.length; i += 400) {
  const cambios = {};
  aMarcar.slice(i, i + 400).forEach((uid) => {
    cambios[`usuarios/${uid}/cuentaAnterior`] = true;
  });
  await db.ref().update(cambios);
}
console.log(`Marcadas ${aMarcar.length} cuentas.`);
process.exit(0);
