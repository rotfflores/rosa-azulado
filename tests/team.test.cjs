// Gestos y persistencia con DOM simulado; sin dependencias ni servicios externos.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const core = require('../team-core.js');
const source = fs.readFileSync(path.join(__dirname,'../team.js'),'utf8');
const saved = new Map();
const storage = {getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
const store = core.createStore('evento A',storage);
assert.equal(store.get(),null);
assert.equal(store.confirm('invalid'),null);
store.confirm('girl',new Date('2026-10-05T18:00:00Z'));
assert.equal(core.createStore('evento A',storage).get().team,'girl');
assert.equal(core.createStore('evento B',storage).get(),null,'Cada evento tiene su propia elección');
const copy=store.get(); copy.team='boy'; assert.equal(store.get().team,'girl');
saved.set(store.key,JSON.stringify({...store.get(),eventId:'otro evento'}));
assert.equal(core.createStore('evento A',storage).get(),null,'Rechaza registros de otro evento');
for(const value of ['{','null',JSON.stringify({version:1,eventId:'evento A',team:'boy',confirmedAt:'invalid'})]) {
  saved.set(store.key,value); assert.equal(core.createStore('evento A',storage).get(),null);
}
const failed=core.createStore('bloqueado',{getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}});
failed.confirm('boy'); assert.equal(failed.get().team,'boy'); assert.equal(failed.isPersisted(),false);
failed.clear(); assert.equal(failed.get(),null);

