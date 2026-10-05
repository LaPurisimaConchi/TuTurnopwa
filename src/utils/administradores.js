export const ADMIN_EMAILS = [
  "lapurisimaconchioficial@gmail.com",
  "kymuweb@gmail.com",
];

export function esAdministrador(user) {
  return ADMIN_EMAILS.includes(String(user?.email || "").toLowerCase());
}
