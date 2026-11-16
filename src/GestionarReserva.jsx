// src/GestionarReserva.jsx
// /gestionar-reserva: una sola página para lo que se hace con un código, en dos
// pestañas: cambiar la fecha de una reserva (sin cuenta, con código de reserva +
// email) y canjear una tarjeta regalo (con el código de la tarjeta). La pestaña
// activa va en ?tab=tarjeta; sin ella, «Cambiar fecha».
import { useSearchParams } from "react-router-dom";
import PageContainer from "./PageContainer";
import CambiarFechaReserva from "./CambiarFechaReserva";
import CanjearTarjetaRegalo from "./CanjearTarjetaRegalo";

const PESTANAS = [
  { id: "reserva", nombre: "Cambiar fecha de reserva" },
  { id: "tarjeta", nombre: "Canjear tarjeta regalo" },
];

export default function GestionarReserva() {
  const [params, setParams] = useSearchParams();
  const activa = params.get("tab") === "tarjeta" ? "tarjeta" : "reserva";

  const elegir = (id) => {
    if (id === activa) return;
    setParams(id === "tarjeta" ? { tab: "tarjeta" } : {}, { replace: true });
  };

  return (
    <PageContainer>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-tinta mb-4">Gestionar mi reserva</h1>

        <div role="tablist" className="flex gap-2 mb-6 border-b border-linea">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`tab-${p.id}`}
              aria-selected={activa === p.id}
              aria-controls={`panel-${p.id}`}
              onClick={() => elegir(p.id)}
              className={`flex-1 sm:flex-none px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
                activa === p.id
                  ? "border-terracota text-terracota"
                  : "border-transparent text-tinta-suave hover:text-tinta"
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${activa}`} aria-labelledby={`tab-${activa}`}>
          {activa === "reserva" ? (
            <CambiarFechaReserva />
          ) : (
            <CanjearTarjetaRegalo />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
