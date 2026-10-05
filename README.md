# ¿Niña o niño? — plantilla predeterminada

La raíz del proyecto contiene la plantilla predeterminada de la invitación, con el diseño y todas las secciones implementadas. Los nombres, la fotografía y los datos del evento se personalizan en `config.js`. La versión anterior se conserva completa en `original/`, con sus archivos y recursos independientes.

Abre `index.html` en tu navegador. Funciona sin instalar paquetes y sin compilar.

Para “Open with Live Server”, abre el `index.html` de la raíz del proyecto. Ese archivo contiene las modificaciones actuales, incluida la cápsula de predicciones. `original/index.html` corresponde a la versión anterior.

También puedes ejecutar `node preview.cjs` y visitar `http://127.0.0.1:4174` para usar una vista previa local. Se puede cambiar el puerto mediante `PORT`.

## Personalizar

- **Nombres, foto y colores:** `config.js`. La fotografía original está en `assets/girl-pink-boy-blue.jpg`.
- **Diseño y tiempos:** `styles.css`. La apertura dura 2.7 segundos; el enlace para omitirla y la preferencia de movimiento reducido usan 180 ms.
- **Textos y estructura:** `index.html`.
- **Entrada y portada:** `app.js`. La elección de equipo posterior se conserva sólo en el navegador y no incluye el resultado de la revelación.

El estado abierto se conserva con `sessionStorage` durante la visita en esa pestaña. Para ver otra vez el regalo, abre la invitación en una pestaña nueva o borra únicamente la clave `plantilla-default:baby-invitation-opened` del almacenamiento de sesión. `storageNamespace` separa los estados de la plantilla y del original cuando se sirven en el mismo dominio; cambia este valor para cada invitación que derives de ella.

## Continuar la invitación

“Descubrir más” lleva a `#television-section`. El regalo, su animación y la portada conservan su funcionamiento.

La imagen mantiene su proporción y se muestra completa en todos los tamaños. El moño y ambas mitades de la portada son botones nativos que también funcionan con teclado. Los elementos ocultos no reciben foco.

## Televisión interactiva

- `television.css` y `television.js` contienen únicamente la nueva sección.
- Cambia `video.src` en `config.js` para sustituir el video. `width` y `height` reservan su proporción antes de recibir los metadatos; la proporción real se actualiza automáticamente.
- El archivo actual es `assets/ellos-tambien-quieren-saber.mp4`, copiado del video de WhatsApp indicado por el usuario: 624 × 352, aproximadamente 99 segundos.
- Todos los botones (encender, reproducir/pausar, sonido, volver a ver y ampliar) están en el panel del propio televisor: a un lado de la pantalla en computadora y debajo de ella en celular.
- La TV comienza apagada. El encendido usa 500 ms de interferencia suave (120 ms con movimiento reducido) y solicita la reproducción; si el navegador la bloquea, aparece un botón en la pantalla.
- Apagar conserva la posición. Al terminar queda el último fotograma y aparece la llamada a la futura votación. Cambiar de pestaña o abandonar la sección pausa el video y volver no lo reproduce automáticamente.
- Ampliar usa pantalla completa si está disponible y una vista modal dentro de la página como alternativa, con controles nativos, Escape y devolución del foco.
- Si se añade música, utiliza `backgroundMusicId` o un `<audio data-background-music>`. Sólo se retoma música que ya se estaba reproduciendo.
- “Seguir descubriendo” lleva al mensaje de los papás, aunque no se encienda la televisión. “¿Cuál es tu equipo?” lleva a la elección de equipo en `#vote-section`.

`preload="metadata"` limita la precarga del reproductor; el navegador determina cuántos bytes necesita para leer esos metadatos. El servidor de vista previa soporta solicitudes por rangos y el tipo `video/mp4`.

Puedes comprobar la lógica de la televisión con `node tests/television.test.cjs`.

## Mensaje de los papás y fotografía entre nubes

