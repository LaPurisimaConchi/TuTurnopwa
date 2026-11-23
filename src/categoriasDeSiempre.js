// src/categoriasDeSiempre.js
// Categorías de talleres que vienen con la web. Sin dependencias, para usarlas
// también desde scripts de Node (scripts/migrar-categorias.mjs).
export const GRUPOS_TALLER = [
  {
    id: "crear_piezas",
    titulo: "Crear piezas desde cero",
    ruta: "/talleres/crear-piezas",
  },
  {
    id: "pinta_decora",
    titulo: "Pinta y decora",
    ruta: "/talleres/pinta-decora",
  },
  {
    id: "cursos_bonos",
    titulo: "Cursos y bonos mensuales",
    ruta: "/talleres/cursos-bonos",
  },
  {
    id: "otros",
    titulo: "Otros talleres",
    ruta: "/talleres/otros",
  },
];

// Textos que llevaban en sus listados
export const DESCRIPCION_DE_SIEMPRE = {
  crear_piezas: "Entra aquí para ver todas las clases disponibles y reservar tu plaza",
  pinta_decora: "Elige una opción para ver detalles y reservar tu plaza.",
  cursos_bonos: "Compra tu bono mensual y reserva tus clases",
  otros: "Nuevas experiencias y talleres especiales del estudio",
};

// Orden con el que salían: antes que las categorías nuevas, que empiezan en 1
export const ordenDeSiempre = (indice) => indice - GRUPOS_TALLER.length + 1;

// Registros de categoriasTalleres/{id} con los que se migran las de siempre
// (solo las indicadas; todas si no se indica ninguna). Mismos ids que los
// talleres ya usan, así que ninguna reserva ni taller cambia.
export function registrosDeMigracion(ids, ahora = new Date().toISOString()) {
  return Object.fromEntries(
    GRUPOS_TALLER.map((g, i) => [g, i])
      .filter(([g]) => !ids || ids.includes(g.id))
      .map(([g, i]) => [
        g.id,
        {
          titulo: g.titulo,
          descripcion: DESCRIPCION_DE_SIEMPRE[g.id] || "",
          orden: ordenDeSiempre(i),
          estado: "activa",
          migrada: true,
          creadoEn: ahora,
        },
      ])
  );
}
