(() => {
  "use strict";
  const config = window.INVITATION_CONFIG || {};
  const options = config.teamSelection || {};
  const core = window.InvitationChoice;
  const section = document.querySelector("#vote-section");
  const stage = document.querySelector("#team-stage");
  const balloons = [...document.querySelectorAll(".team-balloon")];
  const box = document.querySelector("#team-box");
  const dropZone = document.querySelector("#team-drop-zone");
  const confirmButton = document.querySelector("#team-confirm");
  const tapHint = document.querySelector("#team-tap-hint");
  const result = document.querySelector("#team-result");
  const resultTitle = document.querySelector("#team-result-title");
  const status = document.querySelector("#team-status");
  const flight = document.querySelector("#team-flight");
  const confetti = document.querySelector("#team-confetti");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const rain = document.querySelector("#team-rain");
  let rainTimer = null;
  let storage;
  try { storage = window.localStorage; } catch (_) { /* La elección sigue en memoria si el acceso está bloqueado. */ }
  const store = core.createStore(options.eventId,storage);
  let candidate = null, confirmed = null, pointer = null, celebrationTimer;
  const ignoreClicksUntil = new WeakMap();

  const api = window.InvitationTeam = {
    getSelection:()=>store.get(),
    eventId:store.eventId,
    registerChoice:core.registerChoice,
  };
  function announce(text) { status.textContent = text; }
  function publish() {
    window.dispatchEvent(new CustomEvent("invitation:team-changed",{detail:store.get()}));
  }
  function setPressed(team) { balloons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.team===team))); }
  function select(team) {
    if (confirmed || !core.validTeam(team)) return;
    candidate = team;
    section.dataset.team = team;
    setPressed(team);
    confirmButton.hidden = false;
    tapHint.textContent = `${core.teamName(team)} seleccionado. Confirma tu corazonada.`;
    announce(`${core.teamName(team)} seleccionado. Pulsa Confirmar mi equipo o arrastra el globo a la caja.`);
  }
  function resetPosition(button) {
    button.classList.remove("is-grabbing","is-dragging");
    button.style.setProperty("--drag-x","0px");
    button.style.setProperty("--drag-y","0px");
  }
  function releasePointer(active) {
    try { if (active.button.hasPointerCapture?.(active.id)) active.button.releasePointerCapture(active.id); } catch (_) { /* El navegador puede haber liberado la captura al cancelar. */ }
  }
  function cancelDrag() {
    if (!pointer) return;
    const active = pointer;
    pointer = null;
    releasePointer(active);
    resetPosition(active.button);
    box.classList.remove("is-over");
    document.querySelector("#team-drop-label").textContent = "Suelta tu globo aquí";
    if (candidate) section.dataset.team=candidate; else delete section.dataset.team;
  }
  function translation(button) {
    const raw = window.getComputedStyle(button).transform;
    const values = raw && raw !== "none" ? raw.slice(raw.indexOf("(")+1,-1).split(",").map(Number) : [];
    return values.length === 6 ? {x:values[4],y:values[5]} : values.length === 16 ? {x:values[12],y:values[13]} : {x:0,y:0};
  }
  function overBox(button) {
    const art = button.querySelector(".team-balloon-art").getBoundingClientRect();
    // El centro del cuerpo está arriba del hilo, a un tercio de la ilustración.
    return core.inside({x:art.left+art.width/2,y:art.top+art.height*.33},dropZone.getBoundingClientRect());
  }
  function showRecord(record,{restored = false} = {}) {
    confirmed = record;
    candidate = record.team;
    section.dataset.team = record.team;
    setPressed(record.team);
    balloons.forEach(button=>{button.disabled=true;});
    confirmButton.hidden = true;
    result.hidden = false;
    document.querySelector("#team-drop-label").textContent = "Tu corazonada está aquí";
    resultTitle.textContent = `¡Eres del ${core.teamName(record.team).toLowerCase()}!`;
    document.querySelector("#team-card-name").textContent = core.teamName(record.team);
    document.querySelector("#team-card").dataset.team = record.team;
    document.querySelector("#team-local-note").textContent = store.isPersisted() ? "Tu elección queda guardada en este navegador." : "Tu elección se mantendrá mientras tengas abierta la invitación.";
    if (restored) {
      section.classList.add("is-restored");
      section.dataset.phase = "chosen";
    }
  }
  function finishCelebration(focus = true) {
    window.clearTimeout(celebrationTimer);
    if (!confirmed) return;
    flight.hidden = true;
    flight.classList.remove("is-flying");
    flight.replaceChildren();
    confetti.replaceChildren();
    section.dataset.phase = "chosen";
    if (focus) resultTitle.focus({preventScroll:true});
    startRain();
  }
  function celebrate(button,bounds) {
    if (motion.matches) { section.dataset.phase="chosen"; resultTitle.focus({preventScroll:true}); return; }
    const stageRect = stage.getBoundingClientRect();
    const zone = dropZone.getBoundingClientRect();
    flight.replaceChildren(button.querySelector(".team-balloon-art").cloneNode(true));
    flight.dataset.team = button.dataset.team;
    flight.style.setProperty("--flight-width",`${bounds.width}px`);
    flight.style.setProperty("--flight-x",`${bounds.left-stageRect.left}px`);
    flight.style.setProperty("--flight-y",`${bounds.top-stageRect.top}px`);
    flight.style.setProperty("--box-x",`${zone.left+zone.width/2-stageRect.left-bounds.width/2}px`);
    flight.style.setProperty("--box-y",`${zone.top+zone.height/2-stageRect.top-bounds.height*.33}px`);
    flight.hidden = false;
    void flight.offsetWidth;
    flight.classList.add("is-flying");
    const sectionRect = section.getBoundingClientRect();
    const rainTop = Math.max(90,stageRect.top-sectionRect.top+15);
    for (let i=0;i<28;i++) {
      const piece = document.createElement("i");
      piece.style.setProperty("--confetti-left",`${12+Math.random()*76}%`);
      piece.style.setProperty("--confetti-top",`${rainTop}px`);
      piece.style.setProperty("--confetti-delay",`${380+Math.random()*100}ms`);
      piece.style.setProperty("--confetti-time",`${850+Math.random()*170}ms`);
      piece.style.setProperty("--confetti-drift",`${(Math.random()-.5)*110}px`);
      piece.style.setProperty("--confetti-fall",`${170+Math.random()*130}px`);
      piece.style.setProperty("--confetti-turn",`${(Math.random()-.5)*500}deg`);
      piece.style.setProperty("--confetti-width",`${4+Math.random()*4}px`);
      confetti.appendChild(piece);
    }
    celebrationTimer = window.setTimeout(()=>finishCelebration(),1500);
  }
  // Lluvia continua de confeti del color elegido mientras la sección está a la vista.
  function rainActive() { return Boolean(confirmed) && !motion.matches && !document.hidden && section.classList.contains("is-active"); }
  function stopRain(clear = false) {
    window.clearTimeout(rainTimer);
    rainTimer = null;
    if (clear) rain.replaceChildren();
  }
  function dropPiece() {
    rainTimer = null;
    if (!rainActive()) return;
    if ((rain.children?.length || 0) < 60) {
      const piece = document.createElement("i");
      const height = section.getBoundingClientRect().height;
      piece.style.setProperty("--rain-left",`${Math.random()*100}%`);
      piece.style.setProperty("--rain-fall",`${height+60}px`);
      piece.style.setProperty("--rain-time",`${5000+Math.random()*4000}ms`);
      piece.style.setProperty("--rain-drift",`${(Math.random()-.5)*120}px`);
      piece.style.setProperty("--rain-turn",`${(Math.random()-.5)*720}deg`);
      piece.style.setProperty("--rain-size",`${5+Math.random()*5}px`);
      piece.addEventListener("animationend",()=>piece.remove());
      rain.appendChild(piece);
    }
    rainTimer = window.setTimeout(dropPiece,150+Math.random()*130);
  }
  function startRain() { if (!rainTimer && rainActive()) dropPiece(); }
  function commit(team) {
    if (confirmed || !core.validTeam(team)) return;
    const button = balloons.find(item=>item.dataset.team===team);
    const bounds = button.querySelector(".team-balloon-art").getBoundingClientRect();
    const record = store.confirm(team);
    section.classList.remove("is-restored");
    section.dataset.phase = "celebrating";
    balloons.forEach(resetPosition);
    box.classList.remove("is-over");
    document.querySelector("#team-drop-label").textContent = "Tu corazonada está aquí";
    showRecord(record);
    announce(`${resultTitle.textContent} Tu corazonada ya forma parte de esta aventura. ${document.querySelector("#team-local-note").textContent}`);
    celebrate(button,bounds);
    publish();
    // Un registro externo futuro nunca debe bloquear el guardado y la experiencia local.
    try { Promise.resolve(api.registerChoice({...record})).catch(()=>{}); } catch (_) { /* Sin servicios externos en esta etapa. */ }
  }
  balloons.forEach(button=> {
    button.addEventListener("pointerdown",event=> {
      if (confirmed || pointer || event.isPrimary===false || (event.button!==undefined && event.button!==0)) return;
      event.preventDefault();
      const base = translation(button);
      button.style.setProperty("--drag-x",`${base.x}px`);
      button.style.setProperty("--drag-y",`${base.y}px`);
      button.classList.add("is-grabbing");
      pointer = {button,id:event.pointerId,x:event.clientX,y:event.clientY,base,dragging:false};
      try { button.setPointerCapture?.(event.pointerId); } catch (_) { /* El botón nativo sigue siendo una alternativa. */ }
    });
    button.addEventListener("pointermove",event=> {
      if (!pointer || pointer.button!==button || pointer.id!==event.pointerId) return;
      event.preventDefault();
      const dx=event.clientX-pointer.x, dy=event.clientY-pointer.y;
      if (Math.hypot(dx,dy)>=8) { pointer.dragging=true; button.classList.add("is-dragging"); }
      button.style.setProperty("--drag-x",`${pointer.base.x+dx}px`);
      button.style.setProperty("--drag-y",`${pointer.base.y+dy}px`);
      const hovered = pointer.dragging && overBox(button);
      box.classList.toggle("is-over",hovered);
      section.dataset.team = button.dataset.team;
      document.querySelector("#team-drop-label").textContent = hovered ? "Suelta para elegir tu equipo" : "Suelta tu globo aquí";
    },{passive:false});
    button.addEventListener("pointerup",event=> {
      if (!pointer || pointer.button!==button || pointer.id!==event.pointerId) return;
      const active = pointer;
      // Incluye el último movimiento aunque el navegador haya agrupado los pointermove.
      const dx=event.clientX-active.x, dy=event.clientY-active.y;
      const moved = active.dragging || Math.hypot(dx,dy)>=8;
      if (moved) button.classList.add("is-dragging");
      button.style.setProperty("--drag-x",`${active.base.x+dx}px`);
      button.style.setProperty("--drag-y",`${active.base.y+dy}px`);
      const accepted = moved && overBox(button);
      pointer = null;
      releasePointer(active);
      ignoreClicksUntil.set(button,performance.now()+450);
      if (accepted) commit(button.dataset.team);
      else {
        resetPosition(button);
        box.classList.remove("is-over");
        document.querySelector("#team-drop-label").textContent = "Suelta tu globo aquí";
        if (!moved) select(button.dataset.team);
        else if (candidate) section.dataset.team=candidate; else delete section.dataset.team;
      }
    });
    for (const type of ["pointercancel","lostpointercapture"]) button.addEventListener(type,event=> {
      if (pointer?.id===event.pointerId && pointer.button===button) {
        cancelDrag();
      }
    });
    button.addEventListener("click",event=> {
      if (event.detail!==0 && performance.now()<(ignoreClicksUntil.get(button)||0)) return;
      select(button.dataset.team);
    });
    button.addEventListener("dragstart",event=>event.preventDefault());
    button.addEventListener("keydown",event=> {
      if (confirmed || !["ArrowLeft","ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const other = balloons.find(item=>item!==button);
      other.focus({preventScroll:true});
      select(other.dataset.team);
    });
  });
  confirmButton.addEventListener("click",()=>commit(candidate));
  document.querySelector("#team-change").addEventListener("click",()=> {
    const previous = confirmed?.team;
    window.clearTimeout(celebrationTimer);
    cancelDrag();
    stopRain(true);
    store.clear();
    confirmed = null; candidate = null;
    flight.hidden = true; flight.classList.remove("is-flying"); flight.replaceChildren(); confetti.replaceChildren();
    section.classList.remove("is-restored");
    section.dataset.phase="choosing";
    delete section.dataset.team;
    result.hidden = true;
    confirmButton.hidden = true;
    tapHint.textContent="También puedes tocar un globo para elegir.";
    document.querySelector("#team-drop-label").textContent="Suelta tu globo aquí";
    balloons.forEach(button=>{button.disabled=false; resetPosition(button);});
    setPressed(null);
    balloons.find(button=>button.dataset.team===previous)?.focus({preventScroll:true});
    announce("Puedes elegir de nuevo: Equipo niña o Equipo niño.");
    publish();
  });
  document.addEventListener("keydown",event=>{if(event.key==="Escape" && pointer){event.preventDefault();cancelDrag();}});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){cancelDrag();if(confirmed)finishCelebration(false);stopRain();}else if(section.dataset.phase==="chosen")startRain();});
  window.addEventListener("pagehide",()=>{cancelDrag();window.clearTimeout(celebrationTimer);stopRain();});
  window.addEventListener("pageshow",()=>{if(confirmed && section.dataset.phase==="celebrating")finishCelebration(false);});
  motion.addEventListener("change",()=>{if(motion.matches){stopRain(true);if(confirmed)finishCelebration(false);}else if(section.dataset.phase==="chosen")startRain();});
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries=> {
      const visible=entries[0].isIntersecting;
      section.classList.toggle("is-active",visible);
      if(!visible){cancelDrag();stopRain();}
      else if(section.dataset.phase==="chosen")startRain();
    },{threshold:0});
    observer.observe(section);
  } else section.classList.add("is-active");
  for (const link of [document.querySelector("#team-continue"),document.querySelector("#team-undecided")]) {
    const id=options.nextSectionId || "baby-predictions";
    link.href=`#${id}`;
    link.addEventListener("click",event=> {
      const target=document.getElementById(id);
      if(!target)return;
      event.preventDefault();
      cancelDrag();
      if(confirmed && section.dataset.phase==="celebrating")finishCelebration(false);
      target.scrollIntoView({behavior:motion.matches?"instant":"smooth",block:"start"});
      if(!target.hasAttribute("tabindex"))target.tabIndex=-1;
      target.focus({preventScroll:true});
    });
  }
  if (config.voteSectionId && config.voteSectionId!==section.id) section.id=config.voteSectionId;
  const nextId=options.nextSectionId || "baby-predictions";
  const placeholder=document.querySelector("#baby-predictions");
  if(placeholder && placeholder.id!==nextId)placeholder.id=nextId;
  const restored=store.get();
  if(restored)showRecord(restored,{restored:true});
})();
