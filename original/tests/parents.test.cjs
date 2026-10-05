// Comprueba los gestos y el foco sin instalar dependencias ni modificar el navegador.
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const source = fs.readFileSync(path.join(__dirname, "../parents.js"), "utf8");

function setup({ reduced = false, restored = false, blockedStorage = false, nativeModal = true, photo = "" } = {}) {
  const nodes = new Map(), timers = new Map(), stored = new Map();
  let document, timerId = 0, observer;
  class Element {
    constructor(id) {
      this.id = id; this.events = new Map(); this.attrs = new Map(); this.dataset = {}; this.properties = new Map();
      this.disabled = false; this.hidden = false; this.inert = false; this.isConnected = true;
      this.classes = new Set(); this.textContent = "";
      this.classList = { add: c => this.classes.add(c), remove: c => this.classes.delete(c), contains: c => this.classes.has(c) };
      this.style = { setProperty: (k,v) => this.properties.set(k,v) };
    }
    addEventListener(type,fn) { if (!this.events.has(type)) this.events.set(type,[]); this.events.get(type).push(fn); }
    emit(type,event = {}) { for (const fn of this.events.get(type) || []) fn({preventDefault(){},target:this,...event}); }
    setAttribute(k,v) { this.attrs.set(k,String(v)); }
    removeAttribute(k) { this.attrs.delete(k); }
    hasAttribute(k) { return this.attrs.has(k); }
    getAttribute(k) { return this.attrs.get(k) ?? null; }
    getBoundingClientRect() { return {width:340,left:20,right:360,top:20,bottom:450}; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture(id) { this.capture = null; this.emit("lostpointercapture",{pointerId:id}); }
    focus() { document.activeElement = this; }
    scrollIntoView(options) { this.scroll = options; }
  }
  const get = selector => { if (!nodes.has(selector)) nodes.set(selector,new Element(selector)); return nodes.get(selector); };
  const clouds = Array.from({length:8}, (_,i) => {const e=get(`cloud-${i+1}`); e.dataset.cloud=String(i+1); return e;});
  const story = [get("#parents-title"),get("#parents-copy"),get("#parents-signature")];
  document = new Element("document");
  document.querySelector = get;
  document.querySelectorAll = selector => selector === ".photo-cloud" ? clouds : story;
  document.getElementById = id => get(`#${id}`);
  document.body = get("body");
  document.body.children = [get("main"),get("status"),get("#family-photo-dialog")];
  get("status").inert = true;
  get("#family-photo-opener").disabled = true;
  get("#family-photo-image").hidden = true;
  get("#family-photo-outcome").hidden = true;
  get("#invitation-video").pause = () => {get("#invitation-video").paused = true;};
  const dialog = get("#family-photo-dialog");
  if (nativeModal) {
    dialog.showModal = () => dialog.setAttribute("open", "");
    dialog.close = () => {dialog.removeAttribute("open"); dialog.emit("close");};
  }
  const media = {matches:reduced,addEventListener(type,fn){this.change=fn;}};
  const window = {INVITATION_CONFIG:{names:{mom:"Mamá",dad:"Papá"},parentsMessage:{title:"Título editable",text:"<b>Mensaje seguro</b>"},familyPhoto:{src:photo,alt:"Foto de {mom} y {dad}",width:600,height:800},eventSectionId:"event-section"},
    matchMedia:()=>media,IntersectionObserver:true,setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay}); return timerId;},clearTimeout:id=>timers.delete(id)};
  if (restored) stored.set("baby-invitation-photo-revealed","yes");
  const sessionStorage = {getItem:k=>{if(blockedStorage)throw Error(); return stored.get(k);},setItem:(k,v)=>{if(blockedStorage)throw Error(); stored.set(k,v);}};
  class IntersectionObserver {constructor(fn){observer=fn;} observe(){} unobserve(){} }
  vm.runInNewContext(source,{window,document,sessionStorage,IntersectionObserver,performance:{now:()=>10},console});
  return {get,clouds,document,media,stored,timers,
    click:e=>e.emit("click",{detail:0}),
    finish(){for(const [id,timer] of [...timers]){timers.delete(id); timer.fn();}},
    drag(i,dx,dy=0,{cancel=false,touch=false}={}) {
      const cloud=clouds[i];
      cloud.emit("pointerdown",{pointerId:1,clientX:100,clientY:100,button:0,isPrimary:true,pointerType:touch?"touch":"mouse"});
      cloud.emit("pointermove",{pointerId:1,clientX:100+dx,clientY:100+dy});
      cloud.emit(cancel?"pointercancel":"pointerup",{pointerId:1,clientX:100+dx,clientY:100+dy});
    },
    enter(){observer(story.map(target=>({target,isIntersecting:true})));}
  };
}