- `parents.css` y `parents.js` contienen el diseño y las interacciones de esta sección, situada después de la televisión.
- Edita el título, el párrafo y la firma en `parentsMessage` dentro de `config.js`. Los tokens `{mom}` y `{dad}` usan los nombres de `names`.
- Cambia `familyPhoto.src` por la fotografía de los papás o del ultrasonido y edita `alt` con una descripción accesible. Si queda vacío, se muestra un espacio reservado. `width` y `height` definen la proporción del marco; la imagen se conserva completa.
- Las ocho nubes admiten arrastre horizontal o vertical, toque, clic y los botones nativos con Enter o Espacio. Al apartar cinco, las otras se dispersan. “Ver fotografía” permite omitirlas desde el principio.
- Fuera de las nubes, la página se desplaza normalmente. “Seguir descubriendo” está disponible antes de completar la interacción.
- Una vez descubierta, la fotografía abre una vista ampliada con cierre visible, Escape y devolución del foco. Si aún falta la foto, la vista mantiene el espacio reservado. Abrirla pausa la televisión conservando su posición.
- El estado descubierto se conserva en esa pestaña mediante `plantilla-default:baby-invitation-photo-revealed` en `sessionStorage`. Las animaciones respetan la preferencia de movimiento reducido.
- “¿Cuándo nos vemos?” y la continuación directa llevan al calendario de `#event-section`, configurable en `eventSectionId`.

Comprueba los gestos, la restauración y la accesibilidad del modal con `node tests/parents.test.cjs`. El diseño también se verifica en navegador a 320 y 390 píxeles de ancho y en escritorio.

## Cuenta regresiva y datos del evento

**Datos de ejemplo de la plantilla:** `config.js` trae nombres (Mariana Robles y Andrés Salazar), la foto de muestra `assets/nuestra-fotografia.jpg` y un evento inventado: sábado 21 de noviembre de 2026, de 4:00 a 8:00 p. m. (hora de la Ciudad de México), en el Centro Cultural Casa Lamm, Álvaro Obregón 99, Roma Norte, CDMX. “Cómo llegar” abre esa ubicación en Google Maps. Reemplaza estos valores al personalizar cada invitación.

`event.css`, `event-core.js` y `event.js` contienen únicamente esta sección. `event` en `config.js` centraliza nombre, zona, inicio, final, lugar, dirección, Maps, nota, descripción y vestimenta. Puedes vaciar los datos para mostrar los marcadores pendientes.

- `start` y `end` requieren fecha y hora ISO con desfase explícito (`Z` o `±HH:MM`). `timeZone` requiere una zona IANA. El desfase fija el instante; la zona determina la fecha, la hora presentada y el final del día del evento. Verifica que coincidan con la hora que deseas para el lugar.
- Ejemplo **ficticio sólo de formato**: `2027-10-20T17:30:00-06:00` y `2027-10-20T20:00:00-06:00`, con `America/Mexico_City`. No están asignados a la invitación.
- Sin inicio o zona válidos se muestra “Pronto tendremos fecha”. Al llegar al inicio el contador se detiene en cero; hasta la medianoche de esa zona dice “¡Hoy compartimos la gran sorpresa!”, después “Un día para recordar”. Sólo se anima el número que cambia. El contador no anuncia cada segundo.
- La fecha es legible antes de abrir la hoja. La pestaña y “Ver detalles” abren y cierran con botones nativos, Enter y Espacio. No es necesario abrirlos para continuar.
- `mapsUrl` admite enlaces HTTPS de Google Maps, incluidos los enlaces cortos. Si se deja vacío y hay dirección, se crea un enlace de búsqueda de Google Maps. Sin ubicación el enlace queda oculto. El pin muestra la dirección como texto seleccionable.
- “Guardar la fecha” se habilita sólo con inicio y final válidos (final posterior al inicio), nombre, ubicación y descripción. La nota es opcional. Descarga un `.ics` con tiempos UTC explícitos, que conservan el mismo instante al importarlos, texto escapado y líneas plegadas según [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545).
- `dressCode.enabled: true` muestra el bloque opcional, cuyo texto se edita en `dressCode.text`.
- “Hacer mi predicción” y el botón de la TV llevan a `#vote-section`, donde se elige equipo arrastrando un globo o usando los botones.

