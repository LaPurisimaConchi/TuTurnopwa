import React, { useEffect, useMemo, useRef, useState } from "react";
import Icono from "./components/Icono";
import BotonVolver from "./BotonVolver";
import { faqData } from "./faqData";

const MENSAJE_BIENVENIDA =
  "Soy Junquillo, el asistente de ayuda de La Purísima Conchi. Si tienes alguna duda sobre reservas, pagos, piezas, bonos, tarjetas regalo o cómo funciona el taller, escríbeme y te echo una mano.";

const MENSAJE_NO_ENCONTRADO =
  "No he encontrado una respuesta exacta para esa duda. Para no darte información incorrecta, lo mejor es contactar directamente con el taller por WhatsApp en el 644 67 16 64.";

const WHATSAPP_LINK = "https://wa.me/34644671664";

const sugerenciasRapidas = [
  "Quiero cambiar mi reserva",
  "¿Cómo funciona una tarjeta regalo?",
  "¿Dónde veo si mi pieza está lista?",
  "¿Qué horarios hay para grupos?",
  "¿Cómo reservo una clase?",
  "¿Cómo contacto con el taller?",
];

const normalizarTexto = (texto = "") =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:/()"%+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const reemplazarSinonimos = (texto = "") => {
  let t = ` ${normalizarTexto(texto)} `;

  const reemplazos = [
    [/ wasap /g, " whatsapp "],
    [/ wuasap /g, " whatsapp "],
    [/ wsp /g, " whatsapp "],
    [/ bizum /g, " pago "],
    [/ pagar /g, " pago "],
    [/ pague /g, " pago "],
    [/ pagado /g, " pago "],
    [/ pagarlo /g, " pago "],
    [/ clase /g, " reserva "],
    [/ sesion /g, " reserva "],
    [/ cita /g, " reserva "],
    [/ mover /g, " cambiar "],
    [/ modificar /g, " cambiar "],
    [/ reprogramar /g, " cambiar "],
    [/ anular /g, " cancelar "],
    [/ regalo /g, " tarjeta regalo "],
    [/ bono regalo /g, " tarjeta regalo "],
    [/ codigo /g, " tarjeta regalo "],
    [/ pieza lista /g, " recoger pieza "],
    [/ horno /g, " pieza "],
    [/ grupo /g, " grupos "],
    [/ cumple /g, " grupos "],
    [/ cumpleanos /g, " grupos "],
  ];

  reemplazos.forEach(([regex, replacement]) => {
    t = t.replace(regex, replacement);
  });

  return t.trim();
};

const dividirEnPalabras = (texto = "") => {
  const limpio = reemplazarSinonimos(texto);
  if (!limpio) return [];
  return limpio.split(" ").filter(Boolean);
};

const quitarPalabrasVacias = (palabras = []) => {
  const stopWords = new Set([
    "de",
    "la",
    "el",
    "los",
    "las",
    "un",
    "una",
    "unos",
    "unas",
    "y",
    "o",
    "que",
    "como",
    "con",
    "sin",
    "para",
    "por",
    "del",
    "al",
    "se",
    "es",
    "hay",
    "qué",
    "que",
    "cual",
    "cuál",
    "cuanto",
    "cuánto",
    "cuando",
    "cuándo",
    "puedo",
    "quiero",
    "tengo",
    "mi",
    "me",
    "a",
    "en",
    "hola",
    "buenas",
    "buenos",
    "dias",
    "días",
    "tardes",
    "noches",
    "necesito",
    "saber",
    "duda",
    "sobre",
    "porque",
    "entonces",
    "hoy",
    "mañana",
    "manana",
    "favor",
    "gracias",
    "ayuda",
    "podria",
    "podría",
    "teneis",
    "tenéis",
    "hace",
    "hacer",
    "he",
    "ya",
    "esta",
    "está",
    "seria",
    "sería",
  ]);

  return palabras.filter((p) => p.length >= 3 && !stopWords.has(p));
};

const tieneFraseExacta = (consulta, texto) => {
  if (!consulta || !texto) return false;
  return reemplazarSinonimos(texto).includes(reemplazarSinonimos(consulta));
};

const contarCoincidenciasPalabras = (palabrasConsulta, textoObjetivo) => {
  if (!palabrasConsulta.length || !textoObjetivo) return 0;

  const palabrasObjetivo = new Set(
    quitarPalabrasVacias(dividirEnPalabras(textoObjetivo))
  );

  let total = 0;
  palabrasConsulta.forEach((palabra) => {
    if (palabrasObjetivo.has(palabra)) total += 1;
  });

  return total;
};

