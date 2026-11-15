// src/components/SesionExtraReserva.jsx
// Sesión 2, 3… de un taller de varias sesiones que se reservan de una vez: el día (con un
// mínimo de días desde la sesión anterior) y el turno, comprobando que haya plazas. Avisa
// a quien lo usa de si la sesión está lista (`onListo`) con el aforo real de su franja.
import { useEffect, useMemo, useState } from "react";
import SelectorDiaReserva from "./SelectorDiaReserva";
import SelectorTurnoReserva from "./SelectorTurnoReserva";
import { cargarFranja } from "../utils/disponibilidad";
import { plazasLibresFranja } from "../utils/aforo";
import { estadoDiaTaller, useDiaDeReserva } from "../utils/turnosTaller";
import { fechaDMA } from "../utils/formatoFecha";
import { useConfigEspacio } from "../configuracionEspacio";

export default function SesionExtraReserva({
  numero, // 2, 3…
  clase,
  desde, // primer día posible
  fecha,
  turno,
  onCambiar, // ({ fecha, turno })
  contexto, // { fechasBloqueadas, fechasHabilitadas, reservasGrupos }
  ocupacion = {},
  conTorno = false,
  plazas = 1,
  cargando = false,
  onListo,
}) {
  const { config } = useConfigEspacio();
  const { fechasBloqueadas, fechasHabilitadas, reservasGrupos } = contexto;
  const [franja, setFranja] = useState(null);
  const [errorPlazas, setErrorPlazas] = useState(false);

  const { turnosDisponibles, fechaBloqueada, fechaHabilitadaManual, diaNoDisponible } = useDiaDeReserva({
    clase,
    fecha,
    fechasBloqueadas,
    fechasHabilitadas,
    reservasGrupos,
    conGrupo: false,
    ocupacion,
  });

  const estadoDia = (iso) =>
    estadoDiaTaller({ clase, fecha: iso, fechasBloqueadas, fechasHabilitadas, reservasGrupos, conGrupo: false, ocupacion });

  useEffect(() => {
    if (!fecha || !turno) {
      setFranja(null);
      setErrorPlazas(false);
      return undefined;
    }

    let cancelado = false;
    setFranja(null);
    cargarFranja(fecha, turno)
      .then((datos) => {
        if (cancelado) return;
        setFranja(datos);
        setErrorPlazas(false);
      })
      .catch((error) => {
        console.error("Error al contar plazas de la sesión:", error);
        if (!cancelado) setErrorPlazas(true);
      });

    return () => {
      cancelado = true;
    };
  }, [fecha, turno]);

  const libres = useMemo(() => {
    if (!franja) return null;
    const limites = {
      aforoTotal: franja.aforoTotal ?? config.aforoTotal,
      maxTorno: franja.maxTorno ?? config.maxTorno,
    };
    return plazasLibresFranja(franja, limites, { conTorno }).reservables;
  }, [franja, config, conTorno]);

  const hayPlazas = libres !== null && libres >= plazas;
  const lista =
    !!fecha && !!turno && !fechaBloqueada && !diaNoDisponible && !errorPlazas && hayPlazas;

  useEffect(() => {
    onListo?.(numero, lista);
  }, [numero, lista, onListo]);

  // Al quitarse la sesión (porque cambia la anterior) deja de contar como lista
  useEffect(() => () => onListo?.(numero, false), [numero, onListo]);

  return (
    <div className="rounded-xl border border-[#f1e7c6] bg-[#fffdf5] p-3 space-y-3">
      <SelectorDiaReserva
        etiqueta={`Sesión ${numero}: elige el día (a partir del ${fechaDMA(desde)})`}
        value={fecha}
        onChange={(iso) => onCambiar({ fecha: iso, turno: "" })}
        estadoDia={estadoDia}
        cargando={cargando}
        fechaBloqueada={fechaBloqueada}
        fechaHabilitadaManual={fechaHabilitadaManual}
        diaNoDisponible={diaNoDisponible}
        clase={clase}
        producto="Este taller"
        desde={desde}
      />

      {!!fecha && !fechaBloqueada && !diaNoDisponible && (
        <SelectorTurnoReserva
          id={`turno-sesion-${numero}`}
          etiqueta={`Turno de la sesión ${numero}:`}
          value={turno}
          onChange={(valor) => onCambiar({ fecha, turno: valor })}
          turnos={turnosDisponibles}
        />
      )}

      {errorPlazas && (
        <p className="text-sm text-red-600">No se han podido comprobar las plazas. Recarga la página.</p>
      )}
      {!!turno && libres !== null && !hayPlazas && (
        <p className="text-sm text-red-600 font-medium">
          {libres === 0 ? "Ese turno está completo." : `Solo quedan ${libres} plazas en ese turno.`} Elige otro día o turno.
        </p>
      )}
    </div>
  );
}