function setup({reduced=false,blocked=false,restored=null,eventId='test-event',data=new Map()}={}) {
  const nodes=new Map(),timers=new Map(),published=[];
  let document, observer, nextTimer=0;
  class Element {
    constructor(id) {
      this.id=id; this.events=new Map(); this.dataset={}; this.attrs=new Map(); this.properties=new Map();
      this.classes=new Set(); this.hidden=false; this.disabled=false; this.children=[]; this.textContent='';
      this.classList={add:(...c)=>c.forEach(x=>this.classes.add(x)),remove:(...c)=>c.forEach(x=>this.classes.delete(x)),contains:c=>this.classes.has(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};
      this.style={setProperty:(k,v)=>this.properties.set(k,v)};
    }
    addEventListener(type,fn) { if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push(fn); }
    emit(type,event={}) { const e={preventDefault(){this.prevented=true;},target:this,...event}; for(const fn of this.events.get(type)||[])fn(e); return e; }
    setAttribute(k,v) {this.attrs.set(k,String(v));} hasAttribute(k){return this.attrs.has(k);} getAttribute(k){return this.attrs.get(k);}
    querySelector(){return this.art;}
    getBoundingClientRect(){return this.rect||{left:0,top:0,width:400,height:400,right:400,bottom:400};}
    cloneNode(){return new Element('clone');}
    replaceChildren(...children){this.children=children;} appendChild(child){this.children.push(child);}
    setPointerCapture(id){this.capture=id;} hasPointerCapture(id){return this.capture===id;}
    releasePointerCapture(id){this.capture=null;this.emit('lostpointercapture',{pointerId:id});}
    focus(){document.activeElement=this;} scrollIntoView(options){this.scroll=options;}
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id.replace(/^#/,'')));return nodes.get(id);};
  const balloons=['girl','boy'].map((team,i)=> {
    const b=get(`#team-${team}`);b.dataset.team=team;b.setAttribute('aria-pressed','false');b.art=new Element('art');
    b.art.getBoundingClientRect=()=> {
      const left=40+i*160+(parseFloat(b.properties.get('--drag-x'))||0);
      const top=10+(parseFloat(b.properties.get('--drag-y'))||0);
      return {left,top,width:120,height:173,right:left+120,bottom:top+173};
    };
    return b;
  });
  document=new Element('document');document.hidden=false;
  document.querySelector=get;document.querySelectorAll=()=>balloons;document.getElementById=id=>[...nodes.values()].find(e=>e.id===id);
  document.createElement=()=>new Element('piece');
  get('#vote-section').dataset.phase='choosing';
  get('#team-drop-zone').rect={left:100,right:300,top:260,bottom:340,width:200,height:80};
  get('#baby-predictions');
  for(const id of ['#team-confirm','#team-result','#team-flight'])get(id).hidden=true;
  const media={matches:reduced,addEventListener(type,fn){this.change=fn;}};
  const window=new Element('window');
  Object.assign(window,{InvitationChoice:core,INVITATION_CONFIG:{voteSectionId:'vote-section',teamSelection:{eventId,nextSectionId:'baby-predictions'}},matchMedia:()=>media,IntersectionObserver:true,
    getComputedStyle:b=>({transform:`matrix(1, 0, 0, 1, ${parseFloat(b.properties.get('--drag-x'))||0}, ${parseFloat(b.properties.get('--drag-y'))||0})`}),
    setTimeout:(fn,delay)=>{timers.set(++nextTimer,{fn,delay});return nextTimer;},clearTimeout:id=>timers.delete(id),dispatchEvent:e=>published.push(e)});
  Object.defineProperty(window,'localStorage',{get(){if(blocked)throw Error();return{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}});
  if(restored)data.set(`baby-invitation:team:${eventId}`,JSON.stringify({version:1,eventId,team:restored,confirmedAt:'2026-10-05T18:00:00Z'}));
  class IntersectionObserver {constructor(fn){observer=fn;}observe(){}}
  class CustomEvent {constructor(type,options){this.type=type;this.detail=options.detail;}}
  vm.runInNewContext(source,{window,document,IntersectionObserver,CustomEvent,performance:{now:()=>10},console});
  return {get,window,document,balloons,timers,data,published,media,
    click:id=>get(id).emit('click',{detail:0}),
    down:(team,type='mouse')=>get(`#team-${team}`).emit('pointerdown',{pointerId:1,clientX:100,clientY:100,isPrimary:true,button:0,pointerType:type}),
    move:(team,dx,dy)=>get(`#team-${team}`).emit('pointermove',{pointerId:1,clientX:100+dx,clientY:100+dy}),
    up:(team,dx,dy)=>get(`#team-${team}`).emit('pointerup',{pointerId:1,clientX:100+dx,clientY:100+dy}),
    visible:on=>observer([{isIntersecting:on}]),
    finish(){for(const [id,t] of [...timers]){timers.delete(id);t.fn();}}
  };
}

const gesture=setup();
gesture.down('girl');gesture.move('girl',100,233);
assert.equal(gesture.get('#team-box').classList.contains('is-over'),true,'La caja recibe el centro del globo');
assert.equal(gesture.get('#team-drop-label').textContent,'Suelta para elegir tu equipo');
assert.equal(gesture.get('#team-girl').classList.contains('is-grabbing'),true);
gesture.up('girl',100,233);
assert.equal(gesture.window.InvitationTeam.getSelection().team,'girl');
assert.equal(gesture.get('#vote-section').dataset.phase,'celebrating');
assert.equal(gesture.get('#team-result').hidden,false,'Los controles de la tarjeta siguen disponibles durante la celebración');
assert.equal([...gesture.timers.values()][0].delay,1500);
assert.equal(gesture.get('#team-confetti').children.length,28);
assert.equal(gesture.published.length,1);
gesture.click('#team-confirm'); assert.equal(gesture.published.length,1,'No confirma dos veces');
gesture.finish();
assert.equal(gesture.get('#vote-section').dataset.phase,'chosen');
assert.equal(gesture.document.activeElement,gesture.get('#team-result-title'));
assert.equal(gesture.get('#team-confetti').children.length,0);
const reload=setup({data:gesture.data});
assert.equal(reload.get('#vote-section').dataset.phase,'chosen');assert.equal(reload.timers.size,0);
assert.equal(reload.get('#team-drop-label').textContent,'Tu corazonada está aquí');
assert.equal(reload.published.length,0);assert.equal(reload.document.activeElement,undefined,'Recargar no anuncia ni roba el foco');
assert.equal(setup({data:gesture.data,eventId:'other'}).window.InvitationTeam.getSelection(),null);
gesture.click('#team-change');
assert.equal(gesture.window.InvitationTeam.getSelection(),null);assert.equal(gesture.data.size,0);
assert.equal(gesture.balloons.every(b=>!b.disabled),true);
assert.equal(gesture.document.activeElement,gesture.get('#team-girl'));
gesture.down('boy','touch');gesture.up('boy',-60,233); // Sin pointermove: la última posición también cuenta.
assert.equal(gesture.window.InvitationTeam.getSelection().team,'boy');
gesture.click('#team-change');assert.equal(gesture.timers.size,0,'Cambiar cancela una celebración en curso');

const outside=setup();outside.down('girl');outside.move('girl',-65,20);outside.up('girl',-65,20);
assert.equal(outside.window.InvitationTeam.getSelection(),null);
assert.equal(outside.get('#team-girl').properties.get('--drag-x'),'0px');
assert.equal(outside.get('#team-girl').classList.contains('is-grabbing'),false);
outside.get('#team-girl').emit('click',{detail:1});assert.equal(outside.get('#team-confirm').hidden,true,'El clic posterior al arrastre no selecciona');
outside.click('#team-boy');
outside.down('girl','touch');outside.move('girl',100,233);outside.get('#team-girl').emit('pointercancel',{pointerId:1});
assert.equal(outside.get('#vote-section').dataset.team,'boy','Cancelar conserva la selección anterior');
assert.equal(outside.get('#team-box').classList.contains('is-over'),false);
outside.down('girl');outside.move('girl',100,233);outside.document.emit('keydown',{key:'Escape'});
assert.equal(outside.get('#vote-section').dataset.team,'boy');
outside.down('girl');outside.move('girl',100,233);outside.visible(false);outside.up('girl',100,233);
assert.equal(outside.window.InvitationTeam.getSelection(),null,'Salir de pantalla cancela el gesto');
outside.down('girl','touch');outside.up('girl',1,1);
assert.equal(outside.get('#team-girl').getAttribute('aria-pressed'),'true','Un toque selecciona sin confirmar');
outside.get('#team-girl').emit('keydown',{key:'ArrowRight'});
assert.equal(outside.get('#team-boy').getAttribute('aria-pressed'),'true');assert.equal(outside.document.activeElement,outside.get('#team-boy'));
outside.click('#team-confirm');assert.equal(outside.window.InvitationTeam.getSelection().team,'boy');

const reduced=setup({reduced:true,blocked:true});
reduced.click('#team-undecided');assert.equal(reduced.window.InvitationTeam.getSelection(),null);
assert.equal(reduced.document.activeElement,reduced.get('#baby-predictions'));assert.equal(reduced.get('#baby-predictions').scroll.behavior,'instant');
reduced.click('#team-girl');reduced.window.InvitationTeam.registerChoice=()=>{throw Error('unavailable');};reduced.click('#team-confirm');
assert.equal(reduced.get('#vote-section').dataset.phase,'chosen');assert.equal(reduced.timers.size,0);
assert.equal(reduced.window.InvitationTeam.getSelection().team,'girl','Sin almacenamiento ni futuro servicio conserva el dato en memoria');
assert.match(reduced.get('#team-local-note').textContent,/abierta/);
reduced.click('#team-continue');assert.equal(reduced.document.activeElement,reduced.get('#baby-predictions'));
const preference=setup();preference.click('#team-boy');preference.click('#team-confirm');preference.media.matches=true;preference.media.change();
assert.equal(preference.get('#vote-section').dataset.phase,'chosen');assert.equal(preference.timers.size,0);
// Lluvia continua del color elegido: sólo con la sección visible, se detiene al salir y al cambiar.
const rainy=setup({restored:'girl'});assert.equal(rainy.timers.size,0);
rainy.visible(true);assert.equal(rainy.get('#team-rain').children.length,1);assert.equal(rainy.timers.size,1);
rainy.finish();assert.equal(rainy.get('#team-rain').children.length,2,'Sigue cayendo confeti');
rainy.visible(false);assert.equal(rainy.timers.size,0,'Se pausa fuera de la vista');
rainy.visible(true);rainy.click('#team-change');assert.equal(rainy.timers.size,0);assert.equal(rainy.get('#team-rain').children.length,0);
const calm=setup({restored:'boy',reduced:true});calm.visible(true);assert.equal(calm.timers.size,0,'Sin lluvia con movimiento reducido');
const live=setup();live.visible(true);live.click('#team-girl');live.click('#team-confirm');live.finish();assert.ok(live.get('#team-rain').children.length>=1,'La lluvia empieza tras la celebración');
console.log('OK: arrastre mouse/táctil, recepción, regreso, cancelación/Escape, toque, teclado, confirmación única, celebración de 1.5 s, cambio, recarga por evento, memoria, movimiento reducido, lluvia continua y continuación libre.');
const earlyContinue=setup();earlyContinue.click('#team-boy');earlyContinue.click('#team-confirm');earlyContinue.click('#team-continue');
assert.equal(earlyContinue.get('#vote-section').dataset.phase,'chosen');
assert.equal(earlyContinue.timers.size,0,'Continuar cancela el foco pendiente de la celebración');
assert.equal(earlyContinue.document.activeElement,earlyContinue.get('#baby-predictions'));
