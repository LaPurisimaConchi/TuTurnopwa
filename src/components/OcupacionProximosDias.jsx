// src/components/OcupacionProximosDias.jsx
// Resumen de ocupación de los próximos días por franja (fecha + turno), con el
// aforo y el torno de la configuración del espacio. Solo para el panel admin.
import React, { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { dbRealtime } from "../firebase";
import { cargarConfigEspacio } from "../configuracionEspacio";
import { ocupacionPorFranja, sumarSolapadas } from "../utils/aforo";
import { fechaDMA, hoyMadrid } from "../utils/formatoFecha";

const DIAS_VISTOS = 30;

const sumarDias = (iso, dias) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

function Barra({ valor, maximo }) {
  const pct = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 100;
  const color = valor >= maximo ? "#c0392b" : pct >= 80 ? "#e08e0b" : "#4a8f4a";

  return (
    <div className="h-2 w-full rounded-full bg-[#f3ead7] overflow-hidden" aria-hidden="true">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function OcupacionProximosDias({ version = 0 }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    setDatos(null);
    setError(false);

    const hoy = hoyMadrid();
    const limite = sumarDias(hoy, DIAS_VISTOS);

    Promise.all([
      get(ref(dbRealtime, "reservas")),
      get(ref(dbRealtime, "reservasGrupos")),
      cargarConfigEspacio(),
    ])
      .then(([reservas, grupos, config]) => {
        if (!activo) return;
        const porFranja = ocupacionPorFranja(reservas, grupos, hoy);
        const fechas = Object.keys(porFranja)
          .filter((f) => f <= limite)
          .sort();
        setDatos({ config, porFranja, fechas });
      })
      .catch((err) => {
        console.error("Error al calcular la ocupación:", err);
        if (activo) setError(true);
      });

    return () => {
      activo = false;
    };
  }, [version]);

  return (
    <section className="mt-5 bg-white rounded-2xl border border-[#eadfbe] p-5 shadow-sm space-y-3">
      <h2 className="text-lg font-semibold text-[#3d3126]">
        Ocupación de los próximos {DIAS_VISTOS} días
      </h2>

      {error && <p className="text-sm text-red-700">No se ha podido calcular la ocupación.</p>}
      {!datos && !error && <p className="text-sm text-gray-600">Calculando…</p>}

      {datos && !datos.fechas.length && (
        <p className="text-sm text-gray-600">No hay reservas en este periodo.</p>
      )}

      {datos && datos.fechas.length > 0 && (
        <div className="space-y-3">
          {datos.fechas.map((fecha) => (
            <div key={fecha} className="border-b border-[#f3ead7] last:border-0 pb-3 last:pb-0">
              <p className="text-sm font-bold text-[#3d3126] mb-1.5">{fechaDMA(fecha)}</p>
              <div className="space-y-2">
                {Object.entries(datos.porFranja[fecha])
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([turno]) => {
                    const { total, torno } = sumarSolapadas(datos.porFranja[fecha], turno);
                    return (
                    <div key={turno} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] items-center gap-1 sm:gap-3">
                      <span className="text-sm text-[#3d3126]">{turno}</span>
                      <Barra valor={total} maximo={datos.config.aforoTotal} />
                      <span className="text-xs text-gray-600 whitespace-nowrap">
                        {total}/{datos.config.aforoTotal} plazas
                        {torno > 0 ? ` · torno ${torno}/${datos.config.maxTorno}` : ""}
                        {total >= datos.config.aforoTotal ? " · completo" : ""}
                      </span>
                    </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