const esConsultaDelicada = (texto = "") => {
  const t = reemplazarSinonimos(texto);

  const patrones = [
    "cambiar reserva",
    "cancelar reserva",
    "no puedo asistir",
    "no puedo ir",
    "pago",
    "cobro",
    "problema pago",
    "tarjeta regalo",
    "grupos",
    "recoger pieza",
    "pieza",
    "llego tarde",
    "menores",
  ];

  return patrones.some((patron) => t.includes(patron));
};

const calcularCoincidencia = (consulta, item) => {
  const consultaNormalizada = reemplazarSinonimos(consulta);
  if (!consultaNormalizada) return 0;

  const pregunta = item.pregunta || "";
  const respuesta = item.respuesta || "";
  const categoria = item.categoria || "";
  const variantes = item.variantes || [];
  const keywords = item.keywords || [];

  const palabrasConsulta = quitarPalabrasVacias(
    dividirEnPalabras(consultaNormalizada)
  );

  let puntuacion = 0;

  if (tieneFraseExacta(consultaNormalizada, pregunta)) puntuacion += 45;
  if (tieneFraseExacta(consultaNormalizada, categoria)) puntuacion += 20;

  variantes.forEach((variante) => {
    if (tieneFraseExacta(consultaNormalizada, variante)) {
      puntuacion += 38;
    }

    const varianteNorm = reemplazarSinonimos(variante);
    if (
      consultaNormalizada.includes(varianteNorm) &&
      varianteNorm.length > 5
    ) {
      puntuacion += 22;
    }
  });

  keywords.forEach((kw) => {
    const kwNorm = reemplazarSinonimos(kw);
    if (!kwNorm) return;

    if (consultaNormalizada.includes(kwNorm)) puntuacion += 18;
    if (kwNorm.includes(consultaNormalizada) && consultaNormalizada.length > 4) {
      puntuacion += 10;
    }
  });

  const coincidenciasPregunta = contarCoincidenciasPalabras(
    palabrasConsulta,
    pregunta
  );
  const coincidenciasRespuesta = contarCoincidenciasPalabras(
    palabrasConsulta,
    respuesta
  );
  const coincidenciasCategoria = contarCoincidenciasPalabras(
    palabrasConsulta,
    categoria
  );

  puntuacion += coincidenciasPregunta * 10;
  puntuacion += coincidenciasRespuesta * 3;
  puntuacion += coincidenciasCategoria * 6;

  variantes.forEach((variante) => {
    puntuacion += contarCoincidenciasPalabras(palabrasConsulta, variante) * 7;
  });

  keywords.forEach((kw) => {
    puntuacion += contarCoincidenciasPalabras(palabrasConsulta, kw) * 12;
  });

  if (palabrasConsulta.length >= 2) {
    let coincidenciasFuertes = 0;

    palabrasConsulta.forEach((palabra) => {
      const estaEnPregunta = reemplazarSinonimos(pregunta).includes(palabra);
      const estaEnVariantes = variantes.some((v) =>
        reemplazarSinonimos(v).includes(palabra)
      );
      const estaEnKeywords = keywords.some((k) =>
        reemplazarSinonimos(k).includes(palabra)
      );

      if (estaEnPregunta || estaEnVariantes || estaEnKeywords) {
        coincidenciasFuertes += 1;
      }
    });

    if (coincidenciasFuertes >= 2) puntuacion += 18;
    if (coincidenciasFuertes >= 3) puntuacion += 18;
  }

  return puntuacion;
};

