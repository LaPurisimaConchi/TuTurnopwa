// src/components/PanelFechasEspeciales.jsx
// Bloquear o habilitar días desde el calendario del admin. Trabaja sobre el
// rango de días que le pasa el calendario (un día o varios) y guarda en
// bloqueosFechas/{fecha} y fechasHabilitadas/{fecha}, igual que las páginas
// admin-bloqueos-fechas y admin-habilitar-fechas.
import { useEffect, useMemo, useState } from "react";
import { ref, update, remove } from "firebase/database";
import { dbRealtime } from "../firebase";
import { fechaDMA } from "../utils/formatoFecha";

const TURNO_MANANA = "11:30-14:30";
const TURNO_TARDE = "17:30-20:30";

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
  const [manana, setManana] = useState(false);
  const [tarde, setTarde] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const fechas = useMemo(() => fechasDelRango(inicio, fin), [inicio, fin]);
  const bloqueadas = fechas.filter((f) => bloqueos[f]?.bloqueado);
  const conHabilitacion = fechas.filter((f) => habilitadas[f]?.habilitada);

  // Con un solo día ya habilitado, el formulario sale con sus datos para editarlos
  useEffect(() => {
    if (fechas.length === 1) {
      const h = habilitadas[fechas[0]];
      const b = bloqueos[fechas[0]];
      if (h?.habilitada) {
        setMotivo(h.motivo || "");
        setManana((h.turnosHabilitados || []).includes(TURNO_MANANA));
        setTarde((h.turnosHabilitados || []).includes(TURNO_TARDE));
        return;
      }
      setMotivo(b?.bloqueado ? b.motivo || "" : "");
    } else {
      setMotivo("");
    }
    setManana(false);
    setTarde(false);
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

  const bloquear = () =>
    ejecutar(async () => {
      const updates = {};
      fechas.forEach((f) => {
        updates[`bloqueosFechas/${f}`] = {
          bloqueado: true,
          motivo: motivo.trim() || "No especificado",
        };
      });
      await update(ref(dbRealtime), updates);
    }, "No se pudieron guardar las fechas bloqueadas.");

  const habilitar = () => {
    if (!manana && !tarde) {
      alert("Selecciona al menos un turno: mañana o tarde.");
      return;
    }

    return ejecutar(async () => {
      const updates = {};
      fechas.forEach((f) => {
        updates[`fechasHabilitadas/${f}`] = {
          habilitada: true,
          motivo: motivo.trim() || "Apertura especial",
          creadaEn: Date.now(),
          turnosHabilitados: [...(manana ? [TURNO_MANANA] : []), ...(tarde ? [TURNO_TARDE] : [])],
        };
      });
      await update(ref(dbRealtime), updates);
    }, "No se pudieron guardar las fechas habilitadas.");
  };

  const quitar = (nodo, lista, texto) => {
    if (!window.confirm(`¿Seguro que quieres ${texto} (${lista.length} día${lista.length !== 1 ? "s" : ""})?`)) {
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
          ["bloquear", "🚫 Bloquear"],
          ["habilitar", "✅ Habilitar"],
        ].map(([clave, texto]) => (
          <button
            key={clave}
            type="button"
            onClick={() => setModo(clave)}
            style={{ ...estilos.pestana, ...(modo === clave ? estilos.pestanaActiva : {}) }}
          >
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

      {modo === "habilitar" && (
        <div style={estilos.turnos}>
          <label style={estilos.check}>
            <input type="checkbox" checked={manana} onChange={(e) => setManana(e.target.checked)} />{" "}
            Mañana ({TURNO_MANANA})
          </label>
          <label style={estilos.check}>
            <input type="checkbox" checked={tarde} onChange={(e) => setTarde(e.target.checked)} />{" "}
            Tarde ({TURNO_TARDE})
          </label>
        </div>
      )}

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
  titulo: { margin: "0 0 12px", fontSize: 16, color: "#5c3c00" },
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
  pestanaActiva: { background: "#F4C542", borderColor: "#E5B92F" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d6d0bd",
    marginBottom: 12,
    fontSize: 14,
  },
  turnos: { display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 },
  check: { fontSize: 14 },
  acciones: { display: "flex", flexWrap: "wrap", gap: 8 },
  botonPrincipal: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#5c3c00",
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
