const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../capsule-core.js');
const source=fs.readFileSync(path.join(__dirname,'../capsule.js'),'utf8');
const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
const store=core.createStore('evento con espacios',storage);
assert.equal(store.save(core.empty(),'girl'),null,'Una cápsula sin respuestas no se guarda');
assert.equal(core.validDate('2026-02-29'),false);assert.equal(core.validDate('2028-02-29'),true);
assert.equal(core.validDate('2026-04-31'),false);
assert.match(core.formatDate('2027-01-01'),/1 de enero de 2027/,'La fecha no cambia por la zona local');
assert.equal(core.rangeText({earliest:'2027-02-02',latest:'2027-01-01'}),'');
assert.match(core.rangeText({earliest:'2027-01-01',latest:'2027-02-01'}),/del .* al/);
const dangerous='<img src=x onerror=alert(1)>';
store.save({name:dangerous,arrivalDate:'2027-01-01',guestName:' Ana '},null,new Date('2026-10-05T18:00:00Z'));
assert.equal(store.get().guestName,'Ana');assert.equal(store.get().answers.name,dangerous);
const copy=store.get();copy.answers.name='changed';assert.equal(store.get().answers.name,dangerous);
store.updateTeam('boy');assert.equal(store.get().answers.name,dangerous);
assert.equal(core.createStore('evento con espacios',storage).get().team,'boy');
assert.equal(core.createStore('otro evento',storage).get(),null);
for(const text of ['{','null',JSON.stringify({...store.get(),eventId:'different'}),JSON.stringify({...store.get(),savedAt:'invalid'})]){
  data.set(store.key,text);assert.equal(core.createStore(store.eventId,storage).get(),null);
}
assert.equal(core.clean({name:'x'.repeat(130),guestName:'y'.repeat(90),resemblance:'__proto__',arrivalDate:'wrong'}).name.length,100);
const blockedStore=core.createStore('blocked',{getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}});
blockedStore.save({name:'Luna'},'girl');assert.equal(blockedStore.get().answers.name,'Luna');assert.equal(blockedStore.isPersisted(),false);
assert.equal(blockedStore.clear(),false);assert.equal(blockedStore.get(),null);

