// Emails de los administradores. Los mismos que en database.rules.json (si cambia
// uno, cambia el otro). Además del email hace falta tenerlo verificado: las reglas
// piden auth.token.email_verified, así que sin verificar no se entra en el panel.
export const ADMIN_EMAILS = [
  "lapurisimaconchioficial@gmail.com",
  "kymuweb@gmail.com",
  "panabuntu@gmail.com",
];

export const esEmailAdministrador = (email) =>
  ADMIN_EMAILS.includes(String(email || "").toLowerCase());

// Usuario de Firebase Auth del navegador
export function esAdministrador(user) {
  return esEmailAdministrador(user?.email) && user?.emailVerified === true;
}

// Token ya verificado con firebase-admin (api/)
export function esTokenAdministrador(token) {
  return esEmailAdministrador(token?.email) && token?.email_verified === true;
}
