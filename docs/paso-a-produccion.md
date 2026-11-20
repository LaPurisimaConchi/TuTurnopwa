# Paso a producción (staging → main)

Lista de lo que hay que hacer a mano cuando `staging` se fusione en `main`. Vercel despliega
el código solo; **lo demás no se hace solo**: reglas de la base de datos, cuentas admin,
Firebase Auth y datos. Proyecto de producción: `la-purisima-conchi` (pasa siempre `--project`).

Estado comprobado el 16-11-2026. Si pasa mucho tiempo, vuelve a revisar los puntos 1 y 2.

## 0. Confirmación de correo

Las cuentas nuevas con email y contraseña solo operan con el correo confirmado; las que ya existen,
no. Para distinguirlas, las existentes llevan `usuarios/{uid}/cuentaAnterior: true` (solo la escribe
el servidor: las reglas no dejan al navegador ponerla ni quitarla). Los invitados (sesión anónima)
no cambian: siguen comprando sin cuenta.

Dónde se exige: `database.rules.json` (crear reservas y grupos, leer grupos), `api/_cuentaActiva.js`
(`api/codigo-reserva.js`: tarjetas, canjes, bonos, pagos…) y la web (`src/utils/guardiaVerificacion.js`
cierra la sesión de una cuenta sin confirmar; `Login.jsx` la bloquea). Una cuenta sin confirmar solo
puede guardar su perfil y pedir que se le reenvíe el correo.

**Si se despliegan las reglas o el código sin marcar antes las cuentas existentes, todos los usuarios
actuales quedan bloqueados** (la web los desconecta y no pueden reservar). Por eso la migración va
primero y se repite justo antes de las reglas.

### Antes de fusionar
- [ ] Authentication → Configuración → **Dominios autorizados**: el dominio de producción
  (`app.lapurisimaconchi.com`). Sin él, el enlace del correo confirma igual pero no vuelve a `/login`.
- [ ] **Páginas de los enlaces**: los correos de confirmar el correo y de «¿Has olvidado tu contraseña?» los envía
  `api/_correoVerificacion.js` (Resend) y sus enlaces llevan a `/auth/accion` (`src/AccionCuenta.jsx`) en el mismo dominio
  desde el que se piden. No hace falta tocar la plantilla de Firebase. Solo si el servidor falla, el login cae al correo
  estándar de Firebase (en inglés) como respaldo.
- [ ] Variables de Vercel (Production): `RESEND_API_KEY`, `CORREO_REMITENTE` (dominio verificado en
  Resend) y `CORREO_URL_BASE` (logo y enlaces del correo). Sin ellas el correo de confirmación sale con
  la plantilla estándar de Firebase, en inglés y sin diseño.
- [ ] **Simulacro** de la migración (no escribe nada). Con `--hasta` = ahora mismo (fecha y hora ISO, en UTC):
  ```bash
  node scripts/marcar-cuentas-anteriores.mjs --project la-purisima-conchi --hasta <fecha ISO>
  ```
  Comprueba que «N con email creadas antes de…» coincide con las cuentas reales de clientes.
- [ ] **Aplicar** la migración (mismo comando con `--aplicar`).

### Justo antes de desplegar las reglas (paso 2.4)
- [ ] **Repetir la migración** con `--hasta` = ahora: las cuentas creadas entre la primera ejecución y
  este momento son reales y también deben quedar marcadas. Se puede repetir sin riesgo: no toca las ya
  marcadas ni nada más que `cuentaAnterior`. Las cuentas que se registren *después* de esta pasada ya
  son «nuevas» y tendrán que confirmar el correo.
- [ ] Si alguien se registró entre la pasada y las reglas y no debía confirmar, se arregla a mano
  poniendo `cuentaAnterior: true` en `usuarios/{uid}` desde la consola de Firebase (el panel no puede).

### Después de desplegar (comprobación)
- [ ] Entrar con una cuenta anterior sin confirmar el correo: entra y puede reservar.
- [ ] Registrar una cuenta nueva (alias `tucorreo+prueba@…`): sale «Confirma tu correo» y llega el
  correo con el diseño de La Purísima Conchi.
- [ ] Intentar entrar sin confirmar: el login bloquea y ofrece reenviar. El reenvío tiene límite de
  5 por hora y cuenta.
- [ ] Confirmar desde el enlace: vuelve a `/login` y entra.
- [ ] Invitado: reservar sin cuenta sigue funcionando; si luego crea cuenta desde la reserva, también
  debe confirmar el correo (conserva su uid, reservas y bonos).
- [ ] Borrar las cuentas de prueba (Authentication y `usuarios/{uid}`).

### Notas
- Un cliente nuevo sin confirmar que reserva desde otro dispositivo verá «Confirma tu correo»: es lo esperado.
- Los límites de reenvío (`limitesVerificacionEmail`) los limpia el cron semanal.
- Errores `auth/too-many-requests` al probar: es el límite de Firebase por IP; espera unos minutos o usa otra red.