function setup({reduced=false,blocked=false,savedData=new Map(),selectedTeam=null,eventId='test'}={}){
  const nodes=new Map(),timers=new Map(),published=[];let document,nextTimer=0;
  class Element{
    constructor(id){this.id=id;this.events=new Map();this.dataset={};this.hidden=false;this.disabled=false;this.checked=false;this.value='';this.textContent='';this.firstChild={textContent:''};this.classes=new Set();this.classList={toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
    addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push(fn);}
    emit(type,extra={}){const e={preventDefault(){this.prevented=true;},target:this,...extra};for(const fn of this.events.get(type)||[])fn(e);return e;}
    focus(){document.activeElement=this;this.emit('focus');}scrollIntoView(options){this.scroll=options;}
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
  const cards=[0,1,2].map(i=>get('capsule-card-'+i)),dots=[0,1,2].map(i=>get('dot'+i));
  const radios=['mom','dad','both','own'].map(value=>{const r=get('radio-'+value);r.value=value;return r;});
  document=new Element('document');document.hidden=false;document.getElementById=get;document.querySelector=()=>get('baby-predictions');
  get('baby-predictions').querySelectorAll=selector=>selector==='[data-card]'?cards:selector==='[data-dot]'?dots:radios;
  const media={matches:reduced,addEventListener(type,fn){this.change=fn;}};
  const window=new Element('window');
  Object.assign(window,{InvitationCapsuleCore:core,INVITATION_CONFIG:{capsule:{arrivalRange:{earliest:'2027-01-01',latest:'2027-02-01'},nextSectionId:'attendance-section'}},
    InvitationTeam:{eventId,getSelection:()=>selectedTeam?{team:selectedTeam}:null},matchMedia:()=>media,
    visualViewport:new Element('viewport'),setTimeout:(fn,delay)=>{timers.set(++nextTimer,{fn,delay});return nextTimer;},clearTimeout:id=>timers.delete(id),dispatchEvent:e=>published.push(e)});
  Object.defineProperty(window,'localStorage',{get(){if(blocked)throw Error();return{getItem:k=>savedData.get(k),setItem:(k,v)=>savedData.set(k,v),removeItem:k=>savedData.delete(k)};}});
  class CustomEvent{constructor(type,options){this.type=type;this.detail=options.detail;}}
  vm.runInNewContext(source,{window,document,CustomEvent,console});
  return{get,cards,radios,window,document,timers,published,media,savedData,
    click:id=>get(id).emit('click'),input:(id,value)=>{get(id).value=value;get(id).emit('input');},
    radio:value=>{radios.forEach(r=>r.checked=r.value===value);get('radio-'+value).emit('change');},
    changeTeam:value=>{selectedTeam=value;window.emit('invitation:team-changed');},
    finish(){for(const[id,timer]of[...timers]){timers.delete(id);timer.fn();}}
  };
}

const ui=setup();assert.equal(ui.get('capsule-counter').textContent,'Tarjeta 1 de 3');
ui.radio('both');assert.equal(ui.get('capsule-stamp').hidden,false);
ui.click('capsule-next');ui.input('capsule-baby-name',dangerous);
assert.equal(ui.get('capsule-characters').textContent,`Quedan ${100-dangerous.length} caracteres`);
ui.click('capsule-back');assert.equal(ui.radios.find(r=>r.value==='both').checked,true);
ui.click('capsule-next');assert.equal(ui.get('capsule-baby-name').value,dangerous);
ui.click('capsule-next');ui.input('capsule-arrival','2027-01-12');
assert.equal(ui.get('capsule-date-day').textContent,'12');
assert.match(ui.get('capsule-arrival-range').textContent,/Orientación/);
ui.click('capsule-next');assert.equal(ui.get('capsule-answer-name').textContent,dangerous,'El resumen utiliza texto literal');
assert.equal(ui.get('capsule-summary-team').hidden,true,'No se exige equipo');
ui.input('capsule-guest-name','Ana');ui.changeTeam('girl');assert.equal(ui.get('capsule-answer-name').textContent,dangerous);
ui.click('capsule-save');ui.click('capsule-save');assert.equal(ui.published.filter(event=>event.type==='invitation:capsule-changed').length,1,'Guardar dos veces no repite la secuencia');
assert.equal([...ui.timers.values()][0].delay,1500);assert.equal(ui.get('baby-predictions').dataset.mode,'saving');
assert.equal(ui.get('capsule-storage-note').hidden,true,'El mensaje final aparece al terminar la secuencia');
ui.finish();assert.equal(ui.get('baby-predictions').dataset.mode,'saved');assert.equal(ui.get('capsule-open').hidden,false);
assert.equal(ui.get('capsule-chest-tag').textContent,'Ana');assert.match(ui.get('capsule-storage-note').textContent,/este dispositivo/);
assert.equal(ui.document.activeElement,ui.get('capsule-open'));
const reload=setup({savedData:ui.savedData,selectedTeam:'girl'});
assert.equal(reload.get('baby-predictions').dataset.mode,'saved');assert.equal(reload.timers.size,0);assert.equal(reload.document.activeElement,undefined);
reload.click('capsule-open');assert.equal(reload.get('capsule-answer-name').textContent,dangerous);
reload.changeTeam('boy');assert.equal(reload.get('capsule-summary-team').textContent,'Equipo niño');
assert.equal(reload.window.InvitationCapsule.getCapsule().answers.name,dangerous);
assert.equal(reload.window.InvitationCapsule.getCapsule().team,'boy');
reload.click('capsule-edit');reload.click('capsule-next');reload.input('capsule-baby-name','Luna');
reload.changeTeam(null);assert.equal(reload.get('capsule-baby-name').value,'Luna','Cambiar el equipo conserva incluso la edición en curso');
reload.click('capsule-next');reload.click('capsule-next');reload.click('capsule-save');reload.finish();
assert.equal(reload.window.InvitationCapsule.getCapsule().answers.name,'Luna');
assert.equal(reload.window.InvitationCapsule.getGuestName(),'Ana');
reload.window.InvitationCapsule.setGuestName('Ana García',{source:'attendance'});
assert.equal(reload.get('capsule-guest-name').value,'Ana García');assert.equal(reload.window.InvitationCapsule.getCapsule().answers.name,'Luna','La asistencia sincroniza el nombre sin borrar predicciones');
assert.equal(reload.window.InvitationCapsule.getCapsule().guestName,'Ana García');
assert.equal(reload.published.at(-1).detail.source,'attendance');
reload.click('capsule-open');reload.click('capsule-delete');assert.equal(reload.get('capsule-delete-confirm').hidden,false);
reload.click('capsule-delete-cancel');assert.notEqual(reload.window.InvitationCapsule.getCapsule(),null);
reload.click('capsule-delete');reload.click('capsule-delete-yes');assert.equal(reload.window.InvitationCapsule.getCapsule(),null);
assert.equal(reload.get('capsule-baby-name').value,'');assert.equal(reload.get('baby-predictions').dataset.mode,'cards');

const empty=setup({reduced:true});for(let i=0;i<3;i++)empty.click('capsule-skip');
for(const id of ['resemblance','name','arrival'])assert.equal(empty.get('capsule-answer-'+id).textContent,'Sin predicción');
assert.equal(empty.get('capsule-empty-note').hidden,false);assert.equal(empty.get('capsule-save').disabled,true);
empty.click('capsule-attendance');assert.equal(empty.document.activeElement,empty.get('attendance-section'));assert.equal(empty.get('attendance-section').scroll.behavior,'instant');
assert.equal(empty.window.InvitationCapsule.getCapsule(),null);
const memory=setup({blocked:true,reduced:true});memory.click('capsule-next');memory.input('capsule-baby-name','Sol');
memory.click('capsule-next');memory.get('capsule-arrival-undecided').checked=true;memory.get('capsule-arrival-undecided').emit('change');memory.click('capsule-next');
memory.window.InvitationCapsule.registerCapsule=()=>{throw Error();};memory.click('capsule-save');
assert.equal(memory.get('baby-predictions').dataset.mode,'saved');assert.equal(memory.timers.size,0);assert.match(memory.get('capsule-storage-note').textContent,/No permanecerá/);
assert.equal(memory.window.InvitationCapsule.getCapsule().answers.name,'Sol');
memory.click('capsule-open');memory.input('capsule-guest-name','Eva');memory.click('capsule-close');memory.click('capsule-open');assert.equal(memory.get('capsule-guest-name').value,'Eva','Abrir/cerrar conserva la edición en memoria');
const visibility=setup();visibility.radio('mom');visibility.click('capsule-next');visibility.click('capsule-next');visibility.click('capsule-next');visibility.click('capsule-save');
visibility.document.hidden=true;visibility.document.emit('visibilitychange');assert.equal(visibility.get('baby-predictions').dataset.mode,'saved');assert.equal(visibility.timers.size,0);
assert.equal(visibility.get('capsule-form').emit('submit').prevented,true,'Enter en un campo no recarga la página');
console.log('OK: tarjetas, omisiones, límites, fechas, texto seguro, guardado único de 1.5 s, edición, borrado/cancelación, recarga por evento, sincronización del equipo, memoria, foco y movimiento reducido.');
