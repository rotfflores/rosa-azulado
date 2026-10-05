# ¿Niña o niño? — invitación interactiva

Abre `index.html` en tu navegador. Funciona sin instalar paquetes y sin compilar.

También puedes ejecutar `node preview.cjs` y visitar `http://localhost:4173` para usar una vista previa local.

## Personalizar

- **Nombres, foto y colores:** `config.js`. La fotografía original está en `assets/girl-pink-boy-blue.jpg`.
- **Diseño y tiempos:** `styles.css`. La apertura dura 2.7 segundos; el enlace para omitirla y la preferencia de movimiento reducido usan 180 ms.
- **Textos y estructura:** `index.html`.
- **Interacción:** `app.js`. No se registran votos ni se incluye un resultado de la revelación.

El estado abierto se conserva con `sessionStorage` durante la visita en esa pestaña. Para ver otra vez el regalo, abre la invitación en una pestaña nueva o borra únicamente la clave `baby-invitation-opened` del almacenamiento de sesión.

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
- “Seguir descubriendo” lleva al mensaje de los papás, aunque no se encienda la televisión. “¿Cuál es tu equipo?” mantiene su destino `#vote-section`, reservado para la futura votación.

`preload="metadata"` limita la precarga del reproductor; el navegador determina cuántos bytes necesita para leer esos metadatos. El servidor de vista previa soporta solicitudes por rangos y el tipo `video/mp4`.

Puedes comprobar la lógica de la televisión con `node tests/television.test.cjs`.

## Mensaje de los papás y fotografía entre nubes

- `parents.css` y `parents.js` contienen el diseño y las interacciones de esta sección, situada después de la televisión.
- Edita el título, el párrafo y la firma en `parentsMessage` dentro de `config.js`. Los tokens `{mom}` y `{dad}` usan los nombres de `names`.
- La foto actual (`assets/nuestra-fotografia.jpg`) es una imagen de muestra de Unsplash (Felipe Bustillo, licencia Unsplash), recortada a 4:5. Reemplázala por la de los papás con el mismo nombre o cambia `familyPhoto.src`; edita `alt` con una descripción accesible. Si `src` queda vacío se muestra un espacio reservado. `width` y `height` definen la proporción del marco; la imagen se conserva completa.
- Las ocho nubes admiten arrastre horizontal o vertical, toque, clic y los botones nativos con Enter o Espacio. Al apartar cinco, las otras se dispersan. “Ver fotografía” permite omitirlas desde el principio.
- Fuera de las nubes, la página se desplaza normalmente. “Seguir descubriendo” está disponible antes de completar la interacción.
- Una vez descubierta, la fotografía abre una vista ampliada con cierre visible, Escape y devolución del foco. Si aún falta la foto, la vista mantiene el espacio reservado. Abrirla pausa la televisión conservando su posición.
- El estado descubierto se conserva en esa pestaña mediante `baby-invitation-photo-revealed` en `sessionStorage`. Las animaciones respetan la preferencia de movimiento reducido.
- “¿Cuándo nos vemos?” y la continuación directa llevan a `#event-section`, configurable en `eventSectionId`. Esta ancla queda preparada para cuenta regresiva, fecha, hora y ubicación; aún no se añaden esos contenidos.

Comprueba los gestos, la restauración y la accesibilidad del modal con `node tests/parents.test.cjs`. El diseño también se verifica en navegador a 320 y 390 píxeles de ancho y en escritorio.
