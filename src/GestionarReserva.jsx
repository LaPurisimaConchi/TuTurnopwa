// src/GestionarReserva.jsx
// /gestionar-reserva: una sola página para lo que se hace con un código, en dos
// pestañas: cambiar la fecha de una reserva (sin cuenta, con código de reserva +
// email) y canjear una tarjeta regalo (con el código de la tarjeta). La pestaña
// activa va en ?tab=tarjeta; sin ella, «Cambiar fecha».
import { useSearchParams } from "react-router-dom";
import PantallaReserva from "./components/PantallaReserva";
import Icono from "./components/Icono";
import CambiarFechaReserva from "./CambiarFechaReserva";
import CanjearTarjetaRegalo from "./CanjearTarjetaRegalo";

const PESTANAS = [
  { id: "reserva", nombre: "Cambiar fecha", icono: "calendario" },
  { id: "tarjeta", nombre: "Canjear tarjeta regalo", icono: "regalo" },
];

export default function GestionarReserva() {
  const [params, setParams] = useSearchParams();
  const activa = params.get("tab") === "tarjeta" ? "tarjeta" : "reserva";

  const elegir = (id) => {
    if (id === activa) return;
    setParams(id === "tarjeta" ? { tab: "tarjeta" } : {}, { replace: true });
  };

  return (
    <PantallaReserva ancho="max-w-xl">
      <h1 className="text-center font-serif text-tinta mb-5">
        <span className="block text-sm font-sans font-semibold uppercase tracking-wider text-terracota">
          Mi reserva
        </span>
        <span className="block text-3xl md:text-4xl font-bold leading-tight mt-1">
          {activa === "reserva" ? "Cambiar la fecha" : "Canjear tarjeta regalo"}
        </span>
      </h1>

      <div
        role="tablist"
        className="flex gap-1 mb-6 p-1 rounded-full bg-crema border border-linea"
      >
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`tab-${p.id}`}
            aria-selected={activa === p.id}
            aria-controls={`panel-${p.id}`}
            onClick={() => elegir(p.id)}
            className={`flex-1 px-3 py-2 rounded-full text-sm font-semibold transition ${
              activa === p.id
                ? "bg-terracota text-white shadow-sm"
                : "text-terracota hover:bg-terracota-suave"
            }`}
          >
            <Icono nombre={p.icono} color="currentColor" className="mr-1" />
            {p.nombre}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${activa}`} aria-labelledby={`tab-${activa}`}>
        {activa === "reserva" ? <CambiarFechaReserva /> : <CanjearTarjetaRegalo />}
      </div>
    </PantallaReserva>
  );
}
