// src/components/PanelFechasEspeciales.jsx
// Bloquear o habilitar días desde el calendario del admin. Trabaja sobre el
// rango de días que le pasa el calendario (un día o varios) y guarda en
// bloqueosFechas/{fecha} y fechasHabilitadas/{fecha}, igual que las páginas
// admin-bloqueos-fechas y admin-habilitar-fechas.
import Icono from "./Icono";
import { useEffect, useMemo, useState } from "react";
import { ref, update, remove, get } from "firebase/database";
import { dbRealtime } from "../firebase";
import EditorTurnos from "./EditorTurnos";
import { plazasEnBloqueo } from "../utils/aforo";
import { fechaDMA } from "../utils/formatoFecha";
import { leerTurnos } from "../utils/fichaTaller";
import { rangosBloqueados } from "../utils/rangosHora";
import { preguntar } from "../utils/avisos";

// Todas las fechas AAAA-MM-DD entre inicio y fin, ambas incluidas
export function fechasDelRango(inicio, fin) {
  const fechas = [];
  if (!inicio || !fin) return fechas;
  const actual = new Date(`${inicio}T12:00:00`);
  const final = new Date(`${fin}T12:00:00`);

  while (actual <= final) {
    const mm = String(actual.getMonth() + 1).padStart(2, "0");
    const dd = String(actual.getDate()).padStart(2, "0");
    fechas.push(`${actual.getFullYear()}-${mm}-${dd}`);
    actual.setDate(actual.getDate() + 1);
  }

  return fechas;
}

