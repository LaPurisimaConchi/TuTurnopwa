// Etiqueta que marca en el panel de administración a quien compró sin registrarse
// (sesión anónima, `usuarios/{uid}/invitado: true`). Se enseña siempre junto al nombre
// del cliente para que nadie confunda un invitado con una cuenta registrada.
export default function EtiquetaInvitado({ invitado, style }) {
  if (!invitado) return null;

  return (
    <span
      title="Compró sin registrarse: no tiene cuenta ni perfil"
      style={{
        display: "inline-block",
        marginLeft: 6,
        padding: "1px 8px",
        borderRadius: 999,
        border: "1px solid #c9a227",
        background: "#fff6d6",
        color: "#7a5b00",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.6,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      Invitado
    </span>
  );
}
