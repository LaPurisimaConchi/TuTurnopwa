// src/components/CambioFechaGrupoAdmin.jsx
// Cambio de fecha de una reserva de grupo desde el panel (AdminReservasGrupos). Usa el
// mismo calendario que el resto de pantallas (CalendarioReserva): los días cerrados
// desde el panel salen en rojo, los bloqueos por horas quitan solo los turnos que
// tocan y cada turno enseña las plazas libres del espacio (aforo común y tope de torno).
// Los turnos son los de grupo (los mismos que ofrece ReservaGrupos.jsx).
import { useState } from "react";
import CalendarioReserva from "./CalendarioReserva";
import { TURNOS_GRUPO, turnoYaEmpezado } from "../utils/cambioFecha";
import { bloqueoAfectaTurno } from "../utils/rangosHora";
import { contarFranja, plazasLibresFranja, turnosCompartenPlazas, usaTorno } from "../utils/aforo";
import { fechaDMA } from "../utils/formatoFecha";

const fechaLarga = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// `contexto`: { cargando, error, bloqueos, reservas, grupos }; `reservas` y `grupos`
// son los snapshots de /reservas y /reservasGrupos, para contar las plazas.
export default function CambioFechaGrupoAdmin({ grupo, contexto, config, guardando, onGuardar, onCancelar }) {
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");

  const { cargando = true, error = "", bloqueos = {}, reservas = null, grupos = null } = contexto || {};
  const plazas = Math.max(1, Number(grupo.plazas || 1));
  const conTorno = usaTorno(grupo);
  const turnosPosibles = grupo.turno && !TURNOS_GRUPO.includes(grupo.turno) ? [...TURNOS_GRUPO, grupo.turno] : TURNOS_GRUPO;

  // Turnos que se pueden elegir un día: sin bloqueo que los toque y sin haber empezado
  const turnosDe = (iso) =>
    turnosPosibles.filter((t) => !bloqueoAfectaTurno(bloqueos?.[iso], t) && !turnoYaEmpezado(iso, t));

  const estadoDia = (iso) => {
    if (turnosDe(iso).length > 0) return { estado: "disponible" };
    const bloqueo = bloqueos?.[iso];
    return bloqueo?.bloqueado ? { estado: "bloqueado", motivo: bloqueo.motivo || "" } : { estado: "sin-taller" };
  };

  // Plazas libres de una franja para este grupo; si el grupo ya ocupa esa franja
  // (confirmado, mismo día y turno que se cruza), sus propias plazas no cuentan
  const libresEn = (t) => {
    if (!reservas || !grupos || !fecha) return null;
    const ocupadas = contarFranja(reservas, grupos, fecha, t);
    const yaCuenta =
      String(grupo.estado || "") === "Confirmada" && fecha === grupo.fecha && turnosCompartenPlazas(t, grupo.turno);
    const ajustadas = yaCuenta
      ? {
          total: Math.max(ocupadas.total - plazas, 0),
          torno: Math.max(ocupadas.torno - (conTorno ? plazas : 0), 0),
        }
      : ocupadas;
    return plazasLibresFranja(ajustadas, config, { conTorno }).reservables;
  };

  const turnosDelDia = fecha ? turnosDe(fecha) : [];
  const bloqueoDelDia = fecha ? bloqueos?.[fecha] : null;
  const libres = turno ? libresEn(turno) : null;
  const faltaSitio = libres !== null && libres < plazas;
  const hayCambio = !!fecha && !!turno && (fecha !== grupo.fecha || turno !== grupo.turno);

  const guardar = () => {
    if (!hayCambio) return;
    if (
      faltaSitio &&
      !window.confirm(
        `En ese turno quedan ${libres} plazas libres y el grupo es de ${plazas} personas. ¿Cambiar la fecha igualmente?`
      )
    ) {
      return;
    }
    onGuardar(fecha, turno);
  };

  if (cargando) return <p className="text-sm text-tinta-suave mt-3">Cargando calendario...</p>;
  if (error) {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
        <button type="button" onClick={onCancelar} className="text-sm underline text-tinta">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-4 md:grid-cols-2 bg-white border border-linea rounded-xl p-3">
      <div>
        <p className="text-xs text-tinta-suave mb-2">
          Elige un día y después el turno. Los días en rojo están cerrados desde el panel.
        </p>
        <CalendarioReserva
          value={fecha}
          onChange={(iso) => {
            setFecha(iso);
            setTurno("");
          }}
          estadoDia={estadoDia}
        />
      </div>

      <div className="space-y-3 text-sm text-tinta">
        <p className="font-semibold first-letter:uppercase">{fecha ? fechaLarga(fecha) : "Elige un día"}</p>

        {fecha && bloqueoDelDia?.bloqueado && turnosDelDia.length > 0 && (
          <p className="text-xs text-tinta-suave">
            Ese día tiene horas bloqueadas{bloqueoDelDia.motivo ? ` (${bloqueoDelDia.motivo})` : ""}: solo salen los turnos
            que siguen abiertos.
          </p>
        )}

        {fecha && (
          <div>
            <p className="font-semibold mb-1">Turno</p>
            <div className="flex flex-wrap gap-2">
              {turnosDelDia.map((t) => {
                const activo = t === turno;
                const libresTurno = libresEn(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTurno(t)}
                    aria-pressed={activo}
                    className={`px-3 py-2 rounded-lg border text-left ${
                      activo
                        ? "bg-terracota border-terracota text-white"
                        : "bg-mostaza-suave border-mostaza text-tinta hover:bg-mostaza/40"
                    }`}
                  >
                    <span className="block font-semibold">{t}</span>
                    {libresTurno !== null && (
                      <span className="block text-xs opacity-80">
                        {libresTurno} {libresTurno === 1 ? "plaza libre" : "plazas libres"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {faltaSitio && (
          <p className="text-red-600" role="alert">
            En ese turno quedan {libres} plazas libres{conTorno ? " (contando los tornos)" : ""} y el grupo es de {plazas}{" "}
            personas.
          </p>
        )}

        {hayCambio && (
          <p>
            {fechaDMA(grupo.fecha) || "—"} · {grupo.turno || "—"} → <strong>{fechaDMA(fecha)} · {turno}</strong>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={guardar}
            disabled={!hayCambio || guardando}
            className="px-4 py-2 rounded-lg bg-terracota text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando..." : "Guardar nueva fecha"}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            disabled={guardando}
            className="px-4 py-2 rounded-lg border border-linea text-tinta"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
