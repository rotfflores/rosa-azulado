// Pruebas de comportamiento con un reproductor simulado, sin dependencias.
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const source = fs.readFileSync(path.join(__dirname, "../television.js"), "utf8");

function setup({ reduced = false, nativeFullscreen = false, blocked = false } = {}) {
  const nodes = new Map(), timers = new Map(), documentEvents = new Map();
  let timerId = 0, visibilityObserver;
  let document;
  class Element {
    constructor(id = "") {
      this.id = id; this.attrs = new Map(); this.events = new Map(); this.dataset = {};
      this.hidden = false; this.disabled = false; this.inert = false; this.textContent = "";
      this.classes = new Set();
      this.style = { setProperty() {} };
      this.classList = { add: c => this.classes.add(c), remove: c => this.classes.delete(c), contains: c => this.classes.has(c), toggle: (c, on) => on ? this.classes.add(c) : this.classes.delete(c) };
    }
    setAttribute(k,v) { this.attrs.set(k,String(v)); }
    getAttribute(k) { return this.attrs.get(k) ?? null; }
    removeAttribute(k) { this.attrs.delete(k); }
    hasAttribute(k) { return this.attrs.has(k); }
    toggleAttribute(k,on) { if (on) this.attrs.set(k,""); else this.attrs.delete(k); return on; }
    addEventListener(type,fn) { if (!this.events.has(type)) this.events.set(type,[]); this.events.get(type).push(fn); }
    emit(type,event={}) { return Promise.all((this.events.get(type)||[]).map(fn=>fn(event))); }
    querySelector(selector) { return get(`${this.id}:${selector}`); }
    querySelectorAll() { return [get("#invitation-video"), get("#tv-screen-play"), get("#tv-close-expanded")]; }
    getClientRects() { return this.hidden ? [] : [{}]; }
    focus() { document.activeElement = this; }
    scrollIntoView(options) { this.scroll = options; }
  }
  function get(selector) { if (!nodes.has(selector)) nodes.set(selector,new Element(selector)); return nodes.get(selector); }
  document = { hidden: false, activeElement: null, fullscreenEnabled: nativeFullscreen, fullscreenElement: null,
    querySelector: get, getElementById: id => get(`#${id}`),
    querySelectorAll: selector => selector.startsWith("audio") ? [get("#background-music")] : [get("#cover"),get("#tv-remote"),get(".parents-section"),get(".event-section"),get(".team-section"),get(".capsule-section"),get(".attendance-section")],
    addEventListener(type,fn) { if (!documentEvents.has(type)) documentEvents.set(type,[]); documentEvents.get(type).push(fn); },
    emit(type,event={}) { return Promise.all((documentEvents.get(type)||[]).map(fn=>fn(event))); },
    async exitFullscreen() { this.fullscreenElement=null; await this.emit("fullscreenchange"); }
  };
  const video = get("#invitation-video");
  Object.assign(video,{ paused:true, ended:false, duration:99.18, currentTime:0, videoWidth:624, videoHeight:352, volume:1, error:null, playCalls:0, loadCalls:0 });
  let muted = false;
  Object.defineProperty(video,"muted",{get:()=>muted,set:value=>{muted=value; video.emit("volumechange");}});
  video.playFailure = blocked ? {name:"NotAllowedError"} : null;
  video.play = function() {
    this.playCalls++;
    if(this.playFailure) return Promise.reject(this.playFailure);
    if(this.ended) { this.currentTime=0; this.ended=false; }
    this.paused=false; this.emit("play"); this.emit("playing");
    return this.pendingPlay || Promise.resolve();
  };
  video.pause = function() { const wasPlaying=!this.paused; this.paused=true; if(wasPlaying) this.emit("pause"); };
  video.load = function() { this.loadCalls++; this.error=null; this.currentTime=0; this.emit("loadedmetadata"); };
  const music = get("#background-music");
  Object.assign(music,{tagName:"AUDIO",paused:false,playCalls:0,pause(){this.paused=true;},play(){this.paused=false;this.playCalls++;return Promise.resolve();}});
  for(const id of ["#tv-ending","#tv-play-overlay","#tv-error","#tv-interference","#tv-close-expanded"]) get(id).hidden=true;
  const media = {matches:reduced,addEventListener(type,fn){this.change=fn;}};
  const window = { INVITATION_CONFIG:{video:{src:"assets/test.mp4",width:624,height:352},backgroundMusicId:"background-music"},
    matchMedia:()=>media, setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;}, clearTimeout:id=>timers.delete(id), addEventListener(){}, IntersectionObserver:true };
  class IntersectionObserver { constructor(fn){visibilityObserver=fn;} observe(){} }
  if(nativeFullscreen) get("#tv-screen").requestFullscreen=async()=>{document.fullscreenElement=get("#tv-screen"); await document.emit("fullscreenchange");};
  vm.runInNewContext(source,{window,document,IntersectionObserver,console});
  return {get,video,music,media,timers,document,
    async click(id){await get(id).emit("click",{preventDefault(){}}); await Promise.resolve();},
    async boot(){const timer=[...timers.entries()][0]; assert.ok(timer); timers.delete(timer[0]); timer[1].fn(); await Promise.resolve(); await Promise.resolve();},
    visible(value){visibilityObserver([{isIntersecting:true,intersectionRatio:value?1:0}]);}
  };
}