const buscarRespuestaPrioritaria = (consulta) => {
  const texto = reemplazarSinonimos(consulta);

  const prioridades = [
    {
      id: "cambiar_fecha",
      patrones: [
        "cambiar reserva",
        "cambiar fecha",
        "cambiar dia",
        "quiero cambiar",
        "mover reserva",
        "reprogramar reserva",
        "reprogramar clase",
      ],
      sugerencias: ["no_puedo_ir", "ceder_plaza", "cancelar_reserva"],
    },
    {
      id: "he_pagado_no_veo_reserva",
      patrones: [
        "pago no veo reserva",
        "pago no aparece",
        "no veo reserva",
        "no aparece reserva",
        "pago pero no sale",
      ],
      sugerencias: ["confirmacion_reserva", "problema_pago", "reserva_solo_tras_pago"],
    },
    {
      id: "consultar_pieza",
      patrones: [
        "mi pieza esta lista",
        "recoger pieza",
        "ver pieza lista",
        "pieza lista",
        "ya puedo recogerla",
      ],
      sugerencias: ["pieza_lista", "donde_recoger_pieza", "envio_pieza"],
    },
    {
      id: "usar_tarjeta_regalo",
      patrones: [
        "tarjeta regalo",
        "codigo regalo",
        "canjear regalo",
        "usar regalo",
      ],
      sugerencias: ["canjear_tarjeta_regalo", "ver_tarjeta_regalo", "caducidad_tarjeta_regalo"],
    },
    {
      id: "grupo_como_reservar",
      patrones: [
        "reservar grupos",
        "grupo",
        "cumpleanos",
        "despedida",
        "actividad grupos",
      ],
      sugerencias: ["horario_grupos", "grupo_otro_horario", "contacto_taller"],
    },
  ];

  for (const prioridad of prioridades) {
    const coincide = prioridad.patrones.some((patron) =>
      texto.includes(reemplazarSinonimos(patron))
    );

    if (coincide) {
      const item = faqData.find((f) => f.id === prioridad.id);
      if (!item) return null;

      return {
        mejor: item,
        sugerencias: faqData.filter(
          (f) => f.id !== item.id && prioridad.sugerencias.includes(f.id)
        ),
      };
    }
  }

  return null;
};

const buscarMejorRespuesta = (consulta) => {
  if (!consulta.trim()) return null;

  const resultados = faqData
    .map((item) => ({
      ...item,
      score: calcularCoincidencia(consulta, item),
    }))
    .sort((a, b) => b.score - a.score);

  const mejor = resultados[0];
  const segunda = resultados[1];

  if (!mejor || mejor.score < 24) return null;

  if (segunda && mejor.score - segunda.score < 4 && mejor.score < 34) {
    return {
      mejor,
      sugerencias: resultados
        .filter((r) => r.id !== mejor.id && r.score >= 20)
        .slice(0, 3),
    };
  }

  const sugerencias = resultados
    .filter(
      (r) =>
        r.id !== mejor.id &&
        r.score >= 18 &&
        (r.categoria === mejor.categoria || r.score >= 24)
    )
    .slice(0, 3);

  return {
    mejor,
    sugerencias,
  };
};