Prueba fechas, cambios de horario, los estados del contador, la exportación y los controles con `node tests/event.test.cjs`. `node tests/build-event-fixture.cjs` crea una página temporal en `tests/event-fixture.html` con datos marcados como ficticios para comprobar la descarga en navegador; no cambia `config.js`. Elimina únicamente ese HTML generado al terminar.

## Elegir equipo

- `team.css`, `team-core.js` y `team.js` contienen esta sección, situada después del calendario. Los globos y la caja son SVG; las etiquetas identifican ambos equipos además del color.
- Animaciones: al pasar el cursor el globo se eleva; al elegirlo, su etiqueta se llena del color del equipo, el globo rebota y flota más y el otro se atenúa. La zona de la caja late para invitar a soltarlo y la caja se mueve cuando el globo está encima. Al confirmar, la caja da un salto, el confeti (con corazones y destellos) sale hacia arriba antes de caer y la tarjeta llega con rebote. Todo se desactiva con movimiento reducido.
- Una nota “Tu globo va aquí” con flecha señala la caja mientras se elige (la abertura de la caja no muestra óvalo ni texto; la zona de destino es invisible y sólo se ilumina el brillo de la caja); toma el color del globo seleccionado y desaparece al confirmar.
- Tras confirmar cae confeti continuo del color elegido (con corazones), detrás del contenido. Se pausa fuera de la vista o en otra pestaña, se detiene al cambiar la elección y no aparece con movimiento reducido.
- Arrastra con mouse o dedo hasta la caja. Soltar fuera o cancelar devuelve el globo. También puedes tocar un globo, usar Enter/Espacio o las flechas y pulsar “Confirmar mi equipo”. La celebración dura 1.5 segundos; con movimiento reducido aparece directamente la tarjeta.
- Cambia `teamSelection.eventId` en `config.js` por un identificador único y estable para cada evento. La selección se guarda en `localStorage` bajo `baby-invitation:team:<identificador codificado>`. Recargar recupera la tarjeta sin confeti ni cambios de foco. Si el navegador bloquea el almacenamiento, la elección permanece en memoria mientras la página esté abierta.
- “Cambiar mi elección” permite elegir nuevamente. “Todavía no me decido” deja continuar sin guardar una selección.
- `window.InvitationTeam.getSelection()` entrega `{version, eventId, team, confirmedAt}` o `null`. `team` vale `girl` o `boy`; `confirmedAt` es una fecha ISO. El evento `invitation:team-changed` entrega ese registro en `detail`, o `null` al cambiar. Estos datos quedan preparados para la cápsula de predicciones y el pase personalizado.
- `registerChoice(record)` en `team-core.js` es un punto independiente para el futuro registro en una base de datos. También puede sustituirse mediante `window.InvitationTeam.registerChoice`. Actualmente no envía datos, no cuenta votos y no contiene el resultado del bebé.
- `teamSelection.nextSectionId` configura la continuación. `#baby-predictions` lleva a la cápsula; ambos enlaces permiten llegar con o sin equipo elegido.

Comprueba gestos de mouse/toque, cancelación, selección por teclado, celebración, cambio, recuperación por evento, almacenamiento bloqueado y continuación con `node tests/team.test.cjs`.

## Cápsula de predicciones

- `capsule.css`, `capsule-core.js` y `capsule.js` contienen esta sección, situada después de elegir equipo. Las tres tarjetas conservan sus respuestas al avanzar, retroceder y editar. “Omitir pregunta” vacía sólo la tarjeta actual; el resumen muestra “Sin predicción” para las respuestas pendientes.
- El nombre propuesto admite 100 caracteres, con contador visible. La fecha utiliza `YYYY-MM-DD` y se presenta con zona UTC para conservar el día elegido. `capsule.arrivalRange.earliest` y `.latest` en `config.js` permiten mostrar una orientación de los anfitriones; son opcionales y no impiden elegir otra fecha.
- Sin respuestas se puede continuar, y no se guarda una cápsula vacía. El equipo y la firma son opcionales. Editar un equipo actualiza únicamente ese dato, incluso mientras se está escribiendo una propuesta de nombre.
- “Guardar mi cápsula” guarda los datos antes de la secuencia de 1.5 segundos para conservarlos si se cierra la página durante la animación. Con movimiento reducido se muestra directamente el cofre cerrado. Abrirlo permite consultar, editar y volver a guardar. El borrado solicita confirmación dentro de la sección.
- Se usa el mismo `teamSelection.eventId` que en los globos. El registro está en `localStorage`, bajo `baby-invitation:capsule:<identificador codificado>`. Recargar recupera la última cápsula guardada sin repetir la animación ni cambiar el foco. Las ediciones pendientes permanecen en memoria; pulsa “Guardar mi cápsula” para conservarlas al recargar.
- Si el almacenamiento falla, los datos quedan en memoria y se informa que no permanecerán al cerrar la página. Los textos del invitado se insertan con `textContent` o `.value`, sin interpretar HTML. No se envía información a los papás ni a servicios externos.
- `window.InvitationCapsule.getCapsule()` devuelve `{version, eventId, team, answers, guestName, savedAt}` o `null`. `answers` contiene `resemblance` (`mom`, `dad`, `both`, `own` o `null`), `name`, `arrivalDate` y `arrivalUndecided`. `window.InvitationCapsule.getGuestName()` prepara el nombre para la asistencia. El evento `invitation:capsule-changed` expone el registro en `detail` y entrega `null` al borrar.
- `registerCapsule(record)` es una función separada en `capsule-core.js`, reemplazable también en `window.InvitationCapsule.registerCapsule`, para una futura base de datos. Actualmente no hace solicitudes de red. Un fallo de esa futura función no bloquea el guardado local.
- `capsule.nextSectionId` configura el botón “Confirmar mi asistencia”. `#attendance-section` lleva al sobre, al formulario y al pase personalizado. La continuación permanece visible sin completar las tarjetas.

Ejecuta `node tests/capsule.test.cjs` para comprobar navegación, omisiones, límites, fechas, texto seguro, edición, guardado, recuperación por evento, sincronización del equipo, borrado, memoria y movimiento reducido. La revisión en navegador incluye campos y navegación con poca altura disponible, 320 y 390 píxeles de ancho y escritorio.

- Pulido visual de la cápsula: barra de progreso por segmentos, textos más legibles, halo rosa y azul con destellos detrás del cofre. Animaciones: cada tarjeta entra deslizándose, la opción elegida rebota, el sello "Mi predicción" cae con un golpe, el halo se expande al guardar y el cofre cerrado flota con su etiqueta. Todo se desactiva con movimiento reducido.

## Asistencia y pase de recuerdo

La sección está después de la cápsula en el `index.html` raíz. `attendance.css` dibuja el sobre y el papel, `attendance.js` controla el formulario, `attendance-core.js` separa validación, almacenamiento y registro, y `pass.js` dibuja y exporta el recuerdo como PNG. No se modifica `original/`.

Personaliza `attendance` en `config.js`:

- `maxGuests`: máximo de asistentes **incluyendo al invitado**; admite un entero de 1 a 100 y usa 4 si la configuración es inválida. El selector sólo presenta cantidades dentro del límite.
- `whatsappNumber`: número completo con código de país; actualmente vacío. El botón sólo aparece con un número válido y prepara nombre, respuesta y asistentes. Abrir WhatsApp no confirma ni demuestra el envío.
- `saveResponse`: actualmente `null`. Se usa guardado local con el aviso de envío pendiente. Para una conexión real, asigna una función asíncrona que registre mediante **upsert por `eventId` + `responseId`** y respete `idempotencyKey`. No agregues credenciales privadas al navegador.
- La invitación termina en esta sección: se quitó “¿Le dejamos un deseo al bebé?” y su ancla. `nextSectionId` sólo se usa si en el futuro se vuelve a agregar un enlace `#attendance-wishes`.