const gestures = setup();
gestures.drag(0,20);
assert.equal(gestures.clouds[0].disabled,false,"Un arrastre corto vuelve a su lugar");
gestures.drag(0,90,0,{cancel:true});
assert.equal(gestures.clouds[0].disabled,false,"Cancelar el gesto no descubre la foto");
gestures.drag(0,90);
assert.equal(gestures.clouds[0].disabled,true,"Arrastrar con mouse retira una nube");
gestures.drag(1,0,-75,{touch:true});
assert.equal(gestures.clouds[1].disabled,true,"El gesto táctil también admite dirección vertical");
gestures.drag(2,0,0,{touch:true});
assert.equal(gestures.clouds[2].disabled,true,"Un toque retira una nube sin arrastrar");
gestures.clouds[2].emit("click",{detail:1});
assert.match(gestures.get("#family-photo-status").textContent,/3 de 8/,"El clic posterior no cuenta dos veces");
gestures.click(gestures.clouds[3]);
assert.equal(gestures.timers.size,0,"La mitad de las nubes aún no dispara el final");
gestures.clouds[4].focus(); gestures.click(gestures.clouds[4]);
assert.equal(gestures.clouds.every(c=>c.disabled),true,"La mayoría dispersa las restantes");
gestures.finish();
assert.equal(gestures.get("#cloud-layer").hidden,true);
assert.equal(gestures.get("#family-photo-outcome").hidden,false);
assert.equal(gestures.document.activeElement,gestures.get("#family-photo-opener"));
assert.equal(gestures.stored.get("baby-invitation-photo-revealed"),"yes");

const direct=setup();
direct.click(direct.get("#view-family-photo"));
direct.click(direct.get("#view-family-photo"));
assert.equal(direct.timers.size,1,"La alternativa directa se ejecuta una sola vez");
direct.finish();
assert.equal(direct.get("#view-family-photo").hidden,true);
assert.equal(direct.get("#family-photo-image").src,undefined,"Sin foto no se inventa una imagen");
direct.click(direct.get("#family-photo-opener"));
assert.equal(direct.get("#family-photo-dialog").hasAttribute("open"),true);
assert.equal(direct.get("main").inert,true);
assert.equal(direct.get("#invitation-video").paused,true);
direct.document.emit("keydown",{key:"Tab"});
assert.equal(direct.document.activeElement,direct.get("#close-family-photo"));
direct.document.emit("keydown",{key:"Escape"});
assert.equal(direct.get("#family-photo-dialog").hasAttribute("open"),false);
assert.equal(direct.get("main").inert,false);
assert.equal(direct.get("status").inert,true,"Restaura el estado previo del fondo");
assert.equal(direct.document.activeElement,direct.get("#family-photo-opener"));

const fallback=setup({nativeModal:false,reduced:true,blockedStorage:true,photo:"assets/foto-real.jpg"});
assert.equal(fallback.get("#family-photo-image").hidden,false,"Una foto configurada debe tener área visible para cargar con lazy loading");
fallback.get("#family-photo-image").emit("load");
fallback.click(fallback.get("#view-family-photo"));
assert.equal(fallback.timers.size,0,"Movimiento reducido descubre sin animación");
fallback.click(fallback.get("#family-photo-opener"));
assert.equal(fallback.get("#family-photo-large").src,"assets/foto-real.jpg");
assert.equal(fallback.get("#family-photo-modal-placeholder").hidden,true);
assert.equal(fallback.get("#family-photo-dialog").classList.contains("is-fallback-open"),true);
fallback.get("#family-photo-image").emit("error");
assert.equal(fallback.get("#family-photo-modal-placeholder").hidden,false,"Una imagen fallida vuelve al espacio reservado");
fallback.click(fallback.get("#close-family-photo"));
assert.equal(fallback.get("#family-photo-dialog").hasAttribute("open"),false);
fallback.click(fallback.get("#parents-event"));
assert.equal(fallback.document.activeElement,fallback.get("#event-section"));
assert.equal(fallback.get("#event-section").scroll.behavior,"instant");

const restored=setup({restored:true});
assert.equal(restored.get("#cloud-layer").hidden,true,"Recargar conserva la fotografía descubierta");
assert.equal(restored.document.activeElement,undefined,"Restaurar no roba el foco");
assert.equal(restored.get("#parents-signature").textContent,"Con amor, Mamá y Papá.");
assert.equal(restored.get("#parents-copy").textContent,"<b>Mensaje seguro</b>");
restored.enter();
assert.equal(restored.get("#parents-title").classList.contains("is-visible"),true);
const motionChange=setup();
motionChange.click(motionChange.get("#view-family-photo"));
motionChange.media.matches=true; motionChange.media.change();
assert.equal(motionChange.get("#cloud-layer").hidden,true,"Cambiar la preferencia termina una animación en curso");
console.log("OK: arrastre con mouse/toque, cancelación, clic, teclado, mayoría, alternativa directa, persistencia, mensaje editable, foto real/fallida, modal nativo/alternativo, Escape, foco y movimiento reducido.");
