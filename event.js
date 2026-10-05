(() => {
  "use strict";
  const config = window.INVITATION_CONFIG || {};
  const core = window.InvitationEvent;
  const event = core.normalize(config.event);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const section = document.querySelector("#event-section");
  const desk = document.querySelector("#desk-calendar");
  const details = document.querySelector("#event-details");
  const tab = document.querySelector("#event-calendar-tab");
  const alternative = document.querySelector("#event-details-button");
  const pin = document.querySelector("#event-pin");
  const address = document.querySelector("#event-location-address");
  const save = document.querySelector("#event-save-date");
  const countdownMessage = document.querySelector("#event-countdown-message");
  const numbers = [...document.querySelectorAll("[data-countdown]")];
  const prediction = document.querySelector("#event-prediction");
  let opened = false, closeTimer, clockTimer, lastState;
  const setText = (id,text) => { document.getElementById(id).textContent = text; };
  const labels = core.labels(event);
  if (labels) {
    setText("event-month",labels.month);
    setText("event-day",labels.day);
    setText("event-weekday",labels.weekday);
    setText("event-readable-date",labels.date);
    document.querySelector("#event-readable-date").dateTime = event.start.toISOString();
    setText("event-full-date",labels.date);
    setText("event-time",`${labels.time} · ${labels.zone}`);
  }
  setText("event-venue",event.venue || "Ubicación por confirmar");
  setText("event-details-address",event.address || "Dirección por confirmar");
  setText("event-location-name",event.venue || (event.location ? "Nos vemos aquí" : "Ubicación por confirmar"));
  address.textContent = event.address || (event.location ? "Dirección por confirmar" : "Ubicación por confirmar");
  const note = document.querySelector("#event-host-note");
  note.hidden = !event.note;
  note.textContent = event.note;
  const map = document.querySelector("#event-map-link");
  map.hidden = !event.maps;
  if (event.maps) map.href = event.maps;
  save.disabled = !event.canSave;
  setText("event-save-hint",event.canSave ? "Un recuerdo en tu calendario." : "Disponible cuando confirmemos los datos del evento.");
  const dress = config.event?.dressCode;
  document.querySelector("#event-dress-code").hidden = dress?.enabled !== true;
  if (typeof dress?.text === "string") setText("event-dress-text",dress.text);

  function toggleDetails() {
    window.clearTimeout(closeTimer);
    opened = !opened;
    if (opened) {
      details.hidden = false;
      void details.offsetHeight;
      desk.classList.remove("is-opening");
      void desk.offsetHeight;
      if (!motion.matches) desk.classList.add("is-opening");
    } else desk.classList.remove("is-opening");
    desk.dataset.open = String(opened);
    tab.setAttribute("aria-expanded",String(opened));
    alternative.setAttribute("aria-expanded",String(opened));
    setText("event-tab-label",opened ? "Cierra los detalles" : "Abre los detalles");
    // Mantiene el SVG del botón alternativo.
    alternative.firstChild.textContent = opened ? "Cerrar detalles " : "Ver detalles ";
    if (!opened) {
      if (motion.matches) details.hidden = true;
      else closeTimer = window.setTimeout(()=>{ if (!opened) details.hidden = true; },390);
    }
  }
  tab.addEventListener("click",toggleDetails);
  alternative.addEventListener("click",toggleDetails);
  desk.addEventListener("animationend",()=>desk.classList.remove("is-opening"));
  pin.addEventListener("click",()=> {
    address.hidden = !address.hidden;
    pin.setAttribute("aria-expanded",String(!address.hidden));
  });
  numbers.forEach(number=>number.addEventListener("animationend",()=>number.classList.remove("is-flipping")));

  function tick(animate = true) {
    window.clearTimeout(clockTimer);
    const now = new Date();
    const current = core.countdown(event,now);
    for (const number of numbers) {
      const value = current.values ? String(current.values[number.dataset.countdown]).padStart(2,"0") : "--";
      if (number.textContent === value) continue;
      number.textContent = value;
      number.style.setProperty("--digit-scale",String(Math.min(1,3/value.length)));
      number.classList.remove("is-flipping");
      if (animate && !motion.matches) { void number.offsetHeight; number.classList.add("is-flipping"); }
    }
    if (current.state !== lastState) {
      lastState = current.state;
      const messages = {pending:"Pronto tendremos fecha",counting:"Un pequeño secreto, cada vez más cerca.",today:"¡Hoy compartimos la gran sorpresa!",past:"Un día para recordar"};
      countdownMessage.textContent = messages[current.state];
    }
    if (document.hidden) return;
    if (current.state === "counting") clockTimer = window.setTimeout(tick,1000-now.getTime()%1000);
    else if (current.state === "today") clockTimer = window.setTimeout(()=>tick(false),core.nextDayBoundary(now,event.zone)-now.getTime()+20);
  }
  document.addEventListener("visibilitychange",()=> {
    if (document.hidden) window.clearTimeout(clockTimer); else tick(false);
  });
  window.addEventListener("pageshow",()=>tick(false));
  window.addEventListener("pagehide",()=>window.clearTimeout(clockTimer));
  motion.addEventListener("change",()=> {
    if (motion.matches) {
      desk.classList.remove("is-opening");
      numbers.forEach(number=>number.classList.remove("is-flipping"));
      if (!opened) { window.clearTimeout(closeTimer); details.hidden = true; }
    }
  });
  tick(false);

  save.addEventListener("click",()=> {
    const content = core.calendarFile(event);
    if (!content) return;
    let url;
    try {
      const file = new Blob([content],{type:"text/calendar;charset=utf-8"});
      url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "nuestra-cita-con-la-sorpresa.ics";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setText("event-download-status","Tu archivo de calendario está listo para guardar.");
    } catch (_) {
      setText("event-download-status","No pudimos descargar el calendario. Inténtalo de nuevo.");
    } finally {
      if (url) window.setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
  });
  const voteId = config.voteSectionId || "vote-section";
  prediction.href = `#${voteId}`;
  prediction.addEventListener("click",click=> {
    const target = document.getElementById(voteId);
    if (!target) return;
    click.preventDefault();
    target.scrollIntoView({behavior:motion.matches ? "instant" : "smooth",block:"start"});
    if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus({preventScroll:true});
  });
  // Permite cambiar el ID de destino desde config.js sin perder el vínculo con los papás.
  if (config.eventSectionId && config.eventSectionId !== section.id) section.id = config.eventSectionId;
})();
