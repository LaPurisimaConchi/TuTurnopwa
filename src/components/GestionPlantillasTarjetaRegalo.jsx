import React, { useCallback, useEffect, useRef, useState } from "react";
import { ref, get, set, update, remove } from "firebase/database";
import { dbRealtime } from "../firebase";
import {
  MAX_PDF_BYTES,
  PLANTILLAS_POR_DEFECTO,
  listarPlantillas,
  nombreArchivoPdf,
  formatearTamano,
} from "../utils/plantillasTarjetaRegalo";

const leerBase64 = (archivo) =>
  new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
    lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
    lector.readAsDataURL(archivo);
  });

// Panel para gestionar los PDF de tarjeta regalo: ver, subir, sustituir, borrar y elegir
// cuáles salen como botón en el correo de compra. Sin ninguno, se usan los originales de /public.
export default function GestionPlantillasTarjetaRegalo() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const inputNuevo = useRef(null);
  const inputSustituir = useRef(null);
  const [sustituyendo, setSustituyendo] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const snap = await get(ref(dbRealtime, "plantillasTarjetaRegalo"));
      setLista(listarPlantillas(snap.val()));
    } catch (error) {
      console.error(error);
      setMensaje({ error: true, texto: "No se pudieron cargar los PDF." });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardarPdf = async (archivo, id, previa) => {
    if (!archivo) return;
    if (archivo.type !== "application/pdf" && !/\.pdf$/i.test(archivo.name)) {
      setMensaje({ error: true, texto: "El archivo debe ser un PDF." });
      return;
    }
    if (archivo.size > MAX_PDF_BYTES) {
      setMensaje({
        error: true,
        texto: `El PDF pesa ${formatearTamano(archivo.size)}; el máximo es ${formatearTamano(MAX_PDF_BYTES)}. Comprímelo antes de subirlo.`,
      });
      return;
    }
    setOcupado(true);
    setMensaje(null);
    try {
      const contenido = await leerBase64(archivo);
      const idFinal = id || `p${Date.now().toString(36)}`;
      const nombre = previa?.nombre || nombreNuevo.trim() || archivo.name.replace(/\.pdf$/i, "");
      // Primero el PDF y después los metadatos: así nunca se lista un PDF que no existe
      await set(ref(dbRealtime, `plantillasTarjetaRegaloPdf/${idFinal}`), contenido);
      await set(ref(dbRealtime, `plantillasTarjetaRegalo/${idFinal}`), {
        nombre,
        archivo: nombreArchivoPdf(nombre),
        tamano: archivo.size,
        orden: previa ? previa.orden : lista.length ? Math.max(...lista.map((p) => p.orden)) + 1 : 0,
        enCorreo: previa ? previa.enCorreo : lista.length === 0,
        actualizadoEn: new Date().toISOString(),
      });
      setNombreNuevo("");
      setMensaje({ error: false, texto: previa ? "PDF sustituido." : "PDF subido." });
      await cargar();
    } catch (error) {
      console.error(error);
      setMensaje({ error: true, texto: "No se pudo guardar el PDF." });
    } finally {
      setOcupado(false);
    }
  };

  const cambiarCorreo = async (plantilla) => {
    setOcupado(true);
    try {
      await update(ref(dbRealtime, `plantillasTarjetaRegalo/${plantilla.id}`), { enCorreo: !plantilla.enCorreo });
      await cargar();
    } catch (error) {
      console.error(error);
      setMensaje({ error: true, texto: "No se pudo cambiar." });
    } finally {
      setOcupado(false);
    }
  };

  const borrar = async (plantilla) => {
    if (!window.confirm(`¿Borrar «${plantilla.nombre}»? Dejará de poder descargarse y de enviarse por correo.`)) return;
    setOcupado(true);
    try {
      await remove(ref(dbRealtime, `plantillasTarjetaRegalo/${plantilla.id}`));
      await remove(ref(dbRealtime, `plantillasTarjetaRegaloPdf/${plantilla.id}`));
      setMensaje({ error: false, texto: "PDF borrado." });
      await cargar();
    } catch (error) {
      console.error(error);
      setMensaje({ error: true, texto: "No se pudo borrar." });
    } finally {
      setOcupado(false);
    }
  };

  const boton = { padding: "8px 14px", borderRadius: 999, border: "1px solid #d1c7b8", background: "#f6efe6", color: "#7a6858", fontWeight: 600, cursor: "pointer" };

  return (
    <section style={{ border: "1px solid #eadfce", borderRadius: 16, padding: 16, margin: "0 0 24px", background: "#fffdf8" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", color: "#3f3128" }}>PDF de tarjeta regalo</h2>
      <p style={{ margin: "0 0 14px", color: "#7a6858", fontSize: "0.92rem", lineHeight: 1.45 }}>
        Los PDF que se ofrecen para imprimir y rellenar a mano al comprar una tarjeta. Los marcados «Botón en el correo»
        aparecen como botón de descarga en el correo de confirmación de la compra. Máximo {formatearTamano(MAX_PDF_BYTES)} por PDF.
      </p>

      {mensaje && (
        <p role="status" style={{ margin: "0 0 12px", color: mensaje.error ? "#b3261e" : "#2e7d32", fontWeight: 600 }}>
          {mensaje.texto}
        </p>
      )}

      {cargando ? (
        <p>Cargando…</p>
      ) : lista.length === 0 ? (
        <p style={{ color: "#7a6858", fontSize: "0.92rem" }}>
          No hay ningún PDF subido: se usan los de siempre ({PLANTILLAS_POR_DEFECTO.map((p) => p.nombre).join(", ")}) y
          el correo enlaza la tarjeta clásica. Al subir el primero, pasan a usarse solo los que gestiones aquí.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "grid", gap: 8 }}>
          {lista.map((p) => (
            <li key={p.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #eadfce", borderRadius: 12, background: "#fff" }}>
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <strong style={{ color: "#3f3128" }}>{p.nombre}</strong>
                <div style={{ fontSize: "0.82rem", color: "#7a6858" }}>{p.archivo} · {formatearTamano(p.tamano)}</div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}>
                <input type="checkbox" checked={p.enCorreo} disabled={ocupado} onChange={() => cambiarCorreo(p)} />
                Botón en el correo
              </label>
              <button type="button" style={boton} disabled={ocupado} onClick={() => { setSustituyendo(p); inputSustituir.current?.click(); }}>
                Sustituir
              </button>
              <button type="button" style={{ ...boton, color: "#b3261e" }} disabled={ocupado} onClick={() => borrar(p)}>
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre (p. ej. Navidad 2026)"
          maxLength={60}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d1c7b8", flex: "1 1 200px" }}
        />
        <button type="button" style={boton} disabled={ocupado} onClick={() => inputNuevo.current?.click()}>
          {ocupado ? "Guardando…" : "Subir PDF nuevo"}
        </button>
      </div>

      <input ref={inputNuevo} type="file" accept="application/pdf,.pdf" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; guardarPdf(f, null, null); }} />
      <input ref={inputSustituir} type="file" accept="application/pdf,.pdf" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (sustituyendo) guardarPdf(f, sustituyendo.id, sustituyendo); }} />
    </section>
  );
}
