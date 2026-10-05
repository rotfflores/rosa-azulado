const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const core=require('../attendance-core.js'),pass=require('../pass.js'),eventCore=require('../event-core.js');
const source=fs.readFileSync(path.join(__dirname,'../attendance.js'),'utf8');
const good={name:' Ana ',response:'yes',guests:2,note:' Hasta pronto '};
const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
const store=core.createStore('evento con espacios',storage,()=> 'test-id-12345678');
assert.equal(core.maxGuests(0),4);assert.equal(core.maxGuests(200),4);assert.equal(core.maxGuests(3),3);
assert.deepEqual(Object.keys(core.validate({name:'',response:null,guests:0,note:'x'.repeat(251)},4)),['name','response','note']);
assert.ok(core.validate({...good,guests:5},4).guests);assert.ok(core.validate({...good,name:'x'.repeat(81)},4).name);
assert.equal(Object.keys(core.validate({...good,response:'no',guests:0},4)).length,0);
const first=store.stage(good,'girl',false);assert.equal(first.name,'Ana');assert.equal(first.delivery,'local');assert.equal(first.revision,1);
assert.equal(store.stage(good,'boy',false).revision,1,'Reintentar no crea otra revisión');
assert.equal(core.createStore(store.eventId,storage).get().name,'Ana');assert.equal(core.createStore('different',storage).get(),null);
store.markDelivery('confirmed',1);assert.equal(store.stage(good,'girl',true).delivery,'confirmed');
const changed=store.stage({...good,name:'Ana García'},'girl',true);assert.equal(changed.responseId,first.responseId);assert.equal(changed.revision,2);assert.equal(changed.delivery,'pending');
store.markDelivery('confirmed',1);assert.equal(store.get().delivery,'pending','Una confirmación anterior no confirma una edición nueva');
store.updateTeam('boy');assert.equal(store.get().name,'Ana García');assert.equal(store.get().team,'boy');
const blocked={getItem(){throw Error();},setItem(){throw Error();}},memory=core.createStore('blocked',blocked);
memory.stage(good,null,false);assert.equal(memory.isPersisted(),false);assert.equal(memory.get().guests,2);
const corrupted=new Map(map);corrupted.set(store.key,'{');assert.equal(core.createStore(store.eventId,{getItem:k=>corrupted.get(k)}).get(),null);
assert.equal(core.whatsappLink('',first),'');assert.equal(core.whatsappLink('not a number',first),'');
assert.match(decodeURIComponent(core.whatsappLink('+52 (55) 1234-5678',first)),/Ana.*\n.*Sí, ahí estaré.*\n.*2\./);