const ChatAyuda = () => {
  const [input, setInput] = useState("");
  const [mensajes, setMensajes] = useState([
    {
      id: 1,
      tipo: "bot",
      texto: MENSAJE_BIENVENIDA,
      categoria: "¡Hola!",
      preguntaRelacionada: null,
      sugerencias: [],
      mostrarWhatsapp: false,
    },
  ]);

  const contenedorMensajesRef = useRef(null);

  const hayMensajesUsuario = useMemo(
    () => mensajes.some((m) => m.tipo === "user"),
    [mensajes]
  );

  useEffect(() => {
    if (contenedorMensajesRef.current) {
      contenedorMensajesRef.current.scrollTop =
        contenedorMensajesRef.current.scrollHeight;
    }
  }, [mensajes]);

  const enviarMensaje = (textoManual = null) => {
    const texto = (textoManual ?? input).trim();
    if (!texto) return;

    const ahora = Date.now();

    const mensajeUsuario = {
      id: ahora,
      tipo: "user",
      texto,
    };

    const resultado =
      buscarRespuestaPrioritaria(texto) || buscarMejorRespuesta(texto);

    let mensajeBot;

    if (resultado?.mejor) {
      const mostrarWhatsapp =
        esConsultaDelicada(texto) ||
        ["Cambios y cancelaciones", "Pagos", "Grupos", "Piezas"].includes(
          resultado.mejor.categoria
        );

      mensajeBot = {
        id: ahora + 1,
        tipo: "bot",
        texto: resultado.mejor.respuesta,
        categoria: resultado.mejor.categoria,
        preguntaRelacionada: resultado.mejor.pregunta,
        sugerencias: resultado.sugerencias || [],
        mostrarWhatsapp,
      };
    } else {
      mensajeBot = {
        id: ahora + 1,
        tipo: "bot",
        texto: MENSAJE_NO_ENCONTRADO,
        categoria: "Contacto",
        preguntaRelacionada: null,
        sugerencias: [],
        mostrarWhatsapp: true,
      };
    }

    setMensajes((prev) => [...prev, mensajeUsuario, mensajeBot]);
    setInput("");
  };

  const manejarSubmit = (e) => {
    e.preventDefault();
    enviarMensaje();
  };

  const reiniciarChat = () => {
    setMensajes([
      {
        id: 1,
        tipo: "bot",
        texto: MENSAJE_BIENVENIDA,
        categoria: "¡Hola!",
        preguntaRelacionada: null,
        sugerencias: [],
        mostrarWhatsapp: false,
      },
    ]);
    setInput("");
  };

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <BotonVolver />
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#e6ddd0] bg-white shadow-sm">
          <div className="border-b border-[#efe7dc] bg-[#f7efe6] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d8b08c] text-xl text-white"><Icono nombre="chat" color="currentColor" /></div>
                <div>
                  <h1 className="text-xl font-semibold text-[#5c3d2e]">
                    Soy Junquillo
                  </h1>
                  <p className="text-sm text-[#7a6254]">
                    Estoy aquí para ayudarte con dudas sobre reservas, pagos,
                    piezas, bonos, tarjetas regalo y cómo funciona el taller.
                  </p>
                </div>
              </div>

              <button
                onClick={reiniciarChat}
                className="rounded-full border border-[#dcc8b4] px-4 py-2 text-sm font-medium text-tinta-suave transition hover:bg-[#fff8f2]"
              >
                Reiniciar chat
              </button>
            </div>
          </div>

          {!hayMensajesUsuario && (
            <div className="border-b border-[#f1ebe4] bg-[#fffaf5] px-5 py-4">
              <p className="mb-3 text-sm font-medium text-[#7a6254]">
                Te puedo ayudar con...
              </p>
              <div className="flex flex-wrap gap-2">
                {sugerenciasRapidas.map((sugerencia) => (
                  <button
                    key={sugerencia}
                    onClick={() => enviarMensaje(sugerencia)}
                    className="rounded-full border border-[#e8d8c8] bg-white px-3 py-2 text-sm text-tinta-suave transition hover:bg-[#fdf5ee]"
                  >
                    {sugerencia}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            ref={contenedorMensajesRef}
            className="max-h-[60vh] overflow-y-auto bg-[#fcfaf7] px-4 py-5"
          >
            <div className="flex flex-col gap-4">
              {mensajes.map((mensaje) => (
                <div
                  key={mensaje.id}
                  className={`flex ${
                    mensaje.tipo === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${
                      mensaje.tipo === "user"
                        ? "bg-[#d8b08c] text-white"
                        : "border border-[#ece2d7] bg-white text-[#4e3a2f]"
                    }`}
                  >
                    {mensaje.tipo === "bot" && mensaje.categoria && (
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#b07f56]">
                        {mensaje.categoria}
                      </div>
                    )}

                    {mensaje.tipo === "bot" && mensaje.preguntaRelacionada && (
                      <p className="mb-2 text-sm font-semibold text-tinta-suave">
                        {mensaje.preguntaRelacionada}
                      </p>
                    )}

                    <p className="whitespace-pre-line text-sm leading-6">
                      {mensaje.texto}
                    </p>

                    {mensaje.tipo === "bot" &&
                      mensaje.sugerencias &&
                      mensaje.sugerencias.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-medium text-[#8b6d58]">
                            También puede interesarte:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {mensaje.sugerencias.map((sug) => (
                              <button
                                key={sug.id}
                                onClick={() => enviarMensaje(sug.pregunta)}
                                className="rounded-full border border-[#eadccf] bg-[#fffaf6] px-3 py-1.5 text-xs text-[#6a5142] transition hover:bg-[#fdf2e8]"
                              >
                                {sug.pregunta}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    {mensaje.tipo === "bot" && mensaje.mostrarWhatsapp && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={WHATSAPP_LINK}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          Hablar por WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={manejarSubmit}
            className="border-t border-[#efe7dc] bg-white px-4 py-4"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-[#e7dbcf] bg-[#fcfaf7] px-4 py-3">
              <span className="text-lg text-[#a68a73]"><Icono nombre="buscar" /></span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu duda aquí..."
                className="flex-1 bg-transparent text-sm text-[#4e3a2f] outline-none placeholder:text-[#b39b88]"
              />
              <button
                type="submit"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d8b08c] text-white transition hover:opacity-90"
                aria-label="Enviar mensaje"
              ><Icono nombre="enviar" /></button>
            </div>

            <p className="mt-3 text-xs text-[#9b8574]">
              Consejo: prueba con frases como “quiero cambiar mi reserva”, “he
              pagado y no veo mi reserva”, “cómo funciona una tarjeta regalo” o
              “dónde veo si mi pieza está lista”.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatAyuda;