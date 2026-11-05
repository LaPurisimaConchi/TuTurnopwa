# TuTurno PWA — La Purísima Conchi

SPA React 19 + Vite 6 + Tailwind 3 + React Router 7. Backend: Firebase Realtime Database + Auth (sin Firestore) y funciones serverless de Vercel en `api/`. Pagos con Redsys. Sin TypeScript ni tests automatizados. El README tiene la documentación técnica general; aquí solo lo que conviene saber antes de tocar código. Texto de interfaz, nombres y comentarios van en español.

## Comandos

```bash
npm run dev      # http://localhost:5173
npm run build
npm run lint     # hay errores y avisos previos ajenos a tus cambios: no los arregles de paso
npm run migrar-categorias -- --project <proyecto> [--instance <bd>] [--dry-run] [--yes]
```

## Entornos: cuidado con producción

- **Sin `.env.local` la app apunta a PRODUCCIÓN** (Firebase y `/api`). Para trabajar contra staging copia `.env.example` a `.env.local` (no se sube a git; contiene `VITE_FIREBASE_*`, `VITE_ENV=staging` y el proxy de `/api`).
- Staging: proyecto `la-purisima-conchi-staging`. Producción: `la-purisima-conchi`. `.firebaserc` apunta a producción por defecto, así que pasa siempre `--project` a la CLI de Firebase.
- Reglas de la base de datos: `database.rules.json`. Despliegue a staging: `npx firebase-tools deploy --only database --project la-purisima-conchi-staging`. No despliegues a producción ni ejecutes migraciones contra producción sin que lo pida el usuario.
- Ramas: `main` y `staging`. Las PR de trabajo van contra `staging`. Commits y PR en español.
- Administradores: `src/utils/administradores.js` y `database.rules.json` (mismos dos emails; si cambia uno, cambia el otro).

## Modelo de datos (Realtime Database)

- `clases/{id}`: talleres. Los creados desde el panel llevan `dinamica: true`, `grupo` (id de categoría), `categoria` (etiqueta), `reservasPath`, etc. Los "de siempre" tienen página propia (`CreaTu*.jsx`, `Reserva*.jsx`) y su ficha en `clases/{id}` guarda la configuración editable desde el panel.
- `reservas/{reservasPath||id}/{fecha}/{turno}[/{metodo}]/{reservaId}`. El aforo solo cuenta reservas `Confirmada` y pagadas. Un taller migrado conserva su carpeta antigua en `reservasPath`, por eso migrar nunca mueve ni toca reservas.
- `imagenesClases/{id}`: fotos de los talleres dinámicos (en la base de datos, no hay Storage).
- `categoriasTalleres/{id}`: `{titulo, descripcion, orden, estado: activa|oculta, migrada?, eliminada?, creadoEn, actualizadoEn}`. Lectura pública, escritura solo admin. Si las reglas no están desplegadas, `src/categoriasTalleres.js` avisa una vez y devuelve lista vacía en vez de romper.
- El webhook `api/notificacionTPV.js` localiza la reserva por número de pedido recorriendo `reservas/`; no depende de qué página la creó. `api/pago-admin.js` deja a un admin simular la confirmación de un pago.

## Piezas clave

- **Compra sin registro**: cada compra de invitado abre una sesión anónima de Firebase (hay que tener activado el proveedor Anónimo). En `/reservar/:id` la sesión **no se abre al entrar**: la pantalla se ve sin sesión (`AccesoCompra permitirVisita`), lee la disponibilidad de `api/disponibilidad.js` (`src/utils/disponibilidad.js`; con sesión lee de la base de datos) y pide nombre, email y teléfono al pulsar «Confirmar y pagar» (`DatosContactoInvitado` → `iniciarCompraInvitado`). Las reglas del conteo de plazas están en `src/utils/plazasOcupadas.js`, compartidas por el navegador y la función; esa función solo devuelve fechas y números, nunca datos personales, y su lógica vive en `src/utils/disponibilidadServidor.js`. En `npm run dev`, `vite.disponibilidadLocal.js` sirve `/api/disponibilidad` con una sesión anónima del propio servidor (solo si hay `VITE_FIREBASE_*`), para no depender de que la función esté desplegada en el Vercel del proxy. El resto de pantallas de reserva y pago piden los datos al entrar, como antes. `src/utils/invitado.js` + `src/AccesoCompra.jsx` la mantienen mientras se navega por reserva/pago (clave `compraInvitado` en `sessionStorage`) y la cierran al salir o en `ConfirmacionPago`/`PagoFallido`. No se recuerdan datos entre compras (decisión del cliente). Al registrarse se conserva el uid (`linkWithCredential`). **Los bonos y los productos que se gestionan desde el perfil exigen cuenta**: `exigeCuenta(clase)` en `src/catalogoTalleres.js` (bono, o `requiereCuenta: true` en la ficha, casilla del formulario del taller); `AccesoCompra requiereCuenta` salta el formulario de invitado, `AccesoCompraTaller` lo decide para `/reservar/:id` y las rutas de bonos de siempre y `/usar-bono/*` lo llevan fijo en `App.jsx`. Un bono comprado como invitado quedaría huérfano en una sesión anónima que no se puede reabrir.
- **Talleres desde el panel**: `/admin-taller` (`AdminTallerForm.jsx`, usado también para editar desde el detalle de clase), páginas genéricas `/taller/:id` y `/reservar/:id`. Los de siempre se pasan al panel desde `/admin-migrar-talleres` (`src/migracion/migrarTalleres.js`, reversible por taller; las rutas antiguas redirigen con `RutaTaller`/`RutaCategoria`).
- **Categorías**: las cuatro de siempre viven en código (`src/categoriasDeSiempre.js`: `crear_piezas`, `pinta_decora`, `cursos_bonos`, `otros`) hasta que se migran a `categoriasTalleres` (panel `/admin-categorias` o `scripts/migrar-categorias.mjs`, idempotente y de un solo sentido). `src/categoriasTalleres.js` es la única puerta de acceso: úsala en vez de leer `categoriasTalleres` a mano. `cursos_bonos` no se puede borrar. Una categoría solo se borra si no tiene talleres (ocultos incluidos).
- **Header global** en `src/Header.jsx`, montado desde `AppLayout.jsx`. En staging `main.jsx` muestra una banda naranja "entorno de pruebas".

## Al cambiar cosas

- Si añades una ruta de reserva/pago para invitados, envuélvela con `AccesoCompra` y revisa `database.rules.json`.
- Si cambias `database.rules.json`, dilo en la PR: hay que desplegarlo a mano en cada proyecto.
- Al verificar en el navegador contra staging, las reservas de prueba que crees quedan en la base de datos de staging; no uses producción.
