import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, dbRealtime } from "./firebase";
import { ref, get } from "firebase/database";
import { signOut, onAuthStateChanged } from "firebase/auth";
import Footer from "./Footer";
import PantallaConVolver from "./PantallaConVolver";

import { fechaDMA } from "./utils/formatoFecha";
function obtenerFechaReserva(reserva) {
  if (!reserva) return null;

  const fecha = reserva.fecha;
  if (!fecha) return null;

  let horaInicio = "00:00";

  if (reserva.turno && String(reserva.turno).includes("-")) {
    horaInicio = String(reserva.turno).split("-")[0].trim();
  }

  const fechaHora = new Date(`${fecha}T${horaInicio}:00`);
  return isNaN(fechaHora.getTime()) ? null : fechaHora;
}

function esReservaReprogramada(reserva) {
  if (!reserva) return false;

  return (
    reserva.reprogramada === true ||
    reserva.reprogramada === "true" ||
    !!reserva.fechaOriginal ||
    !!reserva.turnoOriginal ||
    !!reserva.reprogramadaEn ||
    !!reserva.avisoPerfil ||
    !!reserva.fechaReprogramada ||
    !!reserva.turnoReprogramado ||
    !!reserva.ultimaFechaAnterior ||
    !!reserva.ultimoTurnoAnterior
  );
}

function esReservaCancelada(reserva) {
  if (!reserva) return false;

  return (
    reserva.cancelada === true ||
    reserva.cancelada === "true" ||
    reserva.estado === "Cancelada"
  );
}

function obtenerEstadoVisibleBono(bono) {
  if (!bono) return "—";

  const restantes = Number(bono.clasesRestantes || 0);
  const estadoGuardado = String(bono.estadoBono || "").toLowerCase();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaCaducidad = null;
  if (bono.fechaCaducidadBono) {
    fechaCaducidad = new Date(`${bono.fechaCaducidadBono}T00:00:00`);
  }

  const estaCaducado =
    fechaCaducidad instanceof Date &&
    !isNaN(fechaCaducidad.getTime()) &&
    hoy > fechaCaducidad;

  if (estadoGuardado === "caducado" || estaCaducado) {
    return "Caducado";
  }

  if (estadoGuardado === "agotado" || restantes <= 0) {
    return "Agotado";
  }

  return "Activo";
}

function AvisoReprogramacion({ reserva }) {
  const reprogramada = esReservaReprogramada(reserva);

  if (!reprogramada) return null;

  const fechaAnterior =
    reserva.fechaOriginal || reserva.ultimaFechaAnterior || "—";
  const turnoAnterior =
    reserva.turnoOriginal || reserva.ultimoTurnoAnterior || "";

  return (
    <div className="mt-3 rounded-xl border border-[#ecd8a6] bg-[#fffaf0] px-3 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-[#f6e7b8] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#7a5a1f]">
          Reprogramada
        </span>

        {reserva.reprogramadaEn && (
          <span className="text-[11px] text-[#9a8351]">
            {reserva.reprogramadaEn}
          </span>
        )}
      </div>

      <p className="text-sm text-[#6f5727] leading-relaxed">
        <span className="font-semibold">Antes:</span> {fechaDMA(fechaAnterior)}
        {turnoAnterior ? ` · ${turnoAnterior}` : ""}
      </p>

      <p className="text-sm text-[#6f5727] leading-relaxed mt-1">
        <span className="font-semibold">Ahora:</span> {fechaDMA(reserva.fecha) || "—"}
        {reserva.turno ? ` · ${reserva.turno}` : ""}
      </p>
    </div>
  );
}

function AvisoCancelacion({ reserva }) {
  if (!esReservaCancelada(reserva)) return null;

  return (
    <div className="mt-3 rounded-xl border border-[#e5bcbc] bg-[#fff5f5] px-3 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-[#f7d7d7] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a3b3b]">
          Cancelada
        </span>

        {reserva.canceladaEn && (
          <span className="text-[11px] text-[#a56b6b]">
            {reserva.canceladaEn}
          </span>
        )}
      </div>

      <p className="text-sm text-[#7a4747] leading-relaxed">
        {reserva.avisoPerfil ||
          "Esta reserva ha sido cancelada. Si lo necesitas, contacta con el taller."}
      </p>

      {reserva.motivoCancelacion && (
        <p className="text-sm text-[#7a4747] leading-relaxed mt-1">
          <span className="font-semibold">Motivo:</span>{" "}
          {reserva.motivoCancelacion}
        </p>
      )}
    </div>
  );
}

