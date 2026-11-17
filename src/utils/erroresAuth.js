// Mensajes en español y sin jerga para los errores de Firebase Auth
const MENSAJES = {
  "auth/too-many-requests":
    "Hemos recibido demasiados intentos desde tu conexión. Espera unos minutos e inténtalo de nuevo.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Inicia sesión.",
  "auth/credential-already-in-use": "Ya existe una cuenta con ese correo. Inicia sesión.",
  "auth/invalid-email": "El correo electrónico no es válido. Revísalo e inténtalo de nuevo.",
  "auth/weak-password": "La contraseña es demasiado débil. Usa al menos 6 caracteres.",
  "auth/network-request-failed":
    "No hay conexión con el servidor. Comprueba tu internet e inténtalo de nuevo.",
  "auth/operation-not-allowed": "El registro no está disponible ahora mismo. Escríbenos y lo resolvemos.",
};

export function mensajeErrorAuth(error, porDefecto = "Ha ocurrido un error. Inténtalo de nuevo.") {
  return MENSAJES[error?.code] || porDefecto;
}
