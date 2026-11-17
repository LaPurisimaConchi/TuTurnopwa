# Paso a producción (staging → main)

Lista de lo que hay que hacer a mano cuando `staging` se fusione en `main`. Vercel despliega
el código solo; **lo demás no se hace solo**: reglas de la base de datos, cuentas admin,
Firebase Auth y datos. Proyecto de producción: `la-purisima-conchi` (pasa siempre `--project`).

Estado comprobado el 16-11-2026. Si pasa mucho tiempo, vuelve a revisar los puntos 1 y 2.

## 0. Confirmación de correo (hacerlo ANTES de fusionar y de desplegar reglas)

Las cuentas nuevas con email y contraseña solo operan con el correo confirmado; las existentes no.
Para distinguirlas, las existentes llevan `usuarios/{uid}/cuentaAnterior: true` (solo lo escribe el
servidor). **Si fusionas sin marcarlas, todos los usuarios actuales quedan bloqueados** (la web los
desconecta y las reglas les niegan reservar).

- [ ] Marcar las cuentas existentes (primero sin `--aplicar` para ver cuántas son; `--hasta` = momento justo antes de fusionar):
  ```bash
  FIREBASE_ADMIN_PROJECT_ID=… FIREBASE_ADMIN_CLIENT_EMAIL=… FIREBASE_ADMIN_PRIVATE_KEY=… FIREBASE_DATABASE_URL=… \
    node scripts/marcar-cuentas-anteriores.mjs --hasta <fecha ISO> --aplicar
  ```
- [ ] Authentication → Configuración → Dominios autorizados: el dominio de producción (para que el enlace del correo vuelva a `/login`).
- [ ] `RESEND_API_KEY` y `CORREO_REMITENTE` en Production (el correo de confirmación usa los mismos que el de reserva).
- [ ] Repetir el script justo antes de fusionar si se han registrado cuentas desde entonces (se puede repetir sin riesgo).

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
4. [ ] Desplegar las reglas:
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
  `limitesTarjetaRegalo`, `limitesDisponibilidad`).
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