function TarjetaReserva({ reserva }) {
  return (
    <div className="space-y-1 text-sm">
      <p>
        <strong>Clase:</strong> {reserva.clase}
      </p>
      <p>
        <strong>Fecha:</strong> {fechaDMA(reserva.fecha)}
      </p>
      <p>
        <strong>Turno:</strong> {reserva.turno}
      </p>
      {reserva.ubicacion && (
        <p>
          <strong>Ubicación:</strong> {reserva.ubicacion}
        </p>
      )}

      <AvisoReprogramacion reserva={reserva} />
      <AvisoCancelacion reserva={reserva} />
    </div>
  );
}

export default function PerfilUsuario() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [reservaActiva, setReservaActiva] = useState(null);
  const [reservasActivas, setReservasActivas] = useState([]);
  const [reservasPasadas, setReservasPasadas] = useState([]);
  const [tarjetasRegalo, setTarjetasRegalo] = useState([]);
  const [bonos, setBonos] = useState([]);
  const [esInvitado, setEsInvitado] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setEmail(user.email);
        setEsInvitado(user.isAnonymous);

        const userRef = ref(dbRealtime, "usuarios/" + user.uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const datosUsuario = snapshot.val();
          setNombre(datosUsuario.nombre || "");
          setTelefono(datosUsuario.telefono || "");
          // Los invitados no tienen email en Auth, solo el que dejaron al reservar
          if (!user.email) setEmail(datosUsuario.email || "");
        }

        const refListaReservas = ref(
          dbRealtime,
          `usuarios/${user.uid}/listaReservas`
        );
        const snapListaReservas = await get(refListaReservas);

        if (snapListaReservas.exists()) {
          const todas = Object.values(snapListaReservas.val()).filter(Boolean);
          const ahora = new Date();

          const futuras = [];
          const pasadas = [];

          todas.forEach((reserva) => {
            const fechaReserva = obtenerFechaReserva(reserva);
            const cancelada = esReservaCancelada(reserva);

            if (cancelada) {
              pasadas.push(reserva);
              return;
            }

            if (fechaReserva && fechaReserva >= ahora) {
              futuras.push(reserva);
            } else {
              pasadas.push(reserva);
            }
          });

          futuras.sort((a, b) => {
            const fechaA = obtenerFechaReserva(a)?.getTime() || 0;
            const fechaB = obtenerFechaReserva(b)?.getTime() || 0;
            return fechaA - fechaB;
          });

          pasadas.sort((a, b) => {
            const fechaA = obtenerFechaReserva(a)?.getTime() || 0;
            const fechaB = obtenerFechaReserva(b)?.getTime() || 0;
            return fechaB - fechaA;
          });

          if (futuras.length > 0) {
            setReservaActiva(futuras[0]);
            setReservasActivas(futuras.slice(1));
          } else {
            setReservaActiva(null);
            setReservasActivas([]);
          }

          setReservasPasadas(pasadas);
        } else {
          setReservaActiva(null);
          setReservasActivas([]);
          setReservasPasadas([]);
        }
        const refTarjetasRegalo = ref(
          dbRealtime,
          `usuarios/${user.uid}/tarjetasRegalo`
        );
        const snapTarjetasRegalo = await get(refTarjetasRegalo);

        if (snapTarjetasRegalo.exists()) {
          const tarjetas = Object.values(snapTarjetasRegalo.val()).sort(
            (a, b) => {
              const fechaA = new Date(a.actualizadoEn || a.fechaCompra || 0);
              const fechaB = new Date(b.actualizadoEn || b.fechaCompra || 0);
              return fechaB - fechaA;
            }
          );

          setTarjetasRegalo(tarjetas);
        } else {
          setTarjetasRegalo([]);
        }

        const refBonos = ref(dbRealtime, `usuarios/${user.uid}/bonos`);
        const snapBonos = await get(refBonos);

        if (snapBonos.exists()) {
          const listaBonos = Object.values(snapBonos.val())
            .filter(Boolean)
            .sort((a, b) => {
              const fechaA = new Date(a.actualizadoEn || a.creadoEn || 0);
              const fechaB = new Date(b.actualizadoEn || b.creadoEn || 0);
              return fechaB - fechaA;
            });

          setBonos(listaBonos);
        } else {
          setBonos([]);
        }
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = () => {
    if (
      esInvitado &&
      !window.confirm(
        "Estás como invitado. Si cierras la sesión no podrás volver a ver estas reservas desde la app (el taller las conserva). ¿Cerrar sesión igualmente?"
      )
    ) {
      return;
    }
    signOut(auth).then(() => navigate("/"));
  };

  return (
    <PantallaConVolver volverA="/dondereservar">
      <div className="max-w-md w-full mx-auto bg-[#fcfaf6] rounded-[30px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#eee6da] p-5 text-[#3b3025]">
        <div className="text-center mb-6">
          <h1 className="text-[2rem] font-serif font-bold text-[#6f3d22] mb-2">
            Tu perfil
          </h1>
          <p className="text-sm text-[#7b6d62]">
           Consulta y gestiona tus reservas y datos de tu cuenta
          </p>
        </div>

        {esInvitado && (
          <div className="bg-[#fff8df] border border-[#f1e7c6] rounded-2xl px-4 py-4 mb-5 text-sm text-[#6b4f3f]">
            <p className="font-semibold mb-1">Estás usando la app como invitado</p>
            <p className="leading-relaxed mb-3">
              Crea una contraseña para guardar tus reservas y compras y poder
              verlas desde cualquier dispositivo.
            </p>
            <button
              onClick={() => navigate("/registro")}
              className="w-full bg-[#b36a4a] hover:bg-[#9e5c3f] text-white font-semibold py-2.5 rounded-xl transition"
            >
              Crear mi cuenta
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#efe7db] px-4 py-4 shadow-sm mb-5">
  <p className="text-sm mb-2">
    <span className="font-semibold">Nombre:</span> {nombre || "—"}
  </p>
  <p className="text-sm mb-2">
    <span className="font-semibold">Email:</span> {email || "—"}
  </p>
  <p className="text-sm mb-3">
    <span className="font-semibold">Teléfono:</span> {telefono || "—"}
  </p>

  <button
    onClick={() => navigate("/editar-perfil")}
    className="w-full bg-[#f5f1ea] hover:bg-[#ebe4da] text-[#5f5247] font-semibold py-3 rounded-2xl transition"
  >
    Editar perfil
  </button>
</div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            className="bg-[#f2c500] hover:bg-[#e4b800] text-[#3b3025] font-bold py-3 rounded-2xl text-sm shadow-md transition"
            onClick={() => navigate("/dondereservar")}
          >
            Reservar
          </button>

          <button
            className="bg-white border border-[#e6a6cf] text-[#b84c85] font-bold py-3 rounded-2xl text-sm shadow-sm transition hover:bg-[#fdf2f8]"
            onClick={() => navigate("/canjear-tarjeta")}
          >
            Canjear tarjeta regalo
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#efe7db] px-4 py-4 shadow-sm mb-5">
          <h2 className="text-base font-semibold mb-3">Tu reserva</h2>

          {reservaActiva ? (
            <TarjetaReserva reserva={reservaActiva} />
          ) : (
            <p className="text-sm text-[#7b6d62]">
              No tienes reservas activas.
            </p>
          )}
        </div>

        <details className="mb-5 bg-white border border-[#efe7db] rounded-2xl p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">
            Próximas reservas
          </summary>

          <div className="mt-3">
            {reservasActivas.length > 0 ? (
              <ul className="text-sm space-y-2">
                {reservasActivas.map((r, i) => (
                  <li
                    key={i}
                    className="bg-[#faf8f4] p-3 rounded-xl border border-[#ece4d8]"
                  >
                    <p>
                      <strong>{fechaDMA(r.fecha)}</strong> — {r.clase} ({r.turno})
                      {r.ubicacion ? ` en ${r.ubicacion}` : ""}
                    </p>

                    <AvisoReprogramacion reserva={r} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#7b6d62]">
                No tienes más reservas futuras.
              </p>
            )}
          </div>
        </details>

        <details className="mb-5 bg-white border border-[#efe7db] rounded-2xl p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">
            Historial de reservas
          </summary>

          <div className="mt-3">
            {reservasPasadas.length > 0 ? (
              <ul className="text-sm space-y-2">
                {reservasPasadas.map((r, i) => (
                  <li
                    key={i}
                    className="bg-[#faf8f4] p-3 rounded-xl border border-[#ece4d8]"
                  >
                    <p>
                      <strong>{fechaDMA(r.fecha)}</strong> — {r.clase} ({r.turno})
                      {r.ubicacion ? ` en ${r.ubicacion}` : ""}
                    </p>

                    <AvisoCancelacion reserva={r} />
                    {!esReservaCancelada(r) && (
                      <AvisoReprogramacion reserva={r} />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#7b6d62]">
                Aún no tienes reservas anteriores.
              </p>
            )}
          </div>
        </details>

        <details className="mb-5 bg-white border border-[#efe7db] rounded-2xl p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">
            🎟️ Mis bonos
          </summary>

          <div className="mt-3">
            {bonos.length > 0 ? (
              <ul className="text-sm space-y-2">
                {bonos.map((bono, i) => {
                  const estadoVisible = obtenerEstadoVisibleBono(bono);

                  return (
                    <li
                      key={bono.bonoId || i}
                      className="bg-[#faf8f4] p-3 rounded-xl border border-[#ece4d8]"
                    >
                      <p>
                        <strong>Bono:</strong> {bono.clase || "Bono"}
                      </p>
                      <p>
                        <strong>Clases incluidas:</strong>{" "}
                        {Number(bono.numeroClases || 0)}
                      </p>
                      <p>
                        <strong>Consumidas:</strong>{" "}
                        {Number(bono.clasesConsumidas || 0)}
                      </p>
                      <p>
                        <strong>Restantes:</strong>{" "}
                        {Number(bono.clasesRestantes || 0)}
                      </p>
                      <p>
                        <strong>Fecha de inicio:</strong>{" "}
                        {fechaDMA(bono.fechaInicio) || "—"}
                      </p>
                      <p>
                        <strong>Caduca el:</strong>{" "}
                        {fechaDMA(bono.fechaCaducidadBono) || "—"}
                      </p>
                      <p>
                        <strong>Estado:</strong> {estadoVisible}
                      </p>
                      
                      {estadoVisible === "Activo" && (
 <button
  onClick={() => navigate(`/usar-bono/${bono.bonoId}`)}
  className="mt-3 w-full px-4 py-2 bg-[#f2c500] hover:bg-[#e4b800] text-[#3b3025] font-semibold rounded-xl transition"
>
  Reservar sesión con este bono
</button>
)}
                      
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-[#7b6d62]">
                Aún no tienes bonos comprados.
              </p>
            )}
          </div>
        </details>

        <details className="mb-5 bg-white border border-[#efe7db] rounded-2xl p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">
            🎁 Mis tarjetas regalo
          </summary>

          <div className="mt-3">
            {tarjetasRegalo.length > 0 ? (
              <ul className="text-sm space-y-2">
                {tarjetasRegalo.map((tarjeta, i) => (
                  <li
                    key={i}
                    className="bg-[#faf8f4] p-3 rounded-xl border border-[#ece4d8]"
                  >
                    <p>
                      <strong>Producto:</strong>{" "}
                      {tarjeta.clase || "Tarjeta regalo"}
                    </p>
                    <p>
                      <strong>Precio:</strong> {tarjeta.precioTotal} €
                    </p>
                    <p>
                      <strong>Código:</strong> {tarjeta.codigo || "—"}
                    </p>
                    <p>
                      <strong>Estado:</strong>{" "}
                      {tarjeta.estadoCanje === "usada"
                        ? "Usada"
                        : tarjeta.estadoCanje === "canjeado"
                        ? "Usada"
                        : "Disponible"}
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
  <a
    href="/tarjetas-regalo/postal regalo.pdf"
    download
    className="w-full text-center bg-[#f5f1ea] hover:bg-[#ebe4da] text-[#5f5247] font-semibold py-2 px-4 rounded-xl transition border border-[#e7dccb]"
  >
    Descargar tarjeta clásica
  </a>

  <a
    href="/tarjetas-regalo/regalo papa noel.pdf"
    download
    className="w-full text-center bg-[#f5f1ea] hover:bg-[#ebe4da] text-[#5f5247] font-semibold py-2 px-4 rounded-xl transition border border-[#e7dccb]"
  >
    Descargar tarjeta Navidad 1
  </a>

  <a
    href="/tarjetas-regalo/regalo reyes.pdf"
    download
    className="w-full text-center bg-[#f5f1ea] hover:bg-[#ebe4da] text-[#5f5247] font-semibold py-2 px-4 rounded-xl transition border border-[#e7dccb]"
  >
    Descargar tarjeta Navidad 2
  </a>
</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#7b6d62]">
                Aún no has comprado ninguna tarjeta regalo.
              </p>
            )}
          </div>
        </details>

        <details className="mb-5 bg-[#fbf4d8] border border-[#ead66d] rounded-2xl p-4 shadow-sm">
  <summary className="cursor-pointer font-semibold">
    🏺 Quiero recoger mi pieza
  </summary>

  <div className="mt-3 text-sm text-[#3b3025] space-y-3">
    <p>
      Tus piezas necesitan secado y cocción. Cuando estén listas, podrás consultarlas aquí.
    </p>

    <div>
      <p className="font-semibold mb-1">Pasos a seguir:</p>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Elige el esmalte y sube la foto de tu pieza.</li>
        <li>Revisa si tu pieza está lista para recoger.</li>
        <li>Cuando esté lista, escríbenos por WhatsApp para venir a recogerla.</li>
      </ol>
    </div>

    <div className="flex flex-col gap-2">
      <a
        href="https://drive.google.com/drive/folders/1Im70RbYcyCFs5pPLgq2ooHhowwtA8F0R"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-[#f2c500] hover:bg-[#e4b800] text-[#3b3025] font-semibold py-3 px-4 rounded-2xl text-center transition shadow-sm"
      >
        Elegir esmalte y subir foto
      </a>

      <a
        href="https://drive.google.com/drive/folders/1J0f79NLH--SZ9DGIaFO2n5hSNdjU7rUn"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-[#f5f1ea] hover:bg-[#ebe4da] text-[#5f5247] font-semibold py-3 px-4 rounded-2xl text-center transition border border-[#e7dccb]"
      >
        Ver si mi pieza está lista
      </a>
    </div>

    <p>
      <span className="font-semibold">WhatsApp:</span>{" "}
      <a
        href="https://wa.me/34611804664"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#b58900] font-bold"
      >
        611 804 664
      </a>
    </p>

    <div>
      <p className="font-semibold mb-1">Importante:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Si viniste en grupo, las piezas pueden estar listas en momentos diferentes.</li>
        <li>Tienes 1 mes para recogerla sin coste desde que se publique.</li>
        <li>Si necesitas organizar un envío o tienes dudas, escríbenos por WhatsApp.</li>
      </ul>
    </div>
  </div>
</details>

        <details className="mb-6 bg-white border border-[#efe7db] rounded-2xl p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold">
            📍 Contacto
          </summary>

          <ul className="mt-3 text-sm space-y-2">
            <li>📞 644 671 664</li>
            <li>📧 lapurisimaconchioficial@gmail.com</li>
            <li>🏠 Calle Israel Nº5, Córdoba</li>
          </ul>

          <div className="mt-4">
            <button
              onClick={() =>
                window.open(
                  "https://maps.google.com/?q=Calle+Israel+5+Córdoba",
                  "_blank"
                )
              }
              className="w-full px-4 py-2 bg-[#f5f1ea] hover:bg-[#ebe4da] rounded-xl text-sm font-medium transition"
            >
              📍 Cómo llegar
            </button>
          </div>
        </details>

        <button
          onClick={handleLogout}
          className="w-full mb-5 bg-[#7a4326] text-white py-3 rounded-2xl font-semibold shadow-md"
        >
          Cerrar sesión
        </button>

        <div className="text-center text-xs space-y-1 text-[#a08f80]">
          <button onClick={() => navigate("/politica-privacidad")}>
            Política de Privacidad
          </button>
          <br />
          <button onClick={() => navigate("/condiciones-pago")}>
            Condiciones de Pago
          </button>
        </div>
      </div>

      <Footer />
    </PantallaConVolver>
  );
}