### Volver atrás
Las reglas anteriores (guardadas en el paso 1) quitan la exigencia en la base de datos. Para quitarla
también en la API y la web hay que volver al despliegue anterior de Vercel. `cuentaAnterior` puede
quedarse en la base de datos sin efecto. Si solo hace falta dejar entrar a todos en una urgencia,
basta repetir la migración con `--hasta` en el futuro: marca todas las cuentas con email y desactiva
de hecho la confirmación.

## 1. Antes de fusionar

- [ ] **Proveedor Anónimo** activado en Firebase Console → Authentication → Sign-in method.
  La compra sin cuenta abre una sesión anónima; sin él, los invitados no pueden comprar.
- [ ] **Guardar las reglas actuales de producción**, para poder volver atrás. Guárdalas fuera
  del repo. `main` no tiene `database.rules.json`: son las que haya en la consola.
  ```bash
  npx firebase-tools database:get /.settings/rules --project la-purisima-conchi > ~/reglas-produccion-anteriores.json
  ```
- [ ] **Instancias de la base de datos**: `firebase.json` solo despliega en la instancia por defecto.
  Si salen más de una, decide antes en cuáles hay que desplegar.
  ```bash
  npx firebase-tools database:instances:list --project la-purisima-conchi
  ```
- [ ] **Variables de Vercel (Production)**. Ya existen `FIREBASE_ADMIN_*`, `FIREBASE_DATABASE_URL`,
  `REDSYS_SECRET_KEY`, `TPV_NOTIFY_QUERY`, `RESEND_API_KEY`, `CORREO_REMITENTE`,
  `CORREO_RESPONDER_A`, `CORREO_URL_BASE` y `CRON_SECRET`.
  - `TPV_URL`, `TPV_FUC`, `TPV_TERMINAL` y `APP_BASE_URL` no están en Production. `api/crear-sesion.js`
    usa entonces el TPV real y `https://app.lapurisimaconchi.com`: comprueba que el FUC y el terminal
    por defecto son los del comercio.
  - `CORREO_COPIA_ADMIN` es opcional.
  - El dominio de `CORREO_REMITENTE` tiene que estar verificado en Resend.
  - En `api/` hay 8 funciones (el límite de Vercel es 12).
- [ ] **`REDSYS_SECRET_KEY` de Production = la clave del TPV real** (la del comercio en el portal de
  Redsys, no la pública de pruebas). Desde la #25 el aviso del TPV (`api/notificacionTPV.js`) exige
  una firma válida: con otra clave, el pago se cobra pero no se confirma, y el pedido queda con
  `firmaValida: false` y `firmaError`. Esto vale en cuanto Vercel publique el código, antes de tocar
  las reglas.

## 2. Fusionar y desplegar las reglas (el mismo día, en este orden)

El código nuevo funciona con las reglas antiguas, pero al revés no: con el código viejo, las
reglas nuevas rompen la tarjeta regalo, los bonos, el recuento de plazas, el panel y el pago
(desde la #29 el navegador ya no puede crear `pedidosPendientes`: el pedido y su importe los crea
el servidor). Mientras no se desplieguen las reglas, la base de datos sigue con las reglas
antiguas, abiertas. No lo alargues.

Quien tenga la web abierta desde antes del despliegue verá «No se ha podido iniciar el pago» hasta
que recargue la página: mejor hacerlo en un momento con pocas compras.

1. [ ] Fusionar en `main` y esperar a que Vercel termine el despliegue de producción.
2. [ ] **Verificar el email de las dos cuentas admin** (`src/utils/administradores.js`). Sin email
   verificado, el panel enseña «Verifica tu email para entrar al panel»: hay que pulsar «Enviarme el
   correo de verificación», abrir el enlace y pulsar «Ya lo he verificado». Si no se hace, con las
   reglas nuevas el panel se queda sin permisos.
3. [ ] Probar las reglas (emulador, hace falta Java):
   ```bash
   npm run probar-reglas
   ```
4. [ ] Repetir la migración de cuentas (sección 0) y desplegar las reglas:
   ```bash
   npx firebase-tools deploy --only database --project la-purisima-conchi
   ```
5. [ ] Comprobación rápida en producción:
   - compra de invitado hasta la pantalla de Redsys: el importe que enseña Redsys es el del taller;
   - un pago real pequeño de punta a punta (por ejemplo, el taller más barato; luego se devuelve
     desde el portal de Redsys y se cancela la reserva en el panel). En la consola,
     `pedidosPendientes/{orderId}` tiene que tener `importeServidor: true`, `firmaValida: true` y
     `procesado: true`, y la reserva tiene que quedar `Confirmada`. Si sale `firmaValida: false`,
     revisa la `REDSYS_SECRET_KEY` (punto 1). Como mínimo, el pago simulado con una cuenta admin;
   - compra con cuenta;
   - canje de una tarjeta regalo y reserva con un bono (si hay alguno sin usar);
   - `/gestionar-reserva` con un código;
   - panel admin: reservas, usuarios, calendario y bloqueos.

