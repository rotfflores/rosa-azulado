const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../event-core.js");
const {TextEncoder} = require("node:util");
// Son datos ficticios exclusivos de las pruebas; config.js conserva los datos pendientes.
const fixture = {name:"Revelación, bebé; prueba",timeZone:"America/Mexico_City",start:"2027-10-20T17:30:00-06:00",end:"2027-10-20T20:00:00-06:00",venue:"Lugar de prueba",address:"Calle de prueba 123",note:"Primera línea\nSegunda línea",description:"Descripción de prueba con acentos y texto extenso. ".repeat(5),dressCode:{enabled:true,text:"Texto editable"}};
const event = core.normalize(fixture);
assert.equal(event.canSave,true);
assert.equal(core.explicitDate("2027-10-20T17:30:00"),null,"No acepta horas sin desfase");
assert.equal(core.explicitDate("2027-02-29T17:30:00Z"),null,"No normaliza fechas inexistentes");
assert.equal(core.explicitDate("2028-02-29T17:30:00Z").getUTCDate(),29);
assert.equal(core.explicitZone("Zona/Inventada"),null);
assert.equal(core.normalize({...fixture,timeZone:""}).canSave,false);
for (const change of [{start:""},{end:""},{end:fixture.start},{end:"2027-10-19T20:00:00-06:00"},{name:""},{venue:"",address:""},{description:""}]) {
  assert.equal(core.calendarFile(core.normalize({...fixture,...change})),null,"Datos incompletos no generan archivos");
}
assert.equal(core.countdown(core.normalize({}),new Date()).state,"pending");
assert.deepEqual(core.countdown(event,new Date("2027-10-19T16:28:57-06:00")).values,{days:1,hours:1,minutes:1,seconds:3});
assert.equal(core.countdown(event,new Date("2027-10-20T17:30:00-06:00")).state,"today");
assert.equal(core.countdown(event,new Date("2027-10-21T00:00:00Z")).state,"today","La medianoche UTC aún es el día del evento en México");
assert.equal(core.countdown(event,new Date("2027-10-21T00:00:00-06:00")).state,"past");
assert.equal(core.nextDayBoundary(new Date("2027-10-20T17:30:00-06:00"),event.zone),Date.parse("2027-10-21T00:00:00-06:00"));
assert.equal(core.nextDayBoundary(new Date("2027-03-14T00:00:00-05:00"),"America/New_York"),Date.parse("2027-03-15T00:00:00-04:00"),"Respeta un día de 23 horas");
assert.equal(core.nextDayBoundary(new Date("2027-11-07T00:00:00-04:00"),"America/New_York"),Date.parse("2027-11-08T00:00:00-05:00"),"Respeta un día de 25 horas");
assert.equal(core.mapsLink("javascript:alert(1)",""),"");
assert.equal(core.mapsLink("https://google.com.ejemplo.com/maps/test",""),"");
assert.equal(core.mapsLink("https://maps.app.goo.gl/test",""),"https://maps.app.goo.gl/test");
assert.match(core.mapsLink("","Calle A & B"),/query=Calle%20A%20%26%20B/);
const ics = core.calendarFile(event,new Date("2026-10-05T00:00:00Z"));
const unfolded = ics.replace(/\r\n /g,"");
assert.match(unfolded,/DTSTART:20271020T233000Z\r\n/);
assert.match(unfolded,/DTEND:20271021T020000Z\r\n/);
assert.match(unfolded,/SUMMARY:Revelación\\, bebé\\; prueba/);
assert.match(unfolded,/DESCRIPTION:.*Primera línea\\nSegunda línea/);
assert.match(unfolded,/LOCATION:Lugar de prueba\\, Calle de prueba 123/);
assert.equal(ics.endsWith("END:VCALENDAR\r\n"),true);
for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line,"utf8") <= 75,"Pliega líneas sin partir caracteres UTF-8");
assert.equal(new Intl.DateTimeFormat("en",{timeZone:fixture.timeZone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date("2027-10-20T23:30:00Z")),"17:30","La importación UTC conserva la hora local");

function uiSetup({eventConfig = fixture,reduced = false,now = "2027-10-20T23:29:58Z"} = {}) {
  const nodes = new Map(), timers = new Map(), downloads = [], windows = new Map();
  let document, timerId = 0, clock = Date.parse(now);
  class Node {
    constructor(id) { this.id=id; this.textContent=""; this.hidden=true; this.disabled=false; this.dataset={}; this.events=new Map(); this.attrs=new Map(); this.classes=new Set(); this.firstChild={textContent:"Ver detalles "}; this.style={setProperty(){}}; this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c)}; }
    addEventListener(type,fn) { if(!this.events.has(type)) this.events.set(type,[]); this.events.get(type).push(fn); }
    emit(type,event={}) { for(const fn of this.events.get(type)||[]) fn({preventDefault(){},...event}); }
    setAttribute(k,v) { this.attrs.set(k,String(v)); }
    hasAttribute(k) { return this.attrs.has(k); }
    getAttribute(k) { return this.attrs.get(k); }
    focus() { document.activeElement=this; }
    scrollIntoView(value) { this.scroll=value; }
    click() { downloads.push(this); }
    remove() { this.removed=true; }
  }
  const get = id => {if(!nodes.has(id)) nodes.set(id,new Node(id)); return nodes.get(id);};
  const numbers = ["days","hours","minutes","seconds"].map(key=>{const e=get(key); e.dataset.countdown=key; e.textContent="--"; return e;});
  document=new Node("document");
  document.hidden=false; document.querySelector=selector=>get(selector.slice(1)); document.querySelectorAll=()=>numbers; document.getElementById=get;
  document.createElement=()=>new Node("download"); document.body={appendChild(){}};
  get("desk-calendar").dataset.open="false";
  const media={matches:reduced,addEventListener(type,fn){this.change=fn;}};
  const window={INVITATION_CONFIG:{event:eventConfig},InvitationEvent:core,matchMedia:()=>media,setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;},clearTimeout:id=>timers.delete(id),addEventListener:(type,fn)=>windows.set(type,fn)};
  class ClockDate extends Date {constructor(...args){super(...(args.length?args:[clock]));} }
  class DownloadURL extends URL {static createObjectURL(blob){this.blob=blob;return "blob:test";} static revokeObjectURL(url){this.revoked=url;} }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../event.js"),"utf8"),{window,document,Date:ClockDate,URL:DownloadURL,Blob,console});
  return {get,numbers,document,timers,downloads,media,DownloadURL,
    click:id=>get(id).emit("click"),
    advance(ms){clock+=ms; const [id,timer]=[...timers].find(([,t])=>t.delay<=1000)||[]; if(timer){timers.delete(id);timer.fn();}},
    finishClose(){for(const [id,t] of [...timers]) if(t.delay===390){timers.delete(id);t.fn();}}
  };
}
const ui=uiSetup();
assert.equal(ui.get("event-save-date").disabled,false);
assert.equal(ui.get("event-dress-code").hidden,false);
ui.click("event-calendar-tab");
assert.equal(ui.get("event-details").hidden,false);
assert.equal(ui.get("event-calendar-tab").getAttribute("aria-expanded"),"true");
ui.click("event-details-button"); ui.click("event-calendar-tab"); ui.finishClose();
assert.equal(ui.get("event-details").hidden,false,"Cerrar y reabrir rápido no oculta los detalles");
ui.click("event-details-button"); ui.finishClose();
assert.equal(ui.get("event-details").hidden,true);
ui.click("event-pin"); assert.equal(ui.get("event-location-address").hidden,false);
ui.click("event-pin"); assert.equal(ui.get("event-location-address").hidden,true);
ui.advance(1000);
assert.equal(ui.numbers[3].classList.contains("is-flipping"),true);
assert.equal(ui.numbers[0].classList.contains("is-flipping"),false,"Sólo cambia la hoja de segundos");
ui.advance(1000);
assert.equal(ui.get("event-countdown-message").textContent,"¡Hoy compartimos la gran sorpresa!");
assert.ok([...ui.timers.values()].every(t=>t.delay>1000),"Al llegar a cero deja de actualizar cada segundo");
ui.click("event-save-date");
assert.equal(ui.downloads[0].download,"nuestra-cita-con-la-sorpresa.ics");
assert.equal(ui.DownloadURL.blob.type,"text/calendar;charset=utf-8");
ui.click("event-prediction");
assert.equal(ui.document.activeElement,ui.get("vote-section"));
const pending=uiSetup({eventConfig:{},reduced:true});
assert.equal(pending.get("event-save-date").disabled,true);
assert.equal(pending.get("event-map-link").hidden,true);
assert.equal(pending.get("event-dress-code").hidden,true);
assert.equal(pending.get("event-countdown-message").textContent,"Pronto tendremos fecha");
pending.click("event-save-date"); assert.equal(pending.downloads.length,0);
pending.click("event-calendar-tab"); pending.click("event-details-button");
assert.equal(pending.get("event-details").hidden,true,"Movimiento reducido cierra sin esperar");
ui.document.hidden=true; ui.document.emit("visibilitychange"); assert.equal(ui.timers.size,1,"Sólo queda la limpieza de la URL de descarga, sin contador en segundo plano");
console.log("OK: pendientes, fecha explícita, zona horaria, cuenta regresiva, cero, día posterior, cambios de horario, hoja individual, detalles, dirección, Maps, vestimenta, descarga .ics, UTF-8 y movimiento reducido.");