export default function PanelFechasEspeciales({
  inicio,
  fin,
  bloqueos = {},
  habilitadas = {},
  onCambio,
}) {
  const [modo, setModo] = useState("bloquear");
  const [motivo, setMotivo] = useState("");
  // Horas a bloquear (vacío = el día entero) y turnos que se abren al habilitar
  const [horasBloqueo, setHorasBloqueo] = useState("");
  const [turnosHabilitar, setTurnosHabilitar] = useState("");
  // «Todo el día»: bloquear el día entero / abrir todos los turnos del taller
  const [todoBloqueo, setTodoBloqueo] = useState(true);
  const [todoHabilitar, setTodoHabilitar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const fechas = useMemo(() => fechasDelRango(inicio, fin), [inicio, fin]);
  const bloqueadas = fechas.filter((f) => bloqueos[f]?.bloqueado);
  const conHabilitacion = fechas.filter((f) => habilitadas[f]?.habilitada);

  // Con un solo día ya habilitado, el formulario sale con sus datos para editarlos
  useEffect(() => {
    if (fechas.length === 1) {
      const h = habilitadas[fechas[0]];
      const b = bloqueos[fechas[0]];
      setTurnosHabilitar(h?.habilitada ? (h.turnosHabilitados || []).join(", ") : "");
      setHorasBloqueo(b?.bloqueado ? rangosBloqueados(b).join(", ") : "");
      setTodoHabilitar(!!h?.habilitada && !h.turnosHabilitados?.length);
      setTodoBloqueo(!b?.bloqueado || !rangosBloqueados(b).length);
      setMotivo(h?.habilitada ? h.motivo || "" : b?.bloqueado ? b.motivo || "" : "");
      return;
    }
    setTodoBloqueo(true);
    setTodoHabilitar(false);
    setMotivo("");
    setHorasBloqueo("");
    setTurnosHabilitar("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, fin]);

  if (!fechas.length) return null;

  const textoRango =
    fechas.length === 1
      ? fechaDMA(fechas[0])
      : `${fechaDMA(fechas[0])} al ${fechaDMA(fechas[fechas.length - 1])} (${fechas.length} días)`;

  const ejecutar = async (accion, errorTexto) => {
    try {
      setGuardando(true);
      await accion();
      await onCambio?.();
    } catch (error) {
      console.error(errorTexto, error);
      alert(errorTexto);
    } finally {
      setGuardando(false);
    }
  };

  // Plazas ya reservadas en los días y horas que se van a bloquear
  const plazasAfectadas = async (rangos) => {
    const [reservas, grupos] = await Promise.all([
      get(ref(dbRealtime, "reservas")),
      get(ref(dbRealtime, "reservasGrupos")),
    ]);
    return plazasEnBloqueo(reservas, grupos, fechas, rangos).plazas;
  };

  const bloquear = async () => {
    const rangos = todoBloqueo ? [] : leerTurnos(horasBloqueo);
    if (!todoBloqueo && !rangos.length) {
      alert("Añade al menos un turno o marca «Todo el día».");
      return;
    }

    // Avisa si ya hay gente reservada: bloquear no cancela las reservas existentes
    try {
      const plazas = await plazasAfectadas(rangos);
      if (
        plazas > 0 &&
        !await preguntar(
          `Ya hay ${plazas} plaza${plazas !== 1 ? "s" : ""} reservada${plazas !== 1 ? "s" : ""} en ${
            rangos.length ? "esas horas" : "esos días"
          }. Bloquear no cancela las reservas existentes, solo impide nuevas. ¿Continuar?`
        )
      ) {
        return;
      }
    } catch (error) {
      console.warn("No se pudieron comprobar las reservas existentes:", error);
    }

    return ejecutar(async () => {
      const updates = {};
      fechas.forEach((f) => {
        updates[`bloqueosFechas/${f}`] = {
          bloqueado: true,
          motivo: motivo.trim() || "No especificado",
          ...(rangos.length ? { turnosBloqueados: rangos } : {}),
        };
      });
      await update(ref(dbRealtime), updates);
    }, "No se pudieron guardar las fechas bloqueadas.");
  };

  const habilitar = () => {
    const turnos = todoHabilitar ? [] : leerTurnos(turnosHabilitar);
    if (!todoHabilitar && !turnos.length) {
      alert("Añade al menos un turno o marca «Todo el día».");
      return;
    }

    return ejecutar(async () => {
      const updates = {};
      fechas.forEach((f) => {
        updates[`fechasHabilitadas/${f}`] = {
          habilitada: true,
          motivo: motivo.trim() || "Apertura especial",
          creadaEn: Date.now(),
          ...(turnos.length ? { turnosHabilitados: turnos } : {}),
        };
      });
      await update(ref(dbRealtime), updates);
    }, "No se pudieron guardar las fechas habilitadas.");
  };

  const quitar = async (nodo, lista, texto) => {
    if (!await preguntar(`¿Seguro que quieres ${texto} (${lista.length} día${lista.length !== 1 ? "s" : ""})?`)) {
      return;
    }

    return ejecutar(async () => {
      await Promise.all(lista.map((f) => remove(ref(dbRealtime, `${nodo}/${f}`))));
    }, "No se pudo completar la operación.");
  };

  return (
    <div style={estilos.caja}>
      <h3 style={estilos.titulo}>Bloquear o habilitar · {textoRango}</h3>

      <div style={estilos.pestanas}>
        {[
          ["bloquear", "bloquear", "Bloquear"],
          ["habilitar", "confirmado", "Habilitar"],
        ].map(([clave, icono, texto]) => (
          <button
            key={clave}
            type="button"
            onClick={() => setModo(clave)}
            style={{ ...estilos.pestana, ...(modo === clave ? estilos.pestanaActiva : {}) }}
          >
            <Icono nombre={icono} className="mr-1" />
            {texto}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder={
          modo === "bloquear"
            ? "Motivo (vacaciones, festivo…)"
            : "Motivo (apertura especial, grupo confirmado…)"
        }
        style={estilos.input}
      />

      <div style={estilos.turnos}>
        <p style={estilos.ayuda}>
          {modo === "bloquear"
            ? "Horas a bloquear. Sin ninguna se bloquea el día entero; un turno se bloquea si se cruza con alguna de estas horas."
            : "Turnos que se abren esos días."}
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={modo === "bloquear" ? todoBloqueo : todoHabilitar}
            onChange={(e) =>
              (modo === "bloquear" ? setTodoBloqueo : setTodoHabilitar)(e.target.checked)
            }
          />
          Todo el día{modo === "habilitar" ? " (todos los turnos del taller)" : ""}
        </label>
        {!(modo === "bloquear" ? todoBloqueo : todoHabilitar) && (
        <EditorTurnos
          key={modo}
          id={`panel-${modo}`}
          value={modo === "bloquear" ? horasBloqueo : turnosHabilitar}
          onChange={modo === "bloquear" ? setHorasBloqueo : setTurnosHabilitar}
          textoVacio="Sin turnos"
        />
        )}
      </div>

      <div style={estilos.acciones}>
        <button
          type="button"
          disabled={guardando}
          onClick={modo === "bloquear" ? bloquear : habilitar}
          style={estilos.botonPrincipal}
        >
          {guardando ? "Guardando..." : modo === "bloquear" ? "Bloquear" : "Habilitar"}
        </button>

        {bloqueadas.length > 0 && (
          <button
            type="button"
            disabled={guardando}
            onClick={() => quitar("bloqueosFechas", bloqueadas, "desbloquear")}
            style={estilos.botonSecundario}
          >
            Quitar bloqueo ({bloqueadas.length})
          </button>
        )}

        {conHabilitacion.length > 0 && (
          <button
            type="button"
            disabled={guardando}
            onClick={() => quitar("fechasHabilitadas", conHabilitacion, "quitar la habilitación")}
            style={estilos.botonSecundario}
          >
            Quitar habilitación ({conHabilitacion.length})
          </button>
        )}
      </div>
    </div>
  );
}

const estilos = {
  caja: {
    background: "#fff",
    border: "1px solid #e5e0d2",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  titulo: { margin: "0 0 12px", fontSize: 16, color: "#3f3128" },
  pestanas: { display: "flex", gap: 8, marginBottom: 12 },
  pestana: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e5e0d2",
    background: "#faf7ee",
    cursor: "pointer",
    fontWeight: 600,
  },
  pestanaActiva: { background: "#b36a4a", borderColor: "#b36a4a",
    color: "#ffffff",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d6d0bd",
    marginBottom: 12,
    fontSize: 14,
  },
  turnos: { marginBottom: 12 },
  ayuda: { margin: "0 0 6px", fontSize: 12, color: "#6b5a44" },
  check: { fontSize: 14 },
  acciones: { display: "flex", flexWrap: "wrap", gap: 8 },
  botonPrincipal: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#3f3128",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  botonSecundario: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid #c0392b",
    background: "#fff",
    color: "#c0392b",
    fontWeight: 600,
    cursor: "pointer",
  },
};
