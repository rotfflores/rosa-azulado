(() => {
  'use strict';
  const text=value=>typeof value==='string'?value:'';
  const maxGuests=value=>Number.isSafeInteger(value)&&value>=1&&value<=100?value:4;
  const signature=value=>JSON.stringify([value.name.trim(),value.response,value.response==='yes'?value.guests:0,value.note.trim()]);
  function clean(value={}){return {name:text(value.name).slice(0,80),response:['yes','no'].includes(value.response)?value.response:null,guests:Number(value.guests),note:text(value.note).slice(0,250)};}
  function validate(value,limit){
    const errors={};
    if(!text(value.name).trim())errors.name='Escribe tu nombre para responder.';
    else if(value.name.length>80)errors.name='Usa hasta 80 caracteres para tu nombre.';
    if(!['yes','no'].includes(value.response))errors.response='Elige si podrás acompañarnos.';
    if(value.response==='yes'&&(!Number.isInteger(value.guests)||value.guests<1||value.guests>limit))errors.guests=`Elige entre 1 y ${limit} asistentes, incluyéndote.`;
    if(text(value.note).length>250)errors.note='La nota admite hasta 250 caracteres.';
    return errors;
  }
  function createStore(eventId,storage,createId=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`){
    const id=text(eventId).trim()||'plantilla-default-revelacion',key=`baby-invitation:attendance:${encodeURIComponent(id)}`,identityKey=key+':identity';
    let memory=null,persisted=false,identity;
    const copy=()=>memory?{...memory}:null;
    try{identity=storage?.getItem(identityKey);}catch(_){}
    if(!identity||!/^response-[a-z0-9-]{8,100}$/i.test(identity))identity='response-'+createId();
    try{storage?.setItem(identityKey,identity);}catch(_){}
    function write(){persisted=false;try{if(storage){storage.setItem(key,JSON.stringify(memory));persisted=true;}}catch(_){}}
    try{
      const value=JSON.parse(storage?.getItem(key)||'null');
      if(value&&value.version===1&&value.eventId===id&&value.responseId===identity&&Number.isSafeInteger(value.revision)&&value.revision>=1&&['local','pending','confirmed'].includes(value.delivery)&&typeof value.updatedAt==='string'&&Number.isFinite(Date.parse(value.updatedAt))&&!Object.keys(validate(value,100)).length){
        const fields=clean(value);memory={version:1,eventId:id,responseId:identity,revision:value.revision,...fields,guests:fields.response==='yes'?fields.guests:0,team:['girl','boy'].includes(value.team)?value.team:null,delivery:value.delivery,updatedAt:value.updatedAt};persisted=true;
      }
    }catch(_){}
    return {eventId:id,key,responseId:identity,get:copy,isPersisted:()=>persisted,
      stage(value,team,remote,now=new Date()){
        const fields=clean(value);fields.name=fields.name.trim();fields.note=fields.note.trim();if(fields.response==='no')fields.guests=0;
        if(memory&&signature(memory)===signature(fields)){memory.team=['girl','boy'].includes(team)?team:null;write();return copy();}
        memory={version:1,eventId:id,responseId:identity,revision:(memory?.revision||0)+1,...fields,team:['girl','boy'].includes(team)?team:null,delivery:remote?'pending':'local',updatedAt:now.toISOString()};write();return copy();
      },
      markDelivery(delivery,revision){if(memory&&memory.revision===revision&&['local','pending','confirmed'].includes(delivery)){memory.delivery=delivery;write();}return copy();},
      updateTeam(team){if(memory){memory.team=['girl','boy'].includes(team)?team:null;write();}return copy();}
    };
  }
  async function registerResponse(record,saveResponse){
    if(typeof saveResponse!=='function')return {delivery:'local'};
    const receipt=await saveResponse({...record,idempotencyKey:`${record.responseId}:${record.revision}`});
    if(!receipt||receipt.ok!==true||receipt.confirmed!==true||receipt.eventId!==record.eventId||receipt.responseId!==record.responseId||receipt.revision!==record.revision)throw new Error('El servidor no confirmó esta respuesta.');
    return {delivery:'confirmed'};
  }
  function whatsappLink(number,record){
    const phone=text(number).replace(/[\s()+-]/g,'');
    if(!/^[1-9]\d{7,14}$/.test(phone)||!record)return '';
    const message=`Hola, soy ${record.name}.\nMi respuesta a la invitación: ${record.response==='yes'?'Sí, ahí estaré':'Esta vez no podré'}.\nNúmero de asistentes (incluyéndome): ${record.response==='yes'?record.guests:0}.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
  const api={maxGuests,clean,validate,signature,createStore,registerResponse,whatsappLink};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.InvitationAttendanceCore=api;
})();
