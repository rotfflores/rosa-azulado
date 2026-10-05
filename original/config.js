// Personaliza la invitación aquí. No hay ningún dato sobre el sexo del bebé.
window.INVITATION_CONFIG = {
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
  parentsMessage: {
    title: "Nuestro amor tiene una nueva sorpresa",
    text: "Una personita muy especial está por llegar a nuestras vidas. Todavía guardamos un pequeño secreto, y queremos compartir contigo la emoción de descubrirlo. ¡Acompáñanos en este momento que recordaremos siempre!",
    // {mom} y {dad} toman los nombres de arriba; también puedes escribir una firma completa.
    signature: "Con amor, {mom} y {dad}.",
  },
  familyPhoto: {
    src: "assets/nuestra-fotografia.jpg", // Foto de muestra (Unsplash, Felipe Bustillo). Reemplázala por la de los papás.
    alt: "Fotografía de {mom} y {dad}, futuros papás.",
    width: 960,
    height: 1200,
  },
  eventSectionId: "event-section",
  // Si más adelante agregas música, usa aquí el ID de su elemento <audio>.
  backgroundMusicId: "background-music",
};
