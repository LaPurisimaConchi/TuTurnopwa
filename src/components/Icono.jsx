// src/components/Icono.jsx
// Iconos duotono (Phosphor) para toda la web, en lugar de emojis. Cada icono lleva
// su color de la paleta (terracota, mostaza, verde, rojo, azul); los de acción
// (flechas, cerrar, check…) heredan el color del texto. Para forzar uno:
// `color="currentColor"` o `color="#b36a4a"`. Tamaño por defecto 1.15em: acompaña al texto.
//   <Icono nombre="regalo" />   <Icono nombre="usuarios" tamano={28} />
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  ArrowUp,
  ArrowsDownUp,
  CalendarDots,
  Camera,
  CaretLeft,
  CaretRight,
  ChartBar,
  ChatCircleDots,
  Check,
  CheckCircle,
  Circle,
  ClipboardText,
  ClockCounterClockwise,
  CreditCard,
  CurrencyEur,
  Envelope,
  Eye,
  FileText,
  Gift,
  HouseLine,
  Link,
  LockKey,
  MagnifyingGlass,
  MapPin,
  NotePencil,
  PaperPlaneTilt,
  Phone,
  PlusCircle,
  Prohibit,
  PushPin,
  Repeat,
  ShieldCheck,
  SmileySad,
  Sparkle,
  Star,
  Tag,
  Ticket,
  UserCircle,
  UsersThree,
  Warning,
  X,
  XCircle,
} from "@phosphor-icons/react";

const TERRACOTA = "#b36a4a";
const MOSTAZA = "#d9a21b";
const VERDE = "#3f8f5a";
const ROJO = "#c0463a";
const AZUL = "#4a7fa8";
const HEREDA = "currentColor";

// Jarrón propio (el mismo del «Sin imagen»), para talleres y piezas
function Vasija({ size = "1.15em", color = HEREDA, className = "", ...resto }) {
  const d = "M35 18h20M38 18q-1 12-8 22q-8 12-8 24q0 14 12 14h26q12 0 12-14q0-12-8-24q-7-10-8-22";
  return (
    <svg
      viewBox="0 0 90 90"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      {...resto}
    >
      <path d={d} fill={color} fillOpacity="0.2" stroke="none" />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// nombre → [componente, color por defecto]
const ICONOS = {
  aviso: [Warning, MOSTAZA],
  abajo: [ArrowDown, HEREDA],
  izquierda: [ArrowLeft, HEREDA],
  derecha: [ArrowRight, HEREDA],
  arriba: [ArrowUp, HEREDA],
  ordenar: [ArrowsDownUp, TERRACOTA],
  externo: [ArrowSquareOut, HEREDA],
  bloquear: [Prohibit, ROJO],
  calendario: [CalendarDots, MOSTAZA],
  calendarioEvento: [CalendarDots, MOSTAZA],
  camara: [Camera, AZUL],
  estadisticas: [ChartBar, TERRACOTA],
  check: [Check, HEREDA],
  anterior: [CaretLeft, HEREDA],
  siguiente: [CaretRight, HEREDA],
  confirmado: [CheckCircle, VERDE],
  punto: [Circle, HEREDA],
  error: [XCircle, ROJO],
  reservas: [ClipboardText, TERRACOTA],
  pago: [CreditCard, AZUL],
  euro: [CurrencyEur, VERDE],
  ojo: [Eye, AZUL],
  pagina: [FileText, TERRACOTA],
  regalo: [Gift, TERRACOTA],
  historial: [ClockCounterClockwise, TERRACOTA],
  casa: [HouseLine, TERRACOTA],
  enlace: [Link, AZUL],
  candado: [LockKey, AZUL],
  correo: [Envelope, TERRACOTA],
  ubicacion: [MapPin, ROJO],
  chat: [ChatCircleDots, AZUL],
  triste: [SmileySad, MOSTAZA],
  notas: [NotePencil, TERRACOTA],
  telefono: [Phone, TERRACOTA],
  chincheta: [PushPin, ROJO],
  mas: [PlusCircle, VERDE],
  repetir: [Repeat, AZUL],
  buscar: [MagnifyingGlass, HEREDA],
  enviar: [PaperPlaneTilt, HEREDA],
  seguridad: [ShieldCheck, AZUL],
  brillo: [Sparkle, VERDE],
  estrella: [Star, MOSTAZA],
  etiqueta: [Tag, TERRACOTA],
  bono: [Ticket, MOSTAZA],
  usuario: [UserCircle, TERRACOTA],
  usuarios: [UsersThree, TERRACOTA],
  cerrar: [X, HEREDA],
  taller: [Vasija, VERDE],
};

export default function Icono({ nombre, tamano = "1.15em", color, className = "", ...resto }) {
  const entrada = ICONOS[nombre];
  if (!entrada) return null;
  const [Componente, colorPorDefecto] = entrada;
  return (
    <Componente
      size={tamano}
      color={color || colorPorDefecto}
      weight={nombre === "punto" ? "fill" : "duotone"}
      aria-hidden="true"
      className={`inline-block shrink-0 align-[-0.2em] ${className}`}
      {...resto}
    />
  );
}
