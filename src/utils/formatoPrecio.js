// Precio para mostrar, siempre igual: «45 €» y «45,50 €» (coma decimal, espacio antes del €).
export function euros(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  const redondeado = Math.round(n * 100) / 100;
  return Number.isInteger(redondeado) ? `${redondeado} €` : `${redondeado.toFixed(2).replace(".", ",")} €`;
}
