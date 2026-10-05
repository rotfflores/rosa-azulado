(() => {
  "use strict";
  const config = window.INVITATION_CONFIG || {};
  const message = config.parentsMessage || {};
  const photoConfig = config.familyPhoto || {};
  const section = document.querySelector("#parents-message");
  const frame = document.querySelector("#family-photo-frame");
  const layer = document.querySelector("#cloud-layer");
  const clouds = [...document.querySelectorAll(".photo-cloud")];
  const image = document.querySelector("#family-photo-image");
  const placeholder = document.querySelector("#family-photo-placeholder");
  const opener = document.querySelector("#family-photo-opener");
  const direct = document.querySelector("#view-family-photo");
  const continuation = document.querySelector("#parents-continue");
  const status = document.querySelector("#family-photo-status");
  const outcome = document.querySelector("#family-photo-outcome");
  const dialog = document.querySelector("#family-photo-dialog");
  const largeImage = document.querySelector("#family-photo-large");
  const modalPlaceholder = document.querySelector("#family-photo-modal-placeholder");
  const closeButton = document.querySelector("#close-family-photo");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const storageKey = `${config.storageNamespace ? config.storageNamespace + ":" : ""}baby-invitation-photo-revealed`;
  let removed = 0, revealing = false, revealed = false, photoLoaded = false;
  let activePointer = null, revealTimer, focusAfterReveal = false;
  let modalOpen = false, openTrigger;
  const ignoreClicksUntil = new WeakMap();
  const previousInert = new Map();

  function personalize(text) {
    return String(text).split("{mom}").join(config.names?.mom || "[Nombre de mamá]").split("{dad}").join(config.names?.dad || "[Nombre de papá]");
  }
  if (typeof message.title === "string") document.querySelector("#parents-title").textContent = message.title;
  if (typeof message.text === "string") document.querySelector("#parents-copy").textContent = message.text;
  document.querySelector("#parents-signature").textContent = personalize(message.signature || "Con amor, {mom} y {dad}.");
  image.alt = personalize(photoConfig.alt || "Fotografía de los futuros papás o del ultrasonido.");
  largeImage.alt = image.alt;
  if (Number(photoConfig.width) > 0 && Number(photoConfig.height) > 0) {
    frame.style.setProperty("--family-photo-ratio", `${Number(photoConfig.width)} / ${Number(photoConfig.height)}`);
    image.width = Number(photoConfig.width);
    image.height = Number(photoConfig.height);
  }

  function syncModalPhoto() {
    largeImage.hidden = !photoLoaded;
    modalPlaceholder.hidden = photoLoaded;
    if (photoLoaded) { largeImage.src = image.src; largeImage.alt = image.alt; }
  }
  image.addEventListener("load", () => {
    photoLoaded = true;
    image.hidden = false;
    placeholder.hidden = true;
    opener.setAttribute("aria-label", "Ampliar fotografía");
    if (modalOpen) syncModalPhoto();
  });
  image.addEventListener("error", () => {
    photoLoaded = false;
    image.hidden = true;
    placeholder.hidden = false;
    opener.setAttribute("aria-label", "Ampliar espacio reservado para nuestra fotografía");
    if (modalOpen) syncModalPhoto();
  });
  if (typeof photoConfig.src === "string" && photoConfig.src.trim()) {
    // El espacio reservado la cubre hasta cargar. Mantenerla en el diseño permite la carga diferida.
    image.hidden = false;
    image.src = photoConfig.src;
  }

  function finishReveal({ announce = true, focus = focusAfterReveal } = {}) {
    window.clearTimeout(revealTimer);
    revealing = false;
    revealed = true;
    removed = clouds.length;
    layer.hidden = true;
    clouds.forEach(cloud => { cloud.disabled = true; });
    frame.dataset.revealed = "true";
    opener.disabled = false;
    direct.hidden = true;
    continuation.hidden = true;
    document.querySelector("#cloud-hint").hidden = true;
    outcome.hidden = false;
    try { sessionStorage.setItem(storageKey, "yes"); } catch (_) { /* Conserva el estado en memoria si el almacenamiento está bloqueado. */ }
    if (announce) status.textContent = `${photoLoaded ? "Fotografía descubierta." : "Espacio para la fotografía descubierto."} La aventura más bonita apenas comienza.`;
    if (focus) opener.focus({ preventScroll: true });
  }

  function markCloudRemoved(cloud, dx = 0, dy = 0, delay = 0) {
    if (cloud.disabled) return false;
    cloud.disabled = true;
    cloud.classList.remove("is-dragging");
    cloud.classList.add("is-clearing");
    const direction = dx ? Math.sign(dx) : Number(cloud.dataset.cloud) % 2 ? -1 : 1;
    const travel = frame.getBoundingClientRect().width * .65;
    cloud.style.setProperty("--leave-x", `${dx + direction * travel}px`);
    cloud.style.setProperty("--leave-y", `${dy - 65}px`);
    cloud.style.setProperty("--leave-angle", `${direction * 13}deg`);
    cloud.style.setProperty("--cloud-delay", `${delay}ms`);
    removed++;
    layer.style.setProperty("--cloud-mist-opacity", String(Math.max(0, 1 - removed * .5)));
    return true;
  }

  function finishPointer(event, cancel = false) {
    if (!activePointer || event.pointerId !== activePointer.id) return;
    const pointer = activePointer;
    activePointer = null;
    try { if (pointer.cloud.hasPointerCapture?.(pointer.id)) pointer.cloud.releasePointerCapture(pointer.id); } catch (_) { /* Un pointercancel puede liberar la captura antes. */ }
    pointer.cloud.classList.remove("is-dragging");
    const dx = Number.isFinite(event.clientX) ? event.clientX - pointer.x : pointer.dx;
    const dy = Number.isFinite(event.clientY) ? event.clientY - pointer.y : pointer.dy;
    const distance = Math.hypot(dx, dy);
    if (!cancel) ignoreClicksUntil.set(pointer.cloud, performance.now() + 450);
    if (!cancel && (distance < 8 || distance >= pointer.threshold)) removeCloud(pointer.cloud, dx, dy);
    else {
      pointer.cloud.style.setProperty("--drag-x", "0px");
      pointer.cloud.style.setProperty("--drag-y", "0px");
    }
  }

  function revealAll({ focus = false, instant = false } = {}) {
    if (revealed) return;
    focusAfterReveal ||= focus || document.activeElement === direct;
    if (activePointer) finishPointer({ pointerId: activePointer.id }, true);
    if (revealing) {
      if (instant || motion.matches) finishReveal();
      return;
    }
    revealing = true;
    let index = 0;
    clouds.forEach(cloud => {
      if (!cloud.disabled) markCloudRemoved(cloud, 0, 0, motion.matches ? 0 : index++ * 55);
    });
    layer.style.setProperty("--cloud-mist-opacity", "0");
    if (instant || motion.matches) finishReveal();
    else revealTimer = window.setTimeout(() => finishReveal(), 480 + Math.max(0, index - 1) * 55);
  }

  function removeCloud(cloud, dx = 0, dy = 0) {
    if (revealed || revealing || cloud.disabled) return;
    const hadFocus = document.activeElement === cloud;
    if (!markCloudRemoved(cloud, dx, dy)) return;
    if (removed > clouds.length / 2) revealAll({ focus: hadFocus });
    else {
      status.textContent = `Has apartado ${removed} de ${clouds.length} nubes.`;
      if (hadFocus) clouds.find(item => !item.disabled)?.focus({ preventScroll: true });
    }
  }

  clouds.forEach(cloud => {
    cloud.addEventListener("pointerdown", event => {
      if (revealed || revealing || cloud.disabled || activePointer || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
      event.preventDefault();
      activePointer = { cloud, id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, threshold: Math.max(38, Math.min(74, frame.getBoundingClientRect().width * .17)) };
      cloud.classList.add("is-dragging");
      try { cloud.setPointerCapture?.(event.pointerId); } catch (_) { /* El clic sigue disponible si no hay captura. */ }
    });
    cloud.addEventListener("pointermove", event => {
      if (!activePointer || activePointer.cloud !== cloud || activePointer.id !== event.pointerId) return;
      event.preventDefault();
      activePointer.dx = event.clientX - activePointer.x;
      activePointer.dy = event.clientY - activePointer.y;
      cloud.style.setProperty("--drag-x", `${activePointer.dx}px`);
      cloud.style.setProperty("--drag-y", `${activePointer.dy}px`);
    }, { passive: false });
    cloud.addEventListener("pointerup", event => finishPointer(event));
    cloud.addEventListener("pointercancel", event => finishPointer(event, true));
    cloud.addEventListener("lostpointercapture", event => finishPointer(event, true));
    cloud.addEventListener("click", event => {
      if (event.detail !== 0 && performance.now() < (ignoreClicksUntil.get(cloud) || 0)) return;
      removeCloud(cloud);
    });
    cloud.addEventListener("dragstart", event => event.preventDefault());
  });
  direct.addEventListener("click", () => revealAll({ focus: true }));

  function restoreModal() {
    if (!modalOpen) return;
    modalOpen = false;
    document.body.classList.remove("family-photo-modal-open");
    dialog.classList.remove("is-fallback-open");
    previousInert.forEach((inert, element) => { element.inert = inert; });
    previousInert.clear();
    if (openTrigger?.isConnected && !openTrigger.disabled) openTrigger.focus({ preventScroll: true });
  }
  function closePhoto() {
    if (!modalOpen) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    restoreModal();
  }
  opener.addEventListener("click", () => {
    if (!revealed || modalOpen) return;
    openTrigger = opener;
    syncModalPhoto();
    // Una sola experiencia en primer plano; la TV conserva su posición.
    document.querySelector("#invitation-video")?.pause();
    try {
      if (typeof dialog.showModal !== "function") throw new Error("Modal nativo no disponible");
      dialog.showModal();
    } catch (_) {
      dialog.setAttribute("open", "");
      dialog.classList.add("is-fallback-open");
    }
    modalOpen = true;
    document.body.classList.add("family-photo-modal-open");
    [...document.body.children].forEach(element => {
      if (element !== dialog) { previousInert.set(element, element.inert); element.inert = true; }
    });
    closeButton.focus({ preventScroll: true });
  });
  closeButton.addEventListener("click", closePhoto);
  dialog.addEventListener("cancel", event => { event.preventDefault(); closePhoto(); });
  dialog.addEventListener("close", restoreModal);
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closePhoto();
  });
  document.addEventListener("keydown", event => {
    if (!modalOpen) return;
    if (event.key === "Escape") { event.preventDefault(); closePhoto(); }
    else if (event.key === "Tab") {
      // La fotografía no es un control; el botón de cierre es el único foco del modal.
      event.preventDefault();
      closeButton.focus({ preventScroll: true });
    }
  });

  if ("IntersectionObserver" in window) {
    section.classList.add("is-ready");
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); revealObserver.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    document.querySelectorAll(".parents-reveal").forEach(element => revealObserver.observe(element));
  }
  motion.addEventListener("change", () => {
    if (motion.matches && revealing) finishReveal();
  });
  for (const link of [continuation, document.querySelector("#parents-event")]) {
    const targetId = config.eventSectionId || "event-section";
    link.href = `#${targetId}`;
    link.addEventListener("click", event => {
      const target = document.getElementById(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: motion.matches ? "instant" : "smooth", block: "start" });
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
  }
  try {
    if (sessionStorage.getItem(storageKey) === "yes") {
      section.classList.add("is-photo-restored");
      finishReveal({ announce: false, focus: false });
    }
  } catch (_) { /* No se necesita almacenamiento para descubrir la foto. */ }
})();