El registro tiene `{version, eventId, responseId, revision, name, response, guests, note, team, delivery, updatedAt}`. `response` es `yes` o `no`; en una negativa, `guests` es 0. El identificador interno conserva la identidad en las ediciones; cada modificación de nombre, respuesta, cantidad o nota crea una revisión. Un reintento utiliza la misma clave `${responseId}:${revision}`. El servidor debe devolver **después de guardar**:

```js
{ ok: true, confirmed: true, eventId, responseId, revision }
```

Únicamente esa confirmación coincidente permite mostrar “¡Tu asistencia está confirmada!” y “Asistencia confirmada” en el pase. Un error conserva el formulario y permite reintentar. Guardar nuevamente una respuesta confirmada sin cambios no vuelve a registrarla. `window.InvitationAttendance.registerResponse` expone la función independiente; `getResponse()` devuelve una copia del registro. El evento `invitation:attendance-changed` entrega el registro en `detail`.

El guardado local usa el mismo `teamSelection.eventId`: `baby-invitation:attendance:<identificador codificado>` y una clave de identidad con sufijo `:identity`. Se recupera al recargar. Si el almacenamiento está bloqueado, funciona en memoria con un aviso de que los datos no permanecerán al cerrar la página. Ninguno de esos estados afirma que los papás recibieron una respuesta.

`window.InvitationCapsule.setGuestName(nombre, {source})` sincroniza la firma compartida sin modificar las respuestas de las tarjetas. `invitation:guest-name-changed` anuncia el nombre y el origen; el pase también escucha el equipo actual. Los cambios aún sin guardar se muestran como pendientes, incluso si una versión anterior había sido confirmada por el servidor. Todo texto escrito se trata como texto, incluidos nombres con signos de HTML.

El recuerdo incluye nombre, cantidad, equipo o “Voy por la sorpresa”, nombres de los papás y los datos configurados del evento con su zona horaria. Si faltan datos, usa “Fecha por confirmar”, “Hora por confirmar” y “Lugar por confirmar”. El lienzo visible es el mismo que se exporta: 1080 píxeles de ancho, altura adaptable al texto, fuentes locales listas antes de dibujar, fondo de papel y transparencia exterior. `mi-pase.png` incluye sólo el pase, sin controles. Es un recuerdo; no hay QR, códigos ni validación de acceso. La negativa muestra el agradecimiento y permite continuar sin generar un pase.

Prueba con `node tests/attendance.test.cjs`: validación y límites, recepción real simulada, errores y reintentos idempotentes, edición, recuperación, WhatsApp sin confirmación, nombre compartido, cambio de equipo, almacenamiento bloqueado, movimiento reducido, fuentes y exportación PNG. `node tests/capsule.test.cjs` verifica que la sincronización conserve las predicciones; `node tests/television.test.cjs` comprueba que la ampliación retire también esta sección del foco. La revisión visual incluye teclado, 320 y 390 píxeles de ancho, poca altura y escritorio.

**Diseño del pase (actualizado):** el pase toma el color del equipo elegido (rosa para niña, azul para niño, mezcla rosa y azul si aún no elige), con su globo, confeti fijo y un panel tipo boleto con muescas. Incluye el resumen de todo lo elegido: nombre, equipo, las corazonadas guardadas en la cápsula (a quién se parecerá, nombre propuesto y fecha estimada; sólo las respondidas), asistentes, estado, papás y datos del evento. Se vuelve a dibujar si cambia el equipo o se guarda la cápsula. En la sección, el botón principal y los acentos usan el color del equipo; el sobre flota mientras está cerrado y se oculta al mostrar el pase.
