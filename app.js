(() => {
  "use strict";

  const config = window.INVITATION_CONFIG || {};
  const openedKey = `${config.storageNamespace ? config.storageNamespace + ":" : ""}baby-invitation-opened`;
  const root = document.documentElement;
  const invitation = document.querySelector("#invitation");
  const entrance = document.querySelector("#entrance");
  const cover = document.querySelector("#cover");
  const bow = document.querySelector("#open-gift");
  const skip = document.querySelector("#skip-intro");
  const status = document.querySelector("#invitation-status");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const openingParticles = document.querySelector("#opening-particles");
  const photoParticles = document.querySelector("#photo-particles");
  let stage = "closed";
  let finishTimer;
  let particleTimer;
  let needsFocus = false;
  let lastColorInteraction = 0;

  cover.inert = true;
  cover.setAttribute("aria-hidden", "true");

  // Los nombres se insertan como texto: nunca como HTML.
  for (const parent of ["mom", "dad"]) {
    const name = config.names?.[parent];
    if (typeof name === "string") document.querySelector(`[data-parent="${parent}"]`).textContent = name;
  }
  for (const color of ["ivory", "pink", "blue", "ink"]) {
    if (config.colors?.[color]) root.style.setProperty(`--${color}`, config.colors[color]);
  }
  const photo = document.querySelector("#cover-photo");
  if (config.image) photo.src = config.image;
  document.querySelector('meta[name="theme-color"]').content = config.colors?.ivory || "#F7F4ED";

  function rememberOpened() {
    try { sessionStorage.setItem(openedKey, "yes"); } catch (_) { /* Estado en memoria si el navegador bloquea sessionStorage. */ }
  }

  function finishOpening() {
    window.clearTimeout(finishTimer);
    window.clearTimeout(particleTimer);
    stage = "cover";
    invitation.dataset.stage = stage;
    entrance.inert = true;
    entrance.setAttribute("aria-hidden", "true");
    cover.inert = false;
    cover.removeAttribute("aria-hidden");
    rememberOpened();
    status.textContent = "Tu invitación está abierta. ¿Niña o niño? Un pequeño secreto, una gran emoción.";
    if (needsFocus) document.querySelector("#cover-title").focus({ preventScroll: true });
  }

  function openInvitation({ instant = false, focus = true } = {}) {
    if (stage !== "closed") return;
    stage = "opening"; // Bloqueo sincrónico, antes de iniciar cualquier animación.
    needsFocus = focus;
    bow.disabled = true;
    skip.setAttribute("aria-disabled", "true");
    skip.tabIndex = -1;
    entrance.inert = true;
    status.textContent = "Abriendo tu invitación…";
    const brief = instant || reduceMotion.matches;
    invitation.classList.toggle("is-instant", brief);
    invitation.dataset.stage = stage;
    cover.classList.add("is-revealed");
    // El dibujo de la portada se superpone; se vuelve interactivo al terminar.
    if (!brief) {
      particleTimer = window.setTimeout(() => {
        const rect = openingParticles.getBoundingClientRect();
        burst(openingParticles, rect.width / 2, rect.height * .41, null, 28, true);
      }, 1080);
    }
    finishTimer = window.setTimeout(finishOpening, brief ? 180 : 2700);
  }

  function burst(container, x, y, color, count, opening = false) {
    if (reduceMotion.matches) return;
    const fragment = document.createDocumentFragment();
    const pink = config.colors?.pink || "#E6B6C4";
    const blue = config.colors?.blue || "#AACDDC";
    const travel = opening ? 155 : 65;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement("i");
      particle.className = `particle${i % 4 === 0 ? " particle--spark" : ""}`;
      const angle = opening ? Math.PI + Math.random() * Math.PI : Math.random() * Math.PI * 2;
      const distance = travel * (.35 + Math.random() * .65);
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty("--particle-color", color || (i % 2 ? pink : blue));
      particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * distance - (opening ? 25 : 10)}px`);
      particle.style.setProperty("--rotation", `${Math.random() * 230 - 115}deg`);
      particle.style.setProperty("--size", `${i % 4 === 0 ? 9 : 3 + Math.random() * 4}px`);
      particle.style.setProperty("--duration", `${opening ? 1300 : 850}ms`);
      particle.style.setProperty("--delay", `${Math.random() * 100}ms`);
      particle.addEventListener("animationend", () => particle.remove(), { once: true });
      fragment.appendChild(particle);
    }
    container.appendChild(fragment);
  }

  bow.addEventListener("click", () => openInvitation());
  skip.addEventListener("click", event => {
    event.preventDefault();
    openInvitation({ instant: true });
  });

  document.querySelectorAll(".color-half").forEach(half => {
    let glowTimer;
    half.addEventListener("click", event => {
      if (stage !== "cover") return;
      // Limita las partículas sin registrar elecciones ni votos.
      const now = performance.now();
      if (now - lastColorInteraction < 180) return;
      lastColorInteraction = now;
      const photoRect = photoParticles.getBoundingClientRect();
      const halfRect = half.getBoundingClientRect();
      const keyboard = event.detail === 0;
      const clientX = keyboard ? halfRect.left + halfRect.width / 2 : event.clientX;
      const clientY = keyboard ? halfRect.top + halfRect.height / 2 : event.clientY;
      half.style.setProperty("--glow-x", `${(clientX - halfRect.left) / halfRect.width * 100}%`);
      half.style.setProperty("--glow-y", `${(clientY - halfRect.top) / halfRect.height * 100}%`);
      half.classList.remove("is-glowing");
      // Reinicia sólo el efecto de este toque.
      void half.offsetWidth;
      half.classList.add("is-glowing");
      window.clearTimeout(glowTimer);
      glowTimer = window.setTimeout(() => half.classList.remove("is-glowing"), reduceMotion.matches ? 200 : 950);
      const color = config.colors?.[half.dataset.color] || (half.dataset.color === "pink" ? "#E6B6C4" : "#AACDDC");
      burst(photoParticles, clientX - photoRect.left, clientY - photoRect.top, color, 10);
    });
  });

  document.querySelector("#discover-more").addEventListener("click", event => {
    event.preventDefault();
    const target = document.getElementById(config.nextSectionId || "next-section");
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion.matches ? "instant" : "smooth", block: "start" });
    // El destino puede ser una sección añadida después y no tener tabindex.
    if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  });

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches && stage === "opening") {
      invitation.classList.add("is-instant");
      openingParticles.replaceChildren();
      finishOpening();
    }
  });

  // sessionStorage dura esta visita, incluyendo las recargas de la pestaña.
  if (root.dataset.restored === "true") {
    invitation.classList.add("is-instant");
    cover.classList.add("is-revealed");
    finishOpening();
  }
})();
