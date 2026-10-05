/* Predicciones locales, independientes del resultado real del bebé. */
(() => {
  'use strict';
  const resemblanceLabels={mom:'A mamá',dad:'A papá',both:'Una mezcla de ambos',own:'¡Tendrá su propio estilo!'};
  const validTeam=team=>team==='girl'||team==='boy';
  const empty=()=>({resemblance:null,name:'',arrivalDate:'',arrivalUndecided:false,guestName:''});
  function validDate(value) {
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const date=new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
  }
  function clean(value={}) {
    const date=validDate(value.arrivalDate)?value.arrivalDate:'';
    return {resemblance:Object.hasOwn(resemblanceLabels,value.resemblance)?value.resemblance:null,
      name:typeof value.name==='string'?value.name.slice(0,100):'',arrivalDate:date,
      arrivalUndecided:!date&&value.arrivalUndecided===true,guestName:typeof value.guestName==='string'?value.guestName.slice(0,80):''};
  }
  const hasAnswers=value=>Boolean(value.resemblance||value.name.trim()||validDate(value.arrivalDate));
  function formatDate(value,options={day:'numeric',month:'long',year:'numeric'}) {
    return validDate(value)?new Intl.DateTimeFormat('es-MX',{...options,timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`)):'';
  }
  function rangeText(range={}) {
    const first=validDate(range.earliest)?range.earliest:null,last=validDate(range.latest)?range.latest:null;
    if(first&&last&&first<=last)return `Orientación de los anfitriones: del ${formatDate(first)} al ${formatDate(last)}.`;
    if(first&&!last)return `Orientación de los anfitriones: a partir del ${formatDate(first)}.`;
    if(last&&!first)return `Orientación de los anfitriones: hasta el ${formatDate(last)}.`;
    return '';
  }
  function createStore(eventId,storage) {
    const id=typeof eventId==='string'&&eventId.trim()?eventId.trim():'plantilla-default-revelacion';
    const key=`baby-invitation:capsule:${encodeURIComponent(id)}`;
    let memory=null,persisted=false;
    const copy=()=>memory?{...memory,answers:{...memory.answers}}:null;
    function write(){persisted=false;try{if(storage){storage.setItem(key,JSON.stringify(memory));persisted=true;}}catch(_){/* Memoria disponible. */}}
    try {
      const value=JSON.parse(storage?.getItem(key)||'null');
      if(value&&value.version===1&&value.eventId===id&&value.answers&&typeof value.savedAt==='string'&&Number.isFinite(Date.parse(value.savedAt))) {
        const draft=clean({...value.answers,guestName:value.guestName});
        if(hasAnswers(draft)) {
          const {guestName,...answers}=draft;
          memory={version:1,eventId:id,team:validTeam(value.team)?value.team:null,answers,guestName,savedAt:value.savedAt};persisted=true;
        }
      }
    }catch(_){/* Los datos corruptos o bloqueados no impiden completar las tarjetas. */}
    return {eventId:id,key,get:copy,isPersisted:()=>persisted,
      save(value,team,now=new Date()) {
        const draft=clean(value);if(!hasAnswers(draft))return null;
        const {guestName,...answers}=draft;
        memory={version:1,eventId:id,team:validTeam(team)?team:null,answers,guestName:guestName.trim(),savedAt:now.toISOString()};write();return copy();
      },
      updateTeam(team) {
        const selected=validTeam(team)?team:null;
        if(memory&&memory.team!==selected){memory.team=selected;write();}
        return copy();
      },
      updateGuestName(name){if(memory){memory.guestName=typeof name==='string'?name.trim().slice(0,80):'';write();}return copy();},
      clear() {
        memory=null;persisted=false;
        try{storage?.removeItem(key);return true;}catch(_){return false;}
      }
    };
  }
  // Punto de conexión futuro. Hoy no envía información a ningún servicio.
  async function registerCapsule(record){return {mode:'local-only',eventId:record.eventId};}
  const api={empty,clean,validDate,hasAnswers,formatDate,rangeText,resemblanceLabels,createStore,registerCapsule};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.InvitationCapsuleCore=api;
})();
