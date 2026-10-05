(() => {
  "use strict";
  const config = window.INVITATION_CONFIG || {};
  const videoConfig = config.video || {};
  const section = document.querySelector("#television-section");
  const tv = document.querySelector("#tv-set");
  const screen = document.querySelector("#tv-screen");
  const video = document.querySelector("#invitation-video");
  const power = document.querySelector("#tv-power");
  const playPause = document.querySelector("#tv-play-pause");
  const sound = document.querySelector("#tv-sound");
  const restart = document.querySelector("#tv-restart");
  const expand = document.querySelector("#tv-expand");
  const closeExpanded = document.querySelector("#tv-close-expanded");
  const offScreen = document.querySelector("#tv-off-screen");
  const interference = document.querySelector("#tv-interference");
  const playOverlay = document.querySelector("#tv-play-overlay");
  const errorOverlay = document.querySelector("#tv-error");
  const status = document.querySelector("#tv-status");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let powered = false;
  let booting = false;
  let failed = false;
  let inView = true;
  let bootTimer;
  let requestSerial = 0;
  let retryPosition = null;
  let expansionPending = false;
  let backgroundSuspended = false;
  const pausedMusic = new Set();
  const inertBeforeExpansion = new Map();

  const expanded = () => screen.classList.contains("is-expanded") || document.fullscreenElement === screen;
  const say = message => { if (status.textContent !== message) status.textContent = message; };

  function pauseBackgroundMusic() {
    if (video.paused || video.muted || video.volume === 0) return;
    const tracks = new Set(document.querySelectorAll("audio[data-background-music]"));
    const configuredMusic = document.getElementById(config.backgroundMusicId || "background-music");
    if (configuredMusic?.tagName === "AUDIO") tracks.add(configuredMusic);
    tracks.forEach(track => {
      if (!track.paused) { pausedMusic.add(track); track.pause(); }
    });
  }

  function resumeBackgroundMusic() {
    if (document.hidden || backgroundSuspended) return;
    pausedMusic.forEach(track => {
      // Sólo retoma música que ya estaba reproduciéndose antes del video.
      try { track.play()?.catch(() => {}); } catch (_) { /* El navegador puede exigir otro toque. */ }
    });
    pausedMusic.clear();
  }

  function syncControls() {
    const playing = !video.paused && !video.ended;
    playPause.disabled = !powered || booting || failed;
    restart.disabled = !powered || booting || failed;
    playPause.setAttribute("aria-label", playing ? "Pausar video" : video.ended ? "Volver a reproducir video" : "Reproducir video");
    playPause.querySelector("span").textContent = playing ? "Pausar" : video.ended ? "Repetir" : "Reproducir";
    playPause.querySelector(".tv-icon-play").toggleAttribute("hidden", playing); // En SVG, .hidden no refleja el atributo.
    playPause.querySelector(".tv-icon-pause").toggleAttribute("hidden", !playing);
    sound.setAttribute("aria-label", video.muted ? "Activar sonido" : "Silenciar sonido");
    sound.setAttribute("aria-pressed", String(video.muted));
    sound.querySelector("span").textContent = video.muted ? "Activar sonido" : "Silenciar";
    sound.querySelector(".tv-icon-sound").toggleAttribute("hidden", video.muted);
    sound.querySelector(".tv-icon-muted").toggleAttribute("hidden", !video.muted);
    power.setAttribute("aria-pressed", String(powered));
    power.setAttribute("aria-label", powered ? "Apagar televisión" : "Encender televisión");
    document.querySelector("#tv-power-label").textContent = powered ? "Apagar" : "Encender";
    document.querySelector("#tv-power-state").textContent = powered ? "Encendida" : "Apagada";
    tv.dataset.power = powered ? "on" : "off";
    offScreen.hidden = powered;
    errorOverlay.hidden = !powered || !failed;
    interference.hidden = !powered || !booting;
    if (!powered || failed || booting) playOverlay.hidden = true;
    const large = expanded();
    expand.setAttribute("aria-pressed", String(large));
    expand.setAttribute("aria-label", large ? "Reducir video" : "Ampliar video");
    expand.querySelector("span").textContent = large ? "Reducir" : "Ampliar";
    closeExpanded.hidden = !large;
    video.tabIndex = large ? 0 : -1;
  }

  function showError() {
    failed = true;
    booting = false;
    window.clearTimeout(bootTimer);
    requestSerial++;
    video.pause();
    if (powered) say("No pudimos cargar el video. Puedes reintentarlo o seguir descubriendo.");
    syncControls();
  }

  async function requestPlay() {
    if (!powered || booting || failed || document.hidden || (!inView && !expanded())) return;
    const request = ++requestSerial;
    playOverlay.hidden = true;
    try {
      // Tras el encendido, algunos navegadores requieren un segundo toque:
      // el botón dentro de la pantalla vuelve a llamar play() directamente.
      await video.play();
      if (request !== requestSerial || !powered || document.hidden || (!inView && !expanded())) video.pause();
    } catch (error) {
      if (request !== requestSerial || !powered) return;
      if (video.error || error.name === "NotSupportedError") { showError(); return; }
      if (error.name !== "AbortError") {
        playOverlay.hidden = false;
        say("Toca Reproducir en la pantalla para comenzar.");
      }
    }
    syncControls();
  }

  function cancelBoot() {
    window.clearTimeout(bootTimer);
    booting = false;
    requestSerial++;
  }

  function pauseVideo(message) {
    cancelBoot();
    video.pause();
    if (powered && !failed && !video.ended) playOverlay.hidden = false;
    if (message && powered && !failed && !video.ended) say(message);
    syncControls();
  }

  function boot() {
    cancelBoot();
    if (failed) { syncControls(); say("No pudimos cargar el video. Toca Reintentar."); return; }
    booting = true;
    say("Encendiendo…");
    syncControls();
    bootTimer = window.setTimeout(() => {
      booting = false;
      if (!powered) return;
      syncControls();
      if (inView || expanded()) requestPlay();
      else pauseVideo("Video en pausa. Puedes continuar cuando vuelvas.");
    }, motion.matches ? 120 : 500);
  }

  power.addEventListener("click", () => {
    powered = !powered;
    if (powered) boot();
    else {
      cancelBoot();
      video.pause();
      playOverlay.hidden = true;
      say("Televisión apagada. Guardamos el punto en el que te quedaste.");
      syncControls();
    }
  });

  playPause.addEventListener("click", () => {
    if (playPause.disabled) return;
    if (video.paused) requestPlay();
    else pauseVideo("Video en pausa.");
  });
  document.querySelector("#tv-screen-play").addEventListener("click", requestPlay);
  sound.addEventListener("click", () => { video.muted = !video.muted; });
  restart.addEventListener("click", () => {
    if (restart.disabled) return;
    video.currentTime = 0;
    requestPlay();
  });
  document.querySelector("#tv-retry").addEventListener("click", () => {
    retryPosition = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    failed = false;
    video.src = videoConfig.src || "assets/ellos-tambien-quieren-saber.mp4";
    video.load();
    boot();
  });

  video.addEventListener("loadedmetadata", () => {
    if (video.videoWidth && video.videoHeight) screen.style.setProperty("--video-ratio", `${video.videoWidth} / ${video.videoHeight}`);
    if (retryPosition !== null) {
      video.currentTime = Math.min(retryPosition, Number.isFinite(video.duration) ? video.duration : retryPosition);
      retryPosition = null;
    }
    syncControls();
  });
  video.addEventListener("play", () => {
    if (!powered || document.hidden || (!inView && !expanded())) { video.pause(); return; }
    playOverlay.hidden = true;
    pauseBackgroundMusic();
    syncControls();
  });
  video.addEventListener("playing", () => {
    if (!powered || video.paused || video.ended) return;
    say("Disfruta el video. Ellos también tienen curiosidad.");
    syncControls();
  });
  video.addEventListener("pause", () => {
    if (powered && !booting && !failed && !video.ended) { playOverlay.hidden = false; say("Video en pausa."); }
    resumeBackgroundMusic();
    syncControls();
  });
  video.addEventListener("volumechange", () => {
    if (video.muted || video.volume === 0) resumeBackgroundMusic();
    else pauseBackgroundMusic();
    syncControls();
  });
  video.addEventListener("waiting", () => { if (powered && !video.paused && !booting && !failed) say("El video está cargando…"); });
  video.addEventListener("error", showError);
  video.addEventListener("ended", () => {
    // No se llama load() ni se rebobina: queda visible el último fotograma.
    playOverlay.hidden = true;
    document.querySelector("#tv-ending").hidden = false;
    say("El video terminó. Puedes volver a verlo.");
    resumeBackgroundMusic();
    syncControls();
  });

  function setFallbackExpansion(on) {
    screen.classList.toggle("is-expanded", on);
    video.controls = on;
    if (on) {
      screen.setAttribute("role", "dialog");
      screen.setAttribute("aria-modal", "true");
      screen.setAttribute("aria-label", "Video ampliado");
      document.querySelectorAll("#cover, .tv-heading, .tv-panel, .tv-indicator-row, .tv-status, .tv-ending, .tv-continue, .parents-section").forEach(element => {
        inertBeforeExpansion.set(element, element.inert);
        element.inert = true;
      });
    } else {
      screen.removeAttribute("role");
      screen.removeAttribute("aria-modal");
      screen.removeAttribute("aria-label");
      inertBeforeExpansion.forEach((inert, element) => { element.inert = inert; });
      inertBeforeExpansion.clear();
    }
    syncControls();
    if (on) closeExpanded.focus({ preventScroll: true });
    else {
      expand.focus({ preventScroll: true });
      if (!inView) pauseVideo("Video en pausa. Puedes continuar cuando vuelvas.");
    }
  }

  async function closeExpansion() {
    if (document.fullscreenElement === screen) {
      try { await document.exitFullscreen(); } catch (_) { /* Sigue disponible Escape del navegador. */ }
    } else if (screen.classList.contains("is-expanded")) setFallbackExpansion(false);
  }

  expand.addEventListener("click", async () => {
    if (expansionPending) return;
    if (expanded()) { await closeExpansion(); return; }
    expansionPending = true;
    if (screen.requestFullscreen && document.fullscreenEnabled) {
      try { await screen.requestFullscreen(); }
      catch (_) { setFallbackExpansion(true); }
    } else setFallbackExpansion(true);
    expansionPending = false;
  });
  closeExpanded.addEventListener("click", closeExpansion);
  document.addEventListener("fullscreenchange", () => {
    video.controls = document.fullscreenElement === screen;
    syncControls();
    if (document.fullscreenElement === screen) closeExpanded.focus({ preventScroll: true });
    else {
      expand.focus({ preventScroll: true });
      if (!inView) pauseVideo("Video en pausa. Puedes continuar cuando vuelvas.");
    }
  });
  document.addEventListener("keydown", event => {
    if (!screen.classList.contains("is-expanded")) return;
    if (event.key === "Escape") { event.preventDefault(); setFallbackExpansion(false); return; }
    if (event.key === "Tab") {
      const targets = [...screen.querySelectorAll("button:not(:disabled), video[controls]")].filter(element => element.getClientRects().length);
      if (!targets.length) return;
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting && entries[0].intersectionRatio > 0;
      tv.classList.toggle("is-in-view", inView);
      if (!inView && !expanded()) pauseVideo("Video en pausa. Puedes continuar cuando vuelvas.");
    }, { threshold: [0, .001] });
    observer.observe(section);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseVideo("Video en pausa. Puedes continuar cuando vuelvas.");
    else if (video.paused || video.muted) resumeBackgroundMusic();
  });
  window.addEventListener("pagehide", () => { backgroundSuspended = true; cancelBoot(); video.pause(); });
  window.addEventListener("pageshow", () => { backgroundSuspended = false; });
  motion.addEventListener("change", () => {
    if (motion.matches && booting && powered) {
      cancelBoot();
      syncControls();
      requestPlay();
    }
  });

  for (const [selector, id] of [["#tv-team", config.voteSectionId || "vote-section"], ["#tv-continue", config.parentsSectionId || "parents-message"]]) {
    const link = document.querySelector(selector);
    link.href = `#${id}`;
    link.addEventListener("click", event => {
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: motion.matches ? "instant" : "smooth", block: "start" });
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
  }

  // Sin autoplay, sin descarga anticipada completa y con proporción estable.
  video.muted = Boolean(videoConfig.muted);
  if (videoConfig.width && videoConfig.height) screen.style.setProperty("--video-ratio", `${videoConfig.width} / ${videoConfig.height}`);
  video.src = videoConfig.src || "assets/ellos-tambien-quieren-saber.mp4";
  syncControls();
})();