**Volver atrás:** Firebase Console → Realtime Database → Reglas → pegar el contenido de
`~/reglas-produccion-anteriores.json` → Publicar. Si las reglas viejas vuelven y el código nuevo
sigue desplegado, la app funciona, pero con la protección de antes. Si lo que se deshace es el
código (volver al despliegue anterior en Vercel), hay que volver también a las reglas anteriores:
con las nuevas, el código viejo no puede cobrar.

## 3. Configuración y datos (después del despliegue)

- [ ] **Espacio y aforo** en `/admin-espacio`. Ahora el servidor rechaza las reservas que superan el
  aforo común a todos los talleres y grupos. Sin configurar, aplica 45 plazas por franja, 12 de
  torno, grupo mínimo de 3 y 15 minutos para pagar. Revisa los valores reales antes de abrir reservas.
- [ ] **Turnos de días abiertos**: un día sin horario se abre con una reserva del mínimo de personas del
  taller (`minPersonasGrupo` de su ficha) y ofrece los «turnos de días abiertos» de la ficha
  (`clases/{id}/turnos`). Revisa en `/admin-taller` que cada taller tenga turnos válidos (formato
  `17:30-20:30`; sin turnos, el taller no puede abrir días). En staging había dos talleres de torno con
  turnos como `viernes-tarde`/`otro-horario`: si en producción pasa lo mismo, abre y guarda la ficha
  (se recalculan con el horario semanal). Opcional: fija el valor por defecto en `/admin-espacio`
  («Turnos de días abiertos»). No hay reglas nuevas que desplegar.
- [ ] **Categorías** (opcional, de un solo sentido, se puede repetir). Hasta entonces, las cuatro de
  siempre salen del código.
  ```bash
  npm run migrar-categorias -- --project la-purisima-conchi --dry-run
  ```
  ```bash
  npm run migrar-categorias -- --project la-purisima-conchi
  ```
- [ ] **Talleres de siempre** en `/admin-migrar-talleres` (reversible por taller). Recomendado: las
  pantallas `Reserva*` de siempre no se han podido probar en staging, porque allí están todos migrados.
  Mientras no se migre, un taller de siempre se cobra con la ficha que tendría al migrarlo
  (`fichaParaCobrar`): si una pantalla antigua enseña otro precio, `ResumenPago` avisa y cobra el del
  servidor.
- [ ] **Cron `limpiar-invitados`** (`vercel.json`, domingos a las 4:00). En producción borrará las
  sesiones de invitado antiguas sin nada asociado, las reservas pendientes con la plaza caducada y
  los contadores de los límites de intentos con más de un día (`limitesCambioFecha`,
  `limitesTarjetaRegalo`, `limitesDisponibilidad`, `limitesVerificacionEmail`).
  Para ver antes cuánto borraría: `GET /api/limpiar-invitados?dry=1` con la cabecera
  `Authorization: Bearer <CRON_SECRET>`.
- [ ] **Cloud Functions antiguas de Redsys.** El repositorio ya no tiene `functions/` (una
  integración antigua sin terminar: `crearSesionTPV` y `notificacionTPV`), pero borrar el código no
  quita una función ya desplegada. Si esto lista alguna, bórrala desde la consola de Firebase:
  ```bash
  npx firebase-tools functions:list --project la-purisima-conchi
  ```
- [ ] **Que la web no se enseñe dentro de otra.** `vercel.json` solo deja incrustarla en
  `lapurisimaconchi.com` y sus subdominios (`frame-ancestors`). Si alguna otra web la muestra en un
  `iframe`, añade su dominio ahí.

**No hace falta migrar** reservas, usuarios, bonos ni tarjetas regalo:
- los códigos de reserva se crean al pedirlos (también con un número de pedido antiguo);
- las tarjetas antiguas sin índice de código se siguen encontrando;
- las reservas pendientes antiguas siguen sin contar para el aforo.

## PDF de tarjeta regalo gestionables
- [ ] **Las reglas no se despliegan solas con Vercel**: hay que publicarlas a mano en Firebase. Las nuevas
  (`plantillasTarjetaRegalo` y `plantillasTarjetaRegaloPdf`) van con el resto de reglas del paso a producción.
  Sin ellas, el panel de PDF da «No se pudo guardar el PDF» (`permission_denied`) y la descarga usa los
  tres PDF originales.
- [ ] Ojo: `.firebaserc` apunta por defecto a **producción** (`la-purisima-conchi`). En staging se despliega
  siempre con el proyecto explícito: `npx firebase-tools deploy --only database --project la-purisima-conchi-staging`.
  En producción, solo cuando toque y tras guardar las reglas actuales (ver más arriba).
- [ ] `npm run probar-reglas` cubre las rutas nuevas (0 fallos antes de desplegar).
- [ ] Variables de Vercel (Production): `RESEND_API_KEY` y `CORREO_URL_BASE` (sin esta última el correo no
  lleva los botones de PDF). Sin PDF gestionado, el correo enlaza la tarjeta clásica de `public/`.
- [ ] Tras desplegar: subir, sustituir y borrar un PDF en `/admin-tarjetas-regalo` (cuenta admin con correo
  verificado), comprar una tarjeta de prueba y comprobar que el correo trae los botones de PDF y que descargan.
