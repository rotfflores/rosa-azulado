(() => {
  'use strict';
  const config=window.INVITATION_CONFIG||{},options=config.attendance||{},core=window.InvitationAttendanceCore;
  const get=id=>document.getElementById(id),section=document.querySelector('.attendance-section');
  const form=get('attendance-form'),name=get('attendance-name'),guests=get('attendance-guests'),note=get('attendance-note');
  const radios=[...section.querySelectorAll('[name="attendance-response"]')];
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)'),limit=core.maxGuests(options.maxGuests);
  let storage;try{storage=window.localStorage;}catch(_){}
  const store=core.createStore(window.InvitationTeam?.eventId||config.teamSelection?.eventId,storage,()=>window.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
  const selectedTeam=()=>window.InvitationTeam?.getSelection()?.team||null;
  const api=window.InvitationAttendance={eventId:store.eventId,getResponse:()=>store.get(),registerResponse:core.registerResponse};
  let busy=false,mode='closed',paintVersion=0,exporting=false;
  const announce=text=>{get('attendance-status').textContent=text;};
  const publish=()=>window.dispatchEvent(new CustomEvent('invitation:attendance-changed',{detail:store.get()}));
  const fields=()=>({name:name.value,response:radios.find(radio=>radio.checked)?.value||null,guests:Number(guests.value),note:note.value});
  const isCurrent=record=>record&&core.signature(record)===core.signature(fields());
  const isConfirmed=record=>record?.delivery==='confirmed'&&isCurrent(record);
  const shareName=()=>window.InvitationCapsule?.setGuestName(name.value,{source:'attendance'});
  for(let count=1;count<=limit;count++){
    const option=document.createElement('option');option.value=String(count);option.textContent=`${count} ${count===1?'asistente':'asistentes'}`;guests.append(option);
  }
  get('attendance-guests-help').textContent=`Incluyéndote. Esta invitación admite hasta ${limit} ${limit===1?'asistente':'asistentes'}.`;
  function renderFields(){
    get('attendance-guests-field').hidden=fields().response!=='yes';
    get('attendance-note-remaining').textContent=`Quedan ${Math.max(0,250-note.value.length)} caracteres`;
  }
  function clearErrors(){
    for(const field of ['name','response','guests','note']){get(`attendance-${field}-error`).hidden=true;get(`attendance-${field}-error`).textContent='';}
    for(const control of [name,guests,note,...radios])control.removeAttribute('aria-invalid');
    get('attendance-register-error').hidden=true;
  }
  function showErrors(errors){
    clearErrors();
    for(const [field,message]of Object.entries(errors)){
      const error=get(`attendance-${field}-error`);error.textContent=message;error.hidden=false;
      const controls=field==='response'?radios:[get(`attendance-${field}`)];controls.forEach(control=>control.setAttribute('aria-invalid','true'));
    }
    const first=Object.keys(errors)[0],control=first==='response'?radios[0]:get(`attendance-${first}`);
    control.focus();control.scrollIntoView({block:'center',behavior:motion.matches?'instant':'smooth'});announce('Revisa los campos indicados para guardar tu respuesta.');
  }
  function passModel(){
    const record=store.get(),current=fields(),team=selectedTeam();
    const event=window.InvitationEvent?.normalize(config.event||{}),labels=event&&window.InvitationEvent.labels(event);
    return {name:current.name.trim()||record?.name||'Tu nombre',guests:current.guests,team,
      teamLabel:team==='girl'?'Equipo niña':team==='boy'?'Equipo niño':'Voy por la sorpresa',
      parents:`${config.names?.mom||'[Nombre de mamá]'} & ${config.names?.dad||'[Nombre de papá]'}`,
      date:labels?.date||'Fecha por confirmar',time:labels?.time||'Hora por confirmar',venue:event?.venue||'Lugar por confirmar',
      status:isConfirmed(record)?'Asistencia confirmada':'Pendiente de envío',predictions:predictions()};
  }
  // Resumen de la cápsula guardada para el pase: sólo las corazonadas respondidas.
  function predictions(){
    const capsule=window.InvitationCapsule?.getCapsule?.(),answers=capsule?.answers,labels=window.InvitationCapsuleCore;
    if(!answers||!labels)return [];
    const rows=[];
    if(labels.resemblanceLabels?.[answers.resemblance])rows.push({label:'Se parecerá',value:labels.resemblanceLabels[answers.resemblance]});
    if(typeof answers.name==='string'&&answers.name.trim())rows.push({label:'Un nombre que me gusta',value:answers.name.trim()});
    const arrival=labels.formatDate?.(answers.arrivalDate);
    if(arrival)rows.push({label:'Llegará el',value:arrival});
    return rows;
  }
  // Usa los mismos colores y fuentes locales que las secciones anteriores.
  const css=getComputedStyle(document.documentElement),hex=(property,fallback)=>/^#[\da-f]{6}$/i.test(css.getPropertyValue(property).trim())?css.getPropertyValue(property).trim():fallback;
  const theme={serif:css.getPropertyValue('--serif').trim()||'Fredoka, sans-serif',sans:css.getPropertyValue('--sans').trim()||'Nunito, sans-serif',ivory:hex('--ivory','#F7F4ED'),pink:hex('--pink','#E6B6C4'),blue:hex('--blue','#AACDDC'),ink:hex('--ink-strong','#3d3140'),pinkInk:hex('--accent-pink','#a8456e'),blueInk:hex('--accent-blue','#2f6c88')};
  async function renderPass(){
    const version=++paintVersion;
    get('attendance-pass-loading').hidden=false;get('attendance-pass-error').hidden=true;
    try{
      await window.InvitationPass.fontsReady(theme);if(version!==paintVersion)return;
      const model=passModel();window.InvitationPass.draw(get('attendance-pass'),model,theme);
      get('attendance-pass-description').textContent=`Pase de recuerdo de ${model.name}. ${model.guests} asistentes, incluyéndote. ${model.teamLabel}. ${model.predictions.length?'Mis corazonadas: '+model.predictions.map(row=>`${row.label}: ${row.value}`).join('. ')+'.':''} ${model.parents}. ${model.date}, ${model.time}. ${model.venue}. ${model.status}. Una gran sorpresa nos espera.`;
      get('attendance-download').disabled=exporting;
    }catch(_){if(version===paintVersion){get('attendance-pass-error').hidden=false;get('attendance-pass-error').textContent='No pudimos preparar la imagen. Puedes reintentar con “Descargar mi pase”.';get('attendance-download').disabled=false;}}
    finally{if(version===paintVersion)get('attendance-pass-loading').hidden=true;}
  }
  function renderResult(){
    const record=store.get();if(!record)return;
    const confirmed=isConfirmed(record),yes=fields().response==='yes',current=isCurrent(record);
    get('attendance-result-title').textContent=confirmed&&yes?'¡Tu asistencia está confirmada!':confirmed?'Tu respuesta fue recibida':current?'Tu respuesta, con cariño':'Tu respuesta está en edición';
    get('attendance-delivery-note').textContent=confirmed?'Los anfitriones recibieron tu respuesta.':!current?'Guarda los cambios para actualizar tu respuesta. El pase sigue pendiente de envío.':record.delivery==='local'&&store.isPersisted()?'Tu respuesta está guardada en este dispositivo. Falta enviarla a los anfitriones':record.delivery==='local'?'Tu respuesta está en memoria. Falta enviarla a los anfitriones.':'Tu respuesta sigue pendiente de envío. Puedes reintentar sin volver a escribir los datos.';
    get('attendance-declined').hidden=yes;
    get('attendance-memory-note').hidden=store.isPersisted();
    get('attendance-pass-area').hidden=!yes;get('attendance-download').hidden=!yes;
    const link=core.whatsappLink(options.whatsappNumber,{...record,...fields(),name:name.value.trim()});
    get('attendance-whatsapp').hidden=!link||confirmed;
    if(link)get('attendance-whatsapp').href=link;
    if(yes)renderPass();
  }
  function setMode(next,focus=false){
    mode=next;section.dataset.mode=next;get('attendance-paper').hidden=next==='closed';form.hidden=next!=='form';
    get('attendance-open').hidden=next!=='closed';get('attendance-open').setAttribute('aria-expanded',String(next!=='closed'));
    get('attendance-result').hidden=next==='closed'||!store.get();
    get('attendance-result-actions').hidden=next==='closed'||!store.get();
    get('attendance-edit').hidden=next==='form';renderFields();renderResult();
    if(focus){const target=next==='form'?name:get('attendance-result-title');target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:motion.matches?'instant':'smooth'});}
  }
  get('attendance-open').addEventListener('click',()=>setMode('form',true));
  get('attendance-edit').addEventListener('click',()=>{clearErrors();setMode('form',true);});
  for(const control of [name,guests,note,...radios])control.addEventListener(control===name||control===note?'input':'change',()=>{
    clearErrors();renderFields();if(control===name)shareName();if(store.get())renderResult();
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const value=fields(),errors=core.validate(value,limit);if(Object.keys(errors).length){showErrors(errors);return;}
    clearErrors();shareName();busy=true;get('attendance-fields').disabled=true;get('attendance-save').textContent='Guardando tu respuesta…';form.setAttribute('aria-busy','true');
    const remote=typeof options.saveResponse==='function',record=store.stage(value,selectedTeam(),remote);
    try{
      // El mismo identificador y revisión sirven para reintentar o editar mediante upsert.
      if(record.delivery!=='confirmed'||!remote){const result=await api.registerResponse(record,options.saveResponse);store.markDelivery(result.delivery,record.revision);}
      publish();setMode('result',true);announce(get('attendance-result-title').textContent+'. '+get('attendance-delivery-note').textContent);
    }catch(_){
      publish();renderResult();get('attendance-result').hidden=false;
      get('attendance-register-error').textContent='No pudimos enviar tu respuesta. Conservamos lo que escribiste; pulsa “Guardar mi respuesta” para reintentar.';get('attendance-register-error').hidden=false;announce(get('attendance-register-error').textContent);
    }finally{busy=false;get('attendance-fields').disabled=false;get('attendance-save').textContent='Guardar mi respuesta';form.removeAttribute('aria-busy');}
  });
  get('attendance-download').addEventListener('click',async()=>{
    if(exporting||fields().response!=='yes')return;exporting=true;get('attendance-download').disabled=true;get('attendance-download').textContent='Preparando la imagen…';get('attendance-download-status').textContent='';
    try{
      const blob=await window.InvitationPass.png(get('attendance-pass'),passModel(),theme),url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download='mi-pase.png';document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);
      get('attendance-download-status').textContent='Tu pase está listo para descargar.';get('attendance-pass-error').hidden=true;
    }catch(_){get('attendance-download-status').textContent='No pudimos descargar el pase. Pulsa “Descargar mi pase” para reintentar.';}
    finally{exporting=false;get('attendance-download').disabled=false;get('attendance-download').textContent='Descargar mi pase';}
  });
  window.addEventListener('invitation:team-changed',()=>{store.updateTeam(selectedTeam());if(store.get()){renderResult();publish();}});
  window.addEventListener('invitation:capsule-changed',()=>{if(store.get()&&fields().response==='yes')renderPass();});
  window.addEventListener('invitation:guest-name-changed',event=>{
    if(event.detail?.eventId!==store.eventId||event.detail.source==='attendance')return;
    name.value=typeof event.detail.name==='string'?event.detail.name.slice(0,80):'';clearErrors();if(store.get())renderResult();
  });
  const nextId=typeof options.nextSectionId==='string'&&/^[a-zA-Z][\w-]*$/.test(options.nextSectionId)?options.nextSectionId:'baby-wishes';
  // La invitación termina en esta sección; el enlace de continuación sólo se conecta si existe.
  const continuation=get('baby-wishes'),wishes=get('attendance-wishes');if(continuation)continuation.id=nextId;
  if(wishes){wishes.href='#'+nextId;wishes.addEventListener('click',event=>{const target=get(nextId);if(!target)return;event.preventDefault();target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:motion.matches?'instant':'smooth'});});}
  function keepFieldVisible(){const active=document.activeElement;if(!section.contains(active)||!['INPUT','SELECT','TEXTAREA'].includes(active.tagName))return;active.scrollIntoView({block:window.visualViewport?.height<520?'start':'center',behavior:'instant'});}
  section.addEventListener('focusin',()=>window.requestAnimationFrame(keepFieldVisible));window.visualViewport?.addEventListener('resize',keepFieldVisible);
  const recovered=store.get();if(recovered){name.value=recovered.name;note.value=recovered.note;guests.value=String(Math.min(limit,recovered.guests||1));radios.forEach(radio=>radio.checked=radio.value===recovered.response);store.updateTeam(selectedTeam());}
  const sharedName=window.InvitationCapsule?.getGuestName();if(sharedName)name.value=sharedName;else if(recovered)shareName();
  setMode(recovered?'result':'closed');
})();
