// src/CondicionesPago.jsx
import React from "react";
import Icono from "./components/Icono";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";

export default function CondicionesPago() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#fffef4] min-h-screen text-gray-800 px-6 py-8">
      {/* Logo arriba */}
      <div className="flex justify-center mb-6">
        <img
          src="/img/logoPCsin.png"
          alt="TuTurnoApp"
          className="w-32 md:w-40"
        />
      </div>

      {/* Botón volver */}
      <BotonVolver />

      {/* Contenido */}
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[#6b3700] mb-4">
          Condiciones del Servicio de Pago – TuTurnoApp
        </h1>

        <p className="mb-4">
          En <strong>TuTurnoApp</strong> los pagos se procesan a través de la plataforma segura
          <strong> Redsys</strong>, proveedor homologado que utiliza cifrado de extremo a extremo
          para garantizar la protección de tus datos personales y financieros.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2"><Icono nombre="seguridad" className="mr-1.5" />Seguridad</h3>
        <p className="mb-4">
          Nuestra aplicación <strong>no almacena en ningún momento tus datos de tarjeta</strong>.
          Toda la operación de pago se realiza en la pasarela externa de Redsys con conexión
          cifrada y segura.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2"><Icono nombre="pago" className="mr-1.5" />Problemas con el pago</h3>
        <p className="mb-4">
          Si ocurre algún problema durante el proceso de pago (cobros duplicados, error en la
          operación, etc.), puedes contactar con nosotros escribiendo a:
          <br />
          <strong>pagos@tuturnoapp.es</strong>
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2"><Icono nombre="error" className="mr-1.5" />Reembolsos</h3>
        <p className="mb-4">
          Los pagos realizados <strong>no son reembolsables</strong>, salvo en los casos
          especificados en nuestra <strong>Política de Cancelación</strong>. Por favor, asegúrate de
          tu reserva antes de confirmar el pago.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2"><Icono nombre="calendario" className="mr-1.5" />Última actualización</h3>
        <p className="mb-4">
          Este texto ha sido actualizado por última vez el{" "}
          <strong>27 de mayo de 2025</strong>.
        </p>
      </div>
    </div>
  );
}

