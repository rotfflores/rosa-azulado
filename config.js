// Plantilla predeterminada: personaliza la invitación aquí. No se incluye el sexo del bebé.
window.INVITATION_CONFIG = {
  storageNamespace: "plantilla-default",
  names: {
    mom: "Mariana Robles",
    dad: "Andrés Salazar",
  },
  image: "assets/girl-pink-boy-blue.jpg",
  colors: {
    ivory: "#F7F4ED", // Color de la barra del navegador; el fondo rosa y azul está en styles.css
    pink: "#E6B6C4",
    blue: "#AACDDC",
    ink: "#514B48",
  },
  // Video disponible desde el inicio de la visita; la TV no revela el resultado.
  video: {
    src: "assets/ellos-tambien-quieren-saber.mp4",
    width: 624,
    height: 352,
    muted: false,
  },
  nextSectionId: "television-section",
  parentsSectionId: "parents-message",
  voteSectionId: "vote-section",
  teamSelection: {
    eventId: "plantilla-default-revelacion", // Usa un identificador único y estable para cada evento.
    nextSectionId: "baby-predictions",
  },
  capsule: {
    // Orientación opcional; fechas de calendario YYYY-MM-DD. Vacías = sin rango.
    arrivalRange: { earliest: "", latest: "" },
    nextSectionId: "attendance-section",
  },
  attendance: {
    maxGuests: 4, // Máximo por invitación, contando al invitado. Entero entre 1 y 100.
    whatsappNumber: "", // Número internacional con código de país; vacío = sin botón.
    saveResponse: null, // Función de registro real; consulta el contrato en README.md.
    nextSectionId: "baby-wishes", // Futuro móvil de estrellas con deseos.
  },
  parentsMessage: {
    title: "Nuestro amor tiene una nueva sorpresa",
    text: "Una personita muy especial está por llegar a nuestras vidas. Todavía guardamos un pequeño secreto, y queremos compartir contigo la emoción de descubrirlo. ¡Acompáñanos en este momento que recordaremos siempre!",
    // {mom} y {dad} toman los nombres de arriba; también puedes escribir una firma completa.
    signature: "Con amor, {mom} y {dad}.",
  },
  familyPhoto: {
    src: "assets/nuestra-fotografia.jpg", // Foto de muestra (Unsplash). Reemplázala por la de los papás.
    alt: "Fotografía de {mom} y {dad}, futuros papás.",
    width: 960,
    height: 1200,
  },
  eventSectionId: "event-section",
  // Datos de ejemplo de la plantilla: escribe las fechas ISO con Z o un desfase explícito (±HH:MM).
  // La zona IANA define cómo se presenta la fecha y cuándo termina el día del evento.
  event: {
    name: "Revelación de bebé",
    timeZone: "America/Mexico_City",
    start: "2026-11-21T16:00:00-06:00",
    end: "2026-11-21T20:00:00-06:00",
    venue: "Centro Cultural Casa Lamm",
    address: "Álvaro Obregón 99, Roma Norte, Cuauhtémoc, 06700 Ciudad de México, CDMX",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Centro+Cultural+Casa+Lamm%2C+%C3%81lvaro+Obreg%C3%B3n+99%2C+Roma+Norte%2C+Ciudad+de+M%C3%A9xico", // URL HTTPS de Google Maps; también se puede construir a partir de la dirección.
    note: "Llega a las 4:00 p. m. en punto: a las 5:00 descubriremos juntos el gran secreto. Habrá pastel, juegos y muchas sorpresas. Estacionamiento con valet en la entrada.",
    description: "Acompáñanos a descubrir un pequeño secreto y compartir una gran emoción.",
    dressCode: {
      enabled: true,
      text: "Si crees que será niña, trae un detalle rosa. Si crees que será niño, uno azul. ¡También puedes venir con ambos!",
    },
  },
  // Si más adelante agregas música, usa aquí el ID de su elemento <audio>.
  backgroundMusicId: "background-music",
};
