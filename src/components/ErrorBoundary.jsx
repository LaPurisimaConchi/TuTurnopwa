// src/components/ErrorBoundary.jsx
// Si una pantalla falla al pintarse, React desmonta toda la web y se queda en blanco.
// Esto lo evita: enseña un aviso (y, en staging, el error) y deja volver al inicio.
import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Error al pintar la pantalla:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const detalle = import.meta.env.VITE_ENV === "staging" ? String(error?.stack || error) : "";

    return (
      <div role="alert" className="mx-auto max-w-xl p-6 text-center">
        <h1 className="text-xl font-bold text-tinta">Algo ha fallado al mostrar esta pantalla</h1>
        <p className="mt-2 text-sm text-tinta-suave">
          Recarga la página. Si el problema continúa, avísanos y cuéntanos qué estabas haciendo.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-terracota px-5 py-2 text-sm font-semibold text-white hover:bg-terracota-oscuro"
          >
            Recargar
          </button>
          <a href="/portada" className="rounded-full border border-terracota px-5 py-2 text-sm font-semibold text-terracota">
            Ir al inicio
          </a>
        </div>
        {detalle && (
          <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-arena p-3 text-left text-xs text-tinta">
            {detalle}
          </pre>
        )}
      </div>
    );
  }
}
