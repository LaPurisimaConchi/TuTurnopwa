// Avisos y confirmaciones de la propia web, en lugar de los diálogos nativos del navegador
// (que el navegador integrado y las PWA descartan, y que no se pueden estilar).
//
//   avisar("Guardado")             aviso que se quita solo (no bloquea)
//   if (await preguntar("¿…?"))    pregunta con Cancelar / Aceptar
//
// `instalarAvisos()` hace que `alert(...)` (hay cientos de llamadas) salga como un aviso
// de estos. Los pinta `components/Avisos.jsx`, montado una vez en `main.jsx`.
const EVENTO_AVISO = "purisima:aviso";
const EVENTO_CONFIRMAR = "purisima:confirmar";

const PARECE_ERROR =
  /\b(no se (ha )?(pud|pod|pued)|no pudo|no (es|ha sido) posible|error|falta|debes|inválid|no válid|no puedes|ya existe|selecciona|indica|elige|introduce|rellena|necesitas|demasiad|caduc)/i;

export function avisar(mensaje, tipo) {
  const texto = String(mensaje ?? "").trim();
  if (!texto || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENTO_AVISO, {
      detail: { texto, tipo: tipo || (PARECE_ERROR.test(texto) ? "error" : "ok") },
    })
  );
}

export function preguntar(mensaje) {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(EVENTO_CONFIRMAR, { detail: { texto: String(mensaje ?? ""), resolve } }));
  });
}

export function instalarAvisos() {
  if (typeof window === "undefined") return;
  window.alert = (mensaje) => avisar(mensaje);
}

export { EVENTO_AVISO, EVENTO_CONFIRMAR };