function setup({savedData=new Map(),saveResponse=null,blockedStorage=false,sharedName='',team=null,reduced=false,pngFailure=false,whatsapp=''}={}){
  const nodes=new Map(),published=[],painted=[],downloads=[],calls=[];let document;
  class Element{
    constructor(id){this.id=id;this.events=new Map();this.attrs=new Map();this.dataset={};this.hidden=false;this.value='';this.checked=false;this.disabled=false;this.textContent='';this.tagName='DIV';}
    addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push(fn);}
    emit(type,extra={}){return Promise.all((this.events.get(type)||[]).map(fn=>fn({preventDefault(){},target:this,...extra})));}
    setAttribute(k,v){this.attrs.set(k,String(v));}removeAttribute(k){this.attrs.delete(k);}getAttribute(k){return this.attrs.get(k);}
    focus(){document.activeElement=this;}scrollIntoView(options){this.scroll=options;}
    append(child){if(this.id==='attendance-guests'&&!this.value)this.value=child.value;}remove(){}
    click(){if(this.download)downloads.push(this.download);return this.emit('click');}
    contains(node){return [...nodes.values()].includes(node);}
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
  const radios=['yes','no'].map(value=>{const radio=get('radio-'+value);radio.value=value;return radio;});
  document=new Element('document');Object.assign(document,{getElementById:get,querySelector:()=>get('attendance-section'),documentElement:get('html'),body:new Element('body'),createElement:tag=>new Element(tag)});
  get('attendance-section').querySelectorAll=()=>radios;
  const media={matches:reduced},window=new Element('window');
  Object.assign(window,{INVITATION_CONFIG:{attendance:{maxGuests:3,saveResponse,whatsappNumber:whatsapp,nextSectionId:'baby-wishes'},names:{mom:'Mamá',dad:'Papá'},event:{}},
    InvitationAttendanceCore:core,InvitationEvent:eventCore,InvitationTeam:{eventId:'test',getSelection:()=>team?{team}:null},
    InvitationCapsule:{getGuestName:()=>sharedName,setGuestName:(value,options)=>{sharedName=value;calls.push({value,...options});}},
    InvitationPass:{fontsReady:async()=>{},draw:(canvas,model)=>{painted.push(model);canvas.width=1080;canvas.height=1500;},png:async()=>{if(pngFailure)throw Error('test');return 'blob';}},
    matchMedia:()=>media,visualViewport:new Element('viewport'),requestAnimationFrame:fn=>fn(),setTimeout:()=>1,crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789abc'},dispatchEvent:e=>published.push(e)});
  Object.defineProperty(window,'localStorage',{get(){if(blockedStorage)throw Error();return{getItem:k=>savedData.get(k),setItem:(k,v)=>savedData.set(k,v)};}});
  class CustomEvent{constructor(type,options){this.type=type;this.detail=options.detail;}}
  vm.runInNewContext(source,{window,document,CustomEvent,console,getComputedStyle:()=>({getPropertyValue:()=>''}),URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}});
  return {get,window,document,published,painted,downloads,calls,savedData,
    click:id=>get(id).emit('click'),submit:()=>get('attendance-form').emit('submit'),
    input:async(id,value)=>{get(id).value=value;await get(id).emit(id==='attendance-guests'?'change':'input');},
    radio:async value=>{radios.forEach(r=>r.checked=r.value===value);await get('radio-'+value).emit('change');},
    team:async value=>{team=value;await window.emit('invitation:team-changed');},
    shared:async value=>{sharedName=value;await window.emit('invitation:guest-name-changed',{detail:{eventId:'test',name:value,source:'capsule'}});}
  };
}

(async()=>{
  assert.deepEqual(await core.registerResponse(first,null),{delivery:'local'});
  let received;
  assert.deepEqual(await core.registerResponse(changed,async record=>{received=record;return{ok:true,confirmed:true,eventId:record.eventId,responseId:record.responseId,revision:record.revision};}),{delivery:'confirmed'});
  assert.equal(received.idempotencyKey,changed.responseId+':2');
  for(const receipt of [null,{ok:true},{ok:true,confirmed:true,eventId:'wrong'}])await assert.rejects(core.registerResponse(first,async()=>receipt));
  const ui=setup({sharedName:'Ana desde la cápsula'});assert.equal(ui.get('attendance-name').value,'Ana desde la cápsula');
  await ui.click('attendance-open');assert.equal(ui.get('attendance-section').dataset.mode,'form');
  await ui.input('attendance-name','');await ui.submit();assert.equal(ui.get('attendance-name-error').hidden,false);assert.equal(ui.get('attendance-response-error').hidden,false);
  assert.equal(ui.window.InvitationAttendance.getResponse(),null);
  const unsafe='<img src=x onerror=alert(1)>';
  await ui.input('attendance-name',unsafe);await ui.radio('yes');await ui.input('attendance-guests','2');await ui.input('attendance-note','x'.repeat(251));await ui.submit();assert.equal(ui.get('attendance-note-error').hidden,false);
  await ui.input('attendance-note','¡Gracias!');await ui.submit();await Promise.resolve();
  assert.equal(ui.get('attendance-section').dataset.mode,'result');assert.match(ui.get('attendance-delivery-note').textContent,/este dispositivo.*Falta enviarla/);
  assert.equal(ui.painted.at(-1).name,unsafe);assert.equal(ui.painted.at(-1).status,'Pendiente de envío');assert.equal(ui.painted.at(-1).teamLabel,'Voy por la sorpresa');
  assert.equal(ui.get('attendance-whatsapp').hidden,true);assert.equal(ui.calls.at(-1).source,'attendance');
  await ui.click('attendance-download');assert.equal(ui.downloads[0],'mi-pase.png');
  const recovered=setup({savedData:ui.savedData,team:'girl'});await new Promise(setImmediate);
  assert.equal(recovered.get('attendance-section').dataset.mode,'result');assert.equal(recovered.get('attendance-name').value,unsafe);assert.equal(recovered.painted.at(-1).teamLabel,'Equipo niña');
  await recovered.click('attendance-edit');await recovered.input('attendance-name','Ana García');await recovered.input('attendance-guests','3');await recovered.submit();
  assert.equal(recovered.window.InvitationAttendance.getResponse().responseId,ui.window.InvitationAttendance.getResponse().responseId);
  assert.equal(recovered.painted.at(-1).guests,3);await recovered.team('boy');assert.equal(recovered.painted.at(-1).teamLabel,'Equipo niño');
  await recovered.shared('Ana compartida');assert.equal(recovered.get('attendance-name').value,'Ana compartida');assert.match(recovered.get('attendance-delivery-note').textContent,/Guarda los cambios/);
  await recovered.click('attendance-edit');await recovered.radio('no');await recovered.submit();assert.equal(recovered.get('attendance-pass-area').hidden,true);assert.equal(recovered.get('attendance-declined').hidden,false);assert.equal(recovered.window.InvitationAttendance.getResponse().guests,0);
  const memoryUI=setup({blockedStorage:true,reduced:true,pngFailure:true,whatsapp:'525512345678'});await memoryUI.click('attendance-open');await memoryUI.input('attendance-name','Ana');await memoryUI.radio('yes');await memoryUI.submit();assert.equal(memoryUI.get('attendance-memory-note').hidden,false);assert.equal(memoryUI.get('attendance-whatsapp').hidden,false);
  await memoryUI.click('attendance-whatsapp');assert.equal(memoryUI.window.InvitationAttendance.getResponse().delivery,'local','Abrir WhatsApp no confirma envío');
  await memoryUI.click('attendance-download');assert.match(memoryUI.get('attendance-download-status').textContent,/reintentar/);assert.equal(memoryUI.get('attendance-download').disabled,false);
  let resolveServer,requests=[];
  const remoteUI=setup({saveResponse:record=>{requests.push(record);return new Promise(resolve=>resolveServer=resolve);}});
  await remoteUI.click('attendance-open');await remoteUI.input('attendance-name','Ana');await remoteUI.radio('yes');
  const saving=remoteUI.submit();await remoteUI.submit();assert.equal(requests.length,1,'La doble pulsación no duplica registro');assert.notEqual(remoteUI.window.InvitationAttendance.getResponse().delivery,'confirmed');
  resolveServer({...requests[0],ok:true,confirmed:true});await saving;assert.equal(remoteUI.get('attendance-result-title').textContent,'¡Tu asistencia está confirmada!');
  await remoteUI.click('attendance-edit');await remoteUI.submit();assert.equal(requests.length,1,'Guardar sin cambios no repite una respuesta confirmada');
  await remoteUI.click('attendance-edit');await remoteUI.input('attendance-name','Ana editada');assert.equal(remoteUI.painted.at(-1).status,'Pendiente de envío');
  const edited=remoteUI.submit();assert.equal(requests[1].responseId,requests[0].responseId);assert.equal(requests[1].revision,2);resolveServer({ok:false});await edited;
  assert.equal(remoteUI.get('attendance-name').value,'Ana editada');assert.equal(remoteUI.get('attendance-register-error').hidden,false);
  const retry=remoteUI.submit();assert.equal(requests[2].idempotencyKey,requests[1].idempotencyKey);resolveServer({...requests[2],ok:true,confirmed:true});await retry;
  assert.equal(remoteUI.window.InvitationAttendance.getResponse().delivery,'confirmed');

  // El lienzo exportado incluye únicamente el recuerdo, con salto de línea y fuentes listas.
  const drawn=[],context=new Proxy({measureText:text=>({width:String(text).length*14}),fillText:(text,x,y)=>drawn.push({text,y}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]||(()=>{})});
  const canvas={getContext:()=>context,toBlob:fn=>fn({type:'image/png'})};
  const theme={serif:'Fredoka',sans:'Nunito',ivory:'#F7F4ED',pink:'#E6B6C4',blue:'#AACDDC',ink:'#3d3140',pinkInk:'#a8456e',blueInk:'#2f6c88'};
  const model={name:'A'.repeat(80),parents:'Mariana Robles & Andrés Salazar',guests:4,team:null,teamLabel:'Voy por la sorpresa',status:'Pendiente de envío',date:'sábado, 21 de noviembre de 2026',time:'4:00 p.m.',venue:'Centro Cultural Casa Lamm'};
  const size=pass.draw(canvas,model,theme);assert.equal(size.width,1080);assert.ok(size.height>1400);assert.ok(drawn.every(line=>line.y<size.height/2-33));assert.ok(drawn.some(line=>line.text==='Una gran sorpresa nos espera'));
  const fontCalls=[];global.document={fonts:{ready:Promise.resolve(),load:async font=>fontCalls.push(font)}};
  assert.equal((await pass.png(canvas,model,theme)).type,'image/png');assert.equal(fontCalls.length,2);
  await assert.rejects(pass.png({...canvas,toBlob:fn=>fn(null)},model,theme));
  console.log('Asistencia y pase: validación, límites, estados reales, reintentos idempotentes, edición, recuperación, sincronización, memoria y PNG correctos.');
})().catch(error=>{console.error(error);process.exitCode=1;});