(async()=>{
  const tv=setup();
  assert.equal(tv.video.playCalls,0,"La carga inicial no debe reproducir");
  await tv.click("#tv-power");
  assert.equal(tv.get("#tv-interference").hidden,false);
  assert.equal([...tv.timers.values()][0].delay,500);
  await tv.click("#tv-power");
  assert.equal(tv.timers.size,0,"Apagar durante la interferencia cancela el encendido");
  assert.equal(tv.video.playCalls,0);
  await tv.click("#tv-power"); await tv.boot();
  assert.equal(tv.video.paused,false);
  assert.equal(tv.get("#tv-play-pause").getAttribute("aria-label"),"Pausar video");
  assert.equal(tv.music.paused,true,"El video con sonido pausa la música");
  tv.video.currentTime=42;
  await tv.click("#tv-power");
  assert.equal(tv.video.currentTime,42);
  assert.equal(tv.video.paused,true);
  await tv.click("#tv-power"); await tv.boot();
  assert.equal(tv.video.currentTime,42,"Volver a encender no reinicia");
  await tv.click("#tv-sound");
  assert.equal(tv.video.muted,true);
  assert.equal(tv.get("#tv-sound").getAttribute("aria-label"),"Activar sonido");
  assert.equal(tv.music.paused,false,"Silenciar devuelve la música previa");
  tv.visible(false);
  assert.equal(tv.video.paused,true,"El borde de la sección con cero área visible pausa");
  tv.visible(true);
  assert.equal(tv.video.paused,true,"Volver a la sección no debe reproducir automáticamente");
  await tv.click("#tv-play-pause");
  tv.document.hidden=true; await tv.document.emit("visibilitychange");
  assert.equal(tv.video.paused,true);
  tv.document.hidden=false;
  tv.video.currentTime=tv.video.duration; tv.video.ended=true;
  await tv.video.emit("ended");
  assert.equal(tv.get("#tv-ending").hidden,false);
  await tv.click("#tv-team");
  assert.equal(tv.document.activeElement,tv.get("#vote-section"),"La TV conserva el destino hacia la elección de equipo");
  assert.equal(tv.get("#vote-section").scroll.behavior,"smooth");
  assert.equal(tv.video.currentTime,99.18,"El final conserva el último fotograma");
  assert.equal(tv.video.loadCalls,0);
  await tv.click("#tv-restart");
  assert.equal(tv.video.currentTime,0);
  assert.equal(tv.video.paused,false);
  await tv.click("#tv-expand");
  assert.equal(tv.get("#tv-screen").getAttribute("aria-modal"),"true");
  assert.equal(tv.get("#cover").inert,true);
  assert.equal(tv.get(".parents-section").inert,true,"La ampliación de TV también retira del foco la nueva sección");
  assert.equal(tv.get(".event-section").inert,true);
  assert.equal(tv.get(".team-section").inert,true,"La elección de equipo queda fuera del foco durante la ampliación");
  assert.equal(tv.get(".capsule-section").inert,true);
  assert.equal(tv.get(".attendance-section").inert,true);
  assert.equal(tv.video.controls,true);
  await tv.document.emit("keydown",{key:"Escape",preventDefault(){}});
  assert.equal(tv.get("#tv-screen").classList.contains("is-expanded"),false);
  assert.equal(tv.get("#cover").inert,false);
  assert.equal(tv.get(".parents-section").inert,false);
  assert.equal(tv.get(".event-section").inert,false);
  assert.equal(tv.get(".team-section").inert,false);
  assert.equal(tv.get(".capsule-section").inert,false);
  assert.equal(tv.get(".attendance-section").inert,false);
  assert.equal(tv.document.activeElement,tv.get("#tv-expand"));

  const blocked=setup({blocked:true});
  await blocked.click("#tv-power"); await blocked.boot();
  assert.equal(blocked.get("#tv-play-overlay").hidden,false);
  blocked.video.playFailure=null;
  await blocked.click("#tv-screen-play");
  assert.equal(blocked.video.paused,false,"Otro toque desbloquea la reproducción");
  blocked.video.error={code:4}; await blocked.video.emit("error");
  assert.equal(blocked.get("#tv-error").hidden,false);
  assert.equal(blocked.get("#tv-restart").disabled,true);
  await blocked.click("#tv-retry"); await blocked.boot();
  assert.equal(blocked.video.paused,false);
  assert.equal(blocked.get("#tv-error").hidden,true);

  const reduced=setup({reduced:true});
  await reduced.click("#tv-power");
  assert.equal([...reduced.timers.values()][0].delay,120);
  const native=setup({nativeFullscreen:true});
  await native.click("#tv-expand");
  assert.equal(native.document.fullscreenElement,native.get("#tv-screen"));
  await native.click("#tv-close-expanded");
  assert.equal(native.document.fullscreenElement,null);
  assert.equal(native.video.controls,false);

  const race=setup();
  let resolvePlay;
  race.video.pendingPlay=new Promise(resolve=>{resolvePlay=resolve;});
  await race.click("#tv-power"); await race.boot();
  await race.click("#tv-power"); resolvePlay(); await Promise.resolve();
  assert.equal(race.video.paused,true,"Una promesa tardía no reactiva una TV apagada");
  console.log("OK: encendido, cancelación, posición, reproducción, sonido, música, visibilidad, último fotograma, repetición, bloqueo de autoplay, reintento, ampliación, foco, movimiento reducido y promesas tardías.");
})().catch(error=>{console.error(error);process.exitCode=1;});
