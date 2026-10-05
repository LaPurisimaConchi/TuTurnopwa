# TuTurno PWA — La Purísima Conchi

Documentación técnica de entrega del proyecto. Pensada para que un desarrollador pueda continuar el mantenimiento, el despliegue y las evoluciones futuras.

**Producción:** [https://app.lapurisimaconchi.com](https://app.lapurisimaconchi.com)  
**Firebase:** proyecto `la-purisima-conchi` (Realtime Database, región `europe-west1`)

---

## Resumen del proyecto

TuTurno es una **SPA React** (PWA parcial) para el taller de cerámica **La Purísima Conchi**. Permite:

- Reservar clases y talleres individuales
- Gestionar reservas de grupos (pago completo o pago individual por asistente)
- Comprar y canjear tarjetas regalo
- Comprar y consumir bonos mensuales
- Pagar online mediante **Redsys TPV**
- Administrar reservas, usuarios, clases, bonos, tarjetas y fechas desde un panel admin

La aplicación usa **Firebase Realtime Database** como backend de datos y **Firebase Auth** (email/contraseña). No utiliza Firestore ni Firebase Storage en el cliente.

---
## Estado actual del proyecto

Situación en junio de 2026:

- Aplicación operativa en producción.
- Reservas individuales funcionando.
- Reservas de grupo funcionando.
- Bonos funcionando.
- Tarjetas regalo funcionando.
- Panel de administración operativo.
- Pagos Redsys operativos.
- Aplicación utilizada actualmente por el taller para la gestión diaria de reservas.

Existen mejoras técnicas identificadas y documentadas en este README, pero no impiden el funcionamiento actual de la aplicación.

## Contexto del desarrollo

Proyecto desarrollado inicialmente por una única desarrolladora.

La aplicación evolucionó durante el desarrollo incorporando funcionalidades que no formaban parte del alcance inicial:

- Reservas de grupo.
- Pago individual por participante.
- Bonos.
- Tarjetas regalo.
- Panel avanzado de administración.
- Integración Redsys.

## Tecnologías usadas

| Capa | Tecnología | Versión aprox. |
|------|------------|----------------|
| Frontend | React | 19.x |
| Routing | React Router DOM | 7.x |
| Build | Vite | 6.x |
| Estilos | Tailwind CSS | 3.x |
| Base de datos | Firebase Realtime Database | SDK 11.x |
| Autenticación | Firebase Auth | SDK 11.x |
| Pagos | Redsys TPV (HMAC_SHA256_V1) | — |
| API serverless | Vercel Functions (Node.js) | — |
| Hosting | Vercel | — |
| Fechas | date-fns, react-datepicker | — |
| Lint | ESLint 9 (flat config) | — |

**Notas:**

- No hay TypeScript ni tests automatizados en el repositorio.
- `firebase-admin` está en `package.json` del frontend pero solo se usa en `api/` (Vercel).
- La PWA tiene `manifest.json` pero **no incluye service worker** (instalable de forma limitada, sin caché offline).

---

## Cómo ejecutar en local

### Requisitos

- Node.js 18+ (recomendado 20+)
- npm

### Pasos

```bash
git clone <repo-url>
cd TuTurnopwa
npm install
npm run dev
```

La app estará en **http://localhost:5173/**

### Proxy de API en desarrollo

En local, las llamadas a `/api/*` se redirigen a producción mediante `vite.config.js`:

```js
proxy: {
  "/api": {
    target: "https://app.lapurisimaconchi.com",
    changeOrigin: true,
    secure: true
  }
}
```

**Implicación:** en desarrollo, los pagos Redsys y el webhook usan la infraestructura de producción. Las cuentas administradoras pueden simular la confirmación de un pago sin abrir Redsys; para probar pagos reales con Redsys sin afectar producción, conviene desplegar un entorno de staging en Vercel con credenciales de test.

### Otros comandos

```bash
npm run build    # Build de producción → carpeta dist/
npm run preview  # Previsualizar el build local
npm run lint     # ESLint
```

---

## Variables de entorno

### Frontend (`src/firebase.js`)

La configuración de Firebase está **hardcodeada** en el cliente. Es el patrón habitual de Firebase (la seguridad real depende de las **reglas de Realtime Database** en consola).

Para entornos separados (staging/prod), se recomienda migrar a `import.meta.env.VITE_*`.

### Vercel — API serverless (`api/`)

Configurar en el panel de Vercel → Project → Settings → Environment Variables:

| Variable | Uso | Archivo(s) |
|----------|-----|--------------|
| `REDSYS_SECRET_KEY` | Clave secreta Redsys (base64) para firma HMAC V1 | `api/crear-sesion.js`, `api/notificacionTPV.js` |
| `FIREBASE_ADMIN_PROJECT_ID` | ID del proyecto Firebase | `api/_firebaseAdmin.js` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Email de la service account | `api/_firebaseAdmin.js` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Clave privada de la service account (con `\n` escapados) | `api/_firebaseAdmin.js` |
| `FIREBASE_DATABASE_URL` | URL de Realtime Database | `api/_firebaseAdmin.js` |

**Valores actualmente hardcodeados en código** (migrar a env si se desea):

| Valor | Archivo | Línea aprox. |
|-------|---------|--------------|
| `FUC = "368564464"` | `api/crear-sesion.js` | comentado como `process.env.REDSYS_FUC` |
| `TERMINAL = "001"` | `api/crear-sesion.js` | — |
| `CURRENCY = "978"` | `api/crear-sesion.js` | EUR |

### Firebase Cloud Functions (`functions/`)

Existe una implementación **legacy/alternativa** de Redsys en `functions/index.js` que usa `functions.config().redsys.*`. **No es el camino activo de producción** (producción usa Vercel `api/`).

### Archivos de entorno de referencia

No existe `.env.example` en el repositorio. Crear uno al configurar un nuevo entorno.

---

## Estructura de carpetas

```
TuTurnopwa/
├── api/                      # Vercel Serverless Functions (PRODUCCIÓN para pagos)
│   ├── crear-sesion.js       # Crea sesión Redsys y redirige al TPV
│   ├── notificacionTPV.js    # Webhook de confirmación de pago
│   ├── pago-admin.js         # Confirma pagos simulados con autenticación admin
│   ├── _firebaseAdmin.js     # Inicialización Admin SDK
│   ├── _cors.js
│   ├── ping.js
│   ├── diag-tpv.js           # Diagnóstico (revisar si debe estar en prod)
│   └── *-backup.js, *-viejo.js  # Versiones antiguas — NO usar en prod
├── docs/                     # Manuales de usuario/admin (HTML)
├── functions/                # Firebase Cloud Functions (legacy Redsys)
├── public/
│   ├── manifest.json         # PWA manifest
│   └── img/                  # Assets estáticos (iconos, imágenes)
├── src/
│   ├── App.jsx               # Router central (~100 rutas)
│   ├── AppLayout.jsx         # Layout con Outlet + Footer
│   ├── firebase.js           # Config Firebase cliente
│   ├── main.jsx
│   ├── components/           # Solo DateInputReserva.jsx
│   ├── utils/
│   │   ├── bonos.js          # Lógica de bonos
│   │   ├── contarPlazasDia.js # Conteo de plazas ocupadas
│   │   └── tarjetasRegalo.js
│   ├── RutaAdmin.jsx         # Guard de rutas admin (emails hardcodeados)
│   ├── DondeReservarV2.jsx   # Hub principal de reservas
│   ├── Reserva*.jsx          # ~25 formularios de reserva (patrón repetido)
│   ├── CreaTu*.jsx / PintaTu*.jsx  # Landings informativas de clases
│   ├── Admin*.jsx            # Panel de administración
│   ├── ResumenPago.jsx       # Resumen previo a Redsys
│   ├── PagoGrupoIndividual.jsx
│   ├── faqData.js            # Motor FAQ del chat de ayuda
│   └── ...
├── index.html
├── vite.config.js
├── vercel.json               # Rewrites SPA + CORS en /api
├── firebase.json             # Solo Cloud Functions (sin reglas RTDB)
├── tailwind.config.js
└── package.json
```

### Convención de archivos

Cada taller suele tener **dos archivos**:

| Tipo | Ejemplo | Rol |
|------|---------|-----|
| Landing | `CreaTuBrunchBowl.jsx` | Información, galería, botón reservar |
| Reserva | `ReservaCreaTuBrunchBowl.jsx` | Formulario, validación, escritura en Firebase |

Añadir una clase nueva implica crear ambos archivos, registrar rutas en `App.jsx` y configurar el nodo correspondiente en Firebase `clases/`.

---

## Estructura de Firebase Realtime Database

```
/
├── clases/{claseId}                    # Config: precios, plazas, horarios, activa
├── reservas/
│   └── {ClasePathKey}/
│       └── {fecha}/{turno}/{metodo}/{reservaId}
├── reservasGrupos/{grupoId}/
│   └── pagosIndividuales/{pagoId}      # Solo modo pago individual
├── pedidosPendientes/{orderId}         # Puente hacia Redsys (webhook)
├── usuarios/{uid}/
│   ├── nombre, telefono, email
│   ├── listaReservas/{reservaId}
│   ├── bonos/{bonoId}/
│   │   └── sesionesConsumidas/
│   └── tarjetasRegalo/{orderId}
├── tarjetasRegalo/{orderId}            # Tarjetas compradas (canje)
├── codigosTarjetaRegalo/{codigo}       # Índice código → orderId
├── bloqueosFechas/{YYYY-MM-DD}         # Fechas bloqueadas
├── fechasHabilitadas/{YYYY-MM-DD}      # Aperturas especiales
├── reservasNotas/{orderId}/notasInternas/
├── usuariosNotas/{uid}/notasInternas/
└── clasesNotas/{claseId}/notasInternas/
```

### Estados habituales

| Entidad | Campo | Valores |
|---------|-------|---------|
| Reserva individual | `estado` | `Pendiente`, `Confirmada` |
| | `estadoPago` | `pendiente`, `pagado` |
| Grupo | `estado` | `Pendiente`, `pendiente_pago_individual`, `Confirmada`, `Cancelada` |
| | `estadoPago` | `pendiente`, `parcial`, `pagado`, `cancelado` |
| Pago individual grupo | `estadoPago` | `pendiente_redsys`, `pagado`, `pagado_manual` |
| Bono | `estadoBono` | `activo`, `agotado`, `caducado` |
| Tarjeta regalo | `estadoCanje` | `pendiente`, `canjeado`, `usada` |

**Importante:** las reglas de Realtime Database **no están versionadas en este repositorio**. Exportarlas desde Firebase Console y añadir `database.rules.json` al repo es una tarea prioritaria para el siguiente desarrollador.

---

## Flujos principales

### 1. Reserva individual

```
Usuario logueado → Reserva*.jsx → validación plazas/bloqueos
  → push en reservas/{clase}/{fecha}/{turno}/{metodo}/{id}
     (estado: Pendiente, estadoPago: pendiente)
  → /resumen-pago → pedidosPendientes/{orderId}
  → /api/crear-sesion → redirect Redsys
  → webhook /api/notificacionTPV
  → estado: Confirmada, estadoPago: pagado
  → copia en usuarios/{uid}/listaReservas
  → /pago/exito
```

**Pago de prueba para administradores:** al confirmar un pago desde los resúmenes de pago (incluidos The Club y Tearium) o desde el pago individual de grupo, una cuenta autorizada evita Redsys y confirma el pedido mediante `POST /api/pago-admin`. El servidor verifica el token de Firebase, el email administrador y que el pedido pertenezca a esa cuenta antes de actualizar los registros. La lista de emails autorizados se comparte desde `src/utils/administradores.js`. Las cuentas normales continúan usando Redsys.

**Canje con tarjeta regalo:** algunos flujos confirman directamente sin pasarela (`desdeTarjetaRegalo: true`).

**Conteo de plazas:** `utils/contarPlazasDia.js` solo cuenta reservas con `Confirmada` + `pagado` en el nodo `reservas/`.

### 2. Reservas de grupo

**Entrada:** `/reserva-grupos`

**Requisitos:** login, mínimo 5 personas, confirmación previa con Berto por WhatsApp (checkbox manual).

**Modo pago completo:**
```
ReservaGrupos → reservasGrupos/{grupoId}
  → /resumen-pago (tipo: grupo)
  → Redsys → webhook → grupo Confirmada + pagado
```

**Modo pago individual:**
```
ReservaGrupos → reservasGrupos/{grupoId}
  (estado: pendiente_pago_individual, plazo 72h)
  → enlace /pago-grupo/{grupoId}
  → cada asistente paga en PagoGrupoIndividual (sin login)
  → pedidosPendientes (tipo: pago_grupo_individual)
  → Redsys → webhook confirmarPagoIndividualGrupo
  → plazasPagadas++ hasta completar grupo → Confirmada
```

**Pantallas relacionadas:**

| Ruta | Componente |
|------|------------|
| `/pago-grupo/:grupoId` | `PagoGrupoIndividual.jsx` |
| `/pago-grupo-exitoso/:grupoId` | `PagoGrupoExitoso.jsx` |
| `/pago-grupo-error/:grupoId` | `PagoGrupoError.jsx` |
| `/admin-reservas-grupos` | `AdminReservasGrupos.jsx` |

### 3. Bonos

```
Compra: ReservaTornoAlfarero*.jsx / ReservaModelaAMano*.jsx
  → tipo: "bono" → /resumen-pago
  → webhook guardarBonoPagado → usuarios/{uid}/bonos/{orderId}

Uso: /usar-bono/:bonoId
  → reserva a precio 0 + usarSesionDeBono() (decrementa clasesRestantes)
```

Lógica compartida en `src/utils/bonos.js`.

### 4. Tarjetas regalo

```
Compra: /comprar-tarjeta-regalo → tipo: tarjeta_regalo → Redsys
  → webhook genera código en tarjetasRegalo/ + codigosTarjetaRegalo/

Canje: /canjear-tarjeta → valida código → redirige a ruta de reserva
  → reserva confirmada + marca tarjeta usada
```

Catálogo de opciones: `src/opcionesTarjetaRegalo.js`.

### 5. Pagos Redsys (flujo técnico)

**Creación de sesión:** `GET /api/crear-sesion`

Parámetros: `orderId`, `amountCents`, `payMethod`, `okUrl`, `koUrl`, `notifyUrl`

Redirige automáticamente al TPV de Redsys (`https://sis.redsys.es/sis/realizarPago`).

**Webhook:** `POST /api/notificacionTPV`

Procesa según `pedidosPendientes/{orderId}.tipo`:

| tipo / flag | Acción webhook |
|-------------|----------------|
| (default) reserva | `marcarReservaComoPagadaPorOrderId` |
| grupo (pago completo) | `marcarReservaGrupoComoPagada` |
| `pago_grupo_individual` | `confirmarPagoIndividualGrupo` |
| `tarjeta_regalo` | `guardarTarjetaRegaloPagada` |
| `esBono: true` | `guardarBonoPagado` |

**Simulación admin:** `POST /api/pago-admin` recibe `orderId` y un token Firebase en `Authorization: Bearer ...`. Solo permite emails de `src/utils/administradores.js` y pedidos pertenecientes al usuario autenticado. Confirma el pedido y registra `simuladoPorAdministrador: true`; no inicia un cargo en Redsys.

---

## Rutas principales

### Usuario

| Ruta | Descripción |
|------|-------------|
| `/portada` | Página de inicio |
| `/dondereservar` | Hub de reservas |
| `/login`, `/registro` | Autenticación |
| `/perfil`, `/editar-perfil` | Perfil de usuario |
| `/reserva-*` | Formularios de reserva por clase |
| `/reserva-grupos` | Reserva de grupos |
| `/resumen-pago` | Resumen antes de pagar |
| `/pago/exito`, `/pago/error` | Confirmación / error de pago |
| `/pago-grupo/:grupoId` | Pago individual de plaza en grupo |
| `/comprar-tarjeta-regalo`, `/canjear-tarjeta` | Tarjetas regalo |
| `/usar-bono/:bonoId` | Consumir sesión de bono |
| `/ayuda` | Chat de ayuda (FAQ) |
| `/clases-online`, `/reserva-online` | Clases online |

### Admin

Todas protegidas con `<RutaAdmin>` (lista de emails en `src/RutaAdmin.jsx`).

| Ruta | Componente | Función |
|------|------------|---------|
| `/admin-dashboard` | `AdminDashboard` | Hub admin, KPIs |
| `/admin-reservas-nuevo` | `AdminReservasNuevo` | Listado de reservas |
| `/admin-detalle-reserva` | `AdminDetalleReservaNuevo` | Detalle, cancelar, reprogramar |
| `/admin-reservas-grupos` | `AdminReservasGrupos` | Grupos y pagos parciales |
| `/admin-calendario-reservas-nuevo` | `AdminCalendarioReservasNuevo` | Calendario |
| `/admin-historial-nuevo` | `AdminHistorialNuevo` | Historial (sin enlace en dashboard) |
| `/admin-clases-nuevo` | `AdminClasesNuevo` | Gestión de clases |
| `/admin-detalle-clase` | `AdminDetalleClaseNuevo` | Detalle de clase |
| `/admin-usuarios-nuevo` | `AdminUsuariosNuevo` | Usuarios |
| `/admin-detalle-usuario` | `AdminDetalleUsuarioNuevo` | Detalle de usuario |
| `/admin-bonos-nuevo` | `AdminBonosNuevo` | Bonos |
| `/admin-detalle-bono` | `AdminDetalleBonoNuevo` | Detalle de bono |
| `/admin-tarjetas-regalo` | `AdminTarjetasRegalo` | Tarjetas regalo |
| `/admin-detalle-tarjeta-regalo` | `AdminDetalleTarjetaRegaloNuevo` | Detalle tarjeta |
| `/admin-bloqueos-fechas` | `AdminBloqueosFechas` | Bloquear fechas |
| `/admin-habilitar-fechas` | `AdminHabilitarFechas` | Habilitar fechas |
| `/admin-nuevo` | `AdminNuevo` | Resumen alternativo (legacy) |

**Acceso admin:** tras login, usuarios admin ven enlace en `/dondereservar`. Emails autorizados definidos en `RutaAdmin.jsx` y duplicados en `DondeReservarV2.jsx`.

---

## Despliegue en Vercel

1. Conectar el repositorio a Vercel.
2. **Framework preset:** Vite
3. **Build command:** `npm run build`
4. **Output directory:** `dist`
5. Configurar variables de entorno (sección anterior).
6. El archivo `vercel.json` define:
   - Rewrites SPA: todas las rutas → `/` (excepto `/api/*`)
   - CORS en `/api/*`

**Dominio de producción:** `app.lapurisimaconchi.com`

Las URLs de retorno Redsys (`okUrl`, `koUrl`) apuntan a ese dominio en varios componentes.

### Firebase

- Proyecto: `la-purisima-conchi` (`.firebaserc`)
- `firebase.json` solo despliega Cloud Functions; **no despliega reglas RTDB ni hosting**
- Reglas de base de datos: gestionar manualmente en [Firebase Console](https://console.firebase.google.com)

---

## Servicios externos

| Servicio | Uso |
|----------|-----|
| **Firebase Auth** | Registro/login de usuarios |
| **Firebase Realtime Database** | Toda la persistencia de datos |
| **Redsys TPV** | Pasarela de pago con tarjeta |
| **Vercel** | Hosting SPA + API serverless |
| **WhatsApp** | Confirmación manual de reservas de grupo (enlace a Berto; no integración API) |

---

## Cuentas y accesos que deben migrarse

Al transferir el proyecto, el nuevo responsable necesitará acceso a:

| Cuenta / recurso | Qué gestiona |
|------------------|--------------|
| **Firebase Console** (`la-purisima-conchi`) | Auth, Realtime Database, reglas, service account |
| **Vercel** | Despliegue, dominio, variables de entorno, functions |
| **Redsys / banco** | TPV, clave secreta, FUC, terminal, URLs de notificación |
| **Dominio** `lapurisimaconchi.com` | DNS del subdominio `app.` |
| **Emails admin** | Hardcodeados en `RutaAdmin.jsx` y `DondeReservarV2.jsx` |
| **WhatsApp del taller** | Número de Berto usado en reservas de grupo |

### Service account Firebase

La API serverless usa una service account cuyas credenciales van en variables de entorno de Vercel (`FIREBASE_ADMIN_*`). Generar una nueva clave en Firebase Console → Project Settings → Service Accounts si es necesario rotarla.

---

## Puntos de atención para futuros desarrollos

Los siguientes aspectos no impiden el funcionamiento actual de la aplicación y se documentan para facilitar futuras tareas de mantenimiento, evolución o ampliación del proyecto.

### Seguridad y autorización

- **Reglas RTDB no versionadas** en el repositorio. Exportar desde consola y añadir al repo.
- **Admin autorizado por lista de emails en frontend** (`RutaAdmin.jsx`). Ocultar rutas no impide acceso directo al SDK si las reglas RTDB son permisivas. Valorar custom claims de Firebase.
- **`/api/crear-sesion`** no autentica al usuario; el importe proviene del pedido pendiente en RTDB.

### Redsys (ver sección específica más abajo)

- La integración funciona en producción con HMAC_SHA256_V1.
- La validación de firma en el webhook tiene un comportamiento que el siguiente desarrollador debe revisar antes de modificar pagos (detalle en notas Redsys).

### Reservas de grupo (ver sección específica)

- Los grupos en pago individual tienen lógica propia y plazo de 72 horas.
- El contador de plazas de reservas individuales (`contarPlazasDia.js`) **no incluye** grupos parcialmente pagados en `reservasGrupos/`.

### Código y mantenimiento

- **~25 archivos `Reserva*.jsx`** con lógica duplicada (~600–800 líneas cada uno). Un cambio transversal requiere tocar muchos archivos.
- **Archivos legacy** en repo: `*-backup.js`, `*-viejo.js`, `DondeReservar backup.jsx`, `ReservaPintarCeramicaAntiguo.jsx`, etc.
- **Rutas Firebase duplicadas** para tarjetas: `tarjetasRegalo` vs `tarjetas_regalo` (legacy en `HistorialTarjetasRegalo.jsx`).
- **Estados inconsistentes** en capitalización (`Pendiente` vs `pendiente_pago_individual`).
- **`functions/index.js`**: implementación Redsys alternativa, no usada en prod vía Vercel.

### PWA

- Manifest presente; **sin service worker**. No hay soporte offline.

---

## Notas sobre Redsys

> **Estado actual:** la integración Redsys está **operativa** en producción a través de `api/crear-sesion.js` y `api/notificacionTPV.js`.

**Archivos activos (producción):**

- `api/crear-sesion.js` — crea sesión, firma HMAC_SHA256_V1, redirect al TPV
- `api/notificacionTPV.js` — webhook de notificación de pago

**Archivos que NO usar en producción:**

- `api/crear-sesion-backup.js`, `api/crear-sesion-viejo.js`
- `api/notificacionTPV_backup.js`
- `functions/index.js` (Firebase Functions, entorno test)

**Antes de modificar pagos, el desarrollador debe revisar:**

En `api/notificacionTPV.js`, la condición que acepta un pago es:

```js
const aceptarPagoTemporalmente = paidOk && amountMatches;
// signOk se calcula pero no es condición obligatoria de aceptación
```

La firma se registra en `firmaValida` y `firmaError`, pero un pago puede procesarse aunque `signOk` sea `false`. **Cualquier cambio en este archivo debe probarse con transacciones reales o de test en entorno aislado** y validar que la firma se exige correctamente antes de confirmar pedidos.

**FUC y terminal** están parcialmente hardcodeados en `crear-sesion.js`. Migrar a variables de entorno si se cambia de comercio o entorno.

---

## Notas sobre reservas de grupo con pago individual

Flujo resumido:

1. Organizador crea reserva en `/reserva-grupos` con modo **"Dividir el pago entre asistentes"**.
2. Se genera enlace `/pago-grupo/{grupoId}` con plazo de **72 horas** (`fechaLimitePago`).
3. Cada asistente paga su plaza sin login.
4. El webhook incrementa `plazasPagadas` en `reservasGrupos/{grupoId}`.
5. Cuando `plazasPagadas >= plazas`, el grupo pasa a `Confirmada`.

**Comportamientos a tener en cuenta:**

- El organizador **también debe pagar** su plaza desde el mismo enlace (documentado en pantalla post-creación y en perfil).
- Los incrementos de `plazasPagadas` en el webhook son **read-modify-write** sin transacciones Firebase.
- Los grupos en pago parcial **no restan aforo** en `contarPlazasDia.js` (solo cuenta `reservas/` confirmadas). Si aumenta el uso de grupos grandes, conviene revisar esta lógica.
- La caducidad de 72 h se valida en cliente (`PagoGrupoIndividual.jsx`); no hay job automático que marque `cancelada_por_caducidad` en servidor.

---

## Mejoras futuras recomendadas

Priorizadas por impacto, sin orden estricto:

1. Versionar y endurecer `database.rules.json` + custom claims admin
2. Revisar validación de firma Redsys en webhook (con tests en entorno test)
3. Extraer componente/hook genérico de reserva para eliminar duplicación
4. Añadir `.env.example` y migrar config Firebase a variables `VITE_*`
5. Unificar estados (`Confirmada`/`confirmada`) y rutas `tarjetasRegalo`
6. Transacciones RTDB en pagos de grupo individual
7. Revisar bloqueo de aforo para grupos en pago parcial
8. Completar PWA con service worker o documentar que no es offline
9. Eliminar archivos legacy y APIs backup del repositorio
10. Añadir tests mínimos en webhook y conteo de plazas
11. Unificar panel admin (un solo dashboard, sidebar, enlazar historial)
12. Centralizar lista de admins (env var o nodo RTDB protegido)
13. TypeScript gradual en `utils/` y modelos de datos

---

## Guía para el desarrollador: qué NO tocar sin probar

| Área | Riesgo | Recomendación |
|------|--------|---------------|
| `api/notificacionTPV.js` | Confirmación de todos los pagos | No modificar sin entorno test Redsys + verificar firma |
| `api/crear-sesion.js` | Redirect al TPV | Probar con importe mínimo en test antes de desplegar |
| `utils/contarPlazasDia.js` | Disponibilidad de plazas | Cualquier cambio afecta sobreventa/subventa |
| `Reserva*.jsx` (todos) | Lógica duplicada | Cambiar uno implica revisar los ~25 equivalentes |
| Reglas Firebase (consola) | Seguridad de toda la app | Exportar backup antes de cambiar |
| `pedidosPendientes/` schema | Webhook depende de la estructura | No renombrar campos sin actualizar webhook |
| URLs hardcodeadas `app.lapurisimaconchi.com` | Redirects Redsys | Buscar en proyecto antes de cambiar dominio |
| `functions/` vs `api/` | Dos implementaciones Redsys | Producción usa **`api/` en Vercel**, no Cloud Functions |

### Checklist antes de desplegar cambios sensibles

- [ ] `npm run build` sin errores
- [ ] Probar login, reserva, resumen de pago (sin completar TPV si no es necesario)
- [ ] Si se tocó pagos: transacción test en Redsys + verificar webhook en logs Vercel
- [ ] Si se tocó plazas: reservar en fecha con aforo limitado y verificar contador
- [ ] Si se tocó admin: probar acceso con usuario admin y no-admin

---

## Documentación adicional

| Recurso | Ubicación |
|---------|-----------|
| Manual de usuario | `docs/Manual_La_Purisima_Conchi.html` |
| Manual admin (premium) | `docs/Manual_La_Purisima_Conchi_Premium.html` |
| FAQ del chat | `src/faqData.js` |
| Router completo | `src/App.jsx` |

---

## Contacto y negocio

**Taller:** La Purísima Conchi  
**App:** TuTurno PWA  
**WhatsApp reservas grupo:** número de Berto configurado en `ReservaGrupos.jsx` (`WHATSAPP_BERTO`)

---

*Última actualización de este README: entrega del proyecto — junio 2026.*
