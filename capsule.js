(() => {
  'use strict';
  const config=window.INVITATION_CONFIG||{},options=config.capsule||{},core=window.InvitationCapsuleCore;
  const get=id=>document.getElementById(id);
  // team.js puede haber personalizado el ID de esta sección antes de cargar este archivo.
  const section=document.querySelector('.capsule-section');
  const cards=[...section.querySelectorAll('[data-card]')],radios=[...section.querySelectorAll('[name="capsule-resemblance"]')];
  const inputName=get('capsule-baby-name'),inputDate=get('capsule-arrival'),undecided=get('capsule-arrival-undecided'),guest=get('capsule-guest-name');
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let storage;try{storage=window.localStorage;}catch(_){/* Se conserva en memoria. */}
  const eventId=window.InvitationTeam?.eventId||config.teamSelection?.eventId;
  const store=core.createStore(eventId,storage);
  let draft=core.empty(),step=0,mode='cards',saveTimer;
  const team=()=>window.InvitationTeam?.getSelection()?.team||null;
  const announce=text=>{get('capsule-status').textContent=text;};
  const publish=()=>window.dispatchEvent(new CustomEvent('invitation:capsule-changed',{detail:store.get()}));
  const api=window.InvitationCapsule={eventId:store.eventId,getCapsule:()=>store.get(),getGuestName:()=>draft.guestName.trim(),setGuestName,registerCapsule:core.registerCapsule};
  function setGuestName(value,{source='capsule'}={}){
    draft.guestName=typeof value==='string'?value.slice(0,80):'';guest.value=draft.guestName;
    store.updateGuestName(draft.guestName);
    get('capsule-chest-tag').textContent=store.get()?.guestName||'';
    get('capsule-chest-tag').hidden=!store.get()?.guestName||mode==='cards'||mode==='saving';
    renderStorage();
    window.dispatchEvent(new CustomEvent('invitation:guest-name-changed',{detail:{eventId:store.eventId,name:draft.guestName,source}}));
  }
  function storageText(){return store.isPersisted()?'Tu cápsula está guardada en este dispositivo':'Tu cápsula está en memoria. No permanecerá al cerrar la página.';}
  function renderStorage(){for(const id of ['capsule-storage-note','capsule-summary-note']){get(id).textContent=storageText();get(id).hidden=!store.get()||mode==='saving';}}
  function updateInputs(){
    radios.forEach(radio=>{radio.checked=radio.value===draft.resemblance;});
    inputName.value=draft.name;inputDate.value=draft.arrivalDate;undecided.checked=draft.arrivalUndecided;guest.value=draft.guestName;
    renderFields();
  }
  function renderFields(){
    get('capsule-stamp').hidden=!draft.resemblance;
    get('capsule-characters').textContent=`Quedan ${100-draft.name.length} caracteres`;
    const selected=core.validDate(draft.arrivalDate);
    get('capsule-date-month').textContent=selected?core.formatDate(draft.arrivalDate,{month:'long',year:'numeric'}):'Una nueva aventura';
    get('capsule-date-day').textContent=selected?String(Number(draft.arrivalDate.slice(-2))):'?';
    get('capsule-date-caption').textContent=selected?core.formatDate(draft.arrivalDate,{weekday:'long'}):'Tu fecha imaginada';
  }
  function renderSummary(){
    const selected=team(),badge=get('capsule-summary-team');
    badge.hidden=!selected;badge.textContent=selected==='girl'?'Equipo niña':selected==='boy'?'Equipo niño':'';
    if(selected)badge.dataset.team=selected;else delete badge.dataset.team;
    get('capsule-answer-resemblance').textContent=core.resemblanceLabels[draft.resemblance]||'Sin predicción';
    get('capsule-answer-name').textContent=draft.name.trim()||'Sin predicción';
    get('capsule-answer-arrival').textContent=core.formatDate(draft.arrivalDate)||'Sin predicción';
    const empty=!core.hasAnswers(draft);
    get('capsule-empty-note').hidden=!empty;get('capsule-save').disabled=empty||mode==='saving';
    get('capsule-delete').hidden=!store.get();renderStorage();
  }
  function setMode(next){
    mode=next;section.dataset.mode=next;
    const editing=next==='cards',summary=next==='summary',saving=next==='saving';
    get('capsule-editor').hidden=!editing;get('capsule-summary').hidden=!summary;
    get('capsule-paper-area').hidden=!editing&&!summary;
    get('capsule-open').hidden=next!=='saved';get('capsule-close').hidden=!summary||!store.get();
    get('capsule-paper-pack').hidden=!saving;
    get('capsule-delete-confirm').hidden=true;
    get('capsule-chest').classList.toggle('is-closed',next==='saved');
    get('capsule-chest-caption').textContent=saving?'Guardando tus corazonadas…':next==='saved'?'Un recuerdo para abrir cuando quieras.':'Un pequeño cofre para tus grandes corazonadas.';
    get('capsule-chest-tag').textContent=store.get()?.guestName||'';
    get('capsule-chest-tag').hidden=!store.get()?.guestName||editing||saving;
    if(summary)renderSummary();renderStorage();
  }
  function showStep(index,focus=true){
    step=Math.max(0,Math.min(2,index));setMode('cards');
    cards.forEach((card,i)=>{card.hidden=i!==step;});
    [...section.querySelectorAll('[data-dot]')].forEach((dot,i)=>dot.classList.toggle('is-current',i===step));
    get('capsule-counter').textContent=`Tarjeta ${step+1} de 3`;
    get('capsule-back').disabled=step===0;get('capsule-next').firstChild.textContent=step===2?'Ver resumen ':'Siguiente ';
    renderFields();
    if(focus){const heading=get(`capsule-question-${step}`);heading.focus({preventScroll:true});heading.scrollIntoView({block:'nearest',behavior:motion.matches?'instant':'smooth'});}
  }
  function showSummary(focus=true){setMode('summary');if(focus){get('capsule-summary-title').focus({preventScroll:true});get('capsule-summary-title').scrollIntoView({block:'nearest',behavior:motion.matches?'instant':'smooth'});}}
  function finishSave(focus=true){
    window.clearTimeout(saveTimer);if(mode!=='saving')return;
    setMode('saved');announce(storageText());
    if(focus){get('capsule-open').focus({preventScroll:true});get('capsule-open').scrollIntoView({block:'nearest',behavior:motion.matches?'instant':'smooth'});}
  }
  get('capsule-form').addEventListener('submit',event=>event.preventDefault());
  radios.forEach(radio=>radio.addEventListener('change',()=>{if(radio.checked){draft.resemblance=radio.value;renderFields();announce('Mi predicción: '+core.resemblanceLabels[radio.value]);}}));
  inputName.addEventListener('input',()=>{draft.name=inputName.value.slice(0,100);if(inputName.value!==draft.name)inputName.value=draft.name;renderFields();});
  inputDate.addEventListener('input',()=>{draft.arrivalDate=core.validDate(inputDate.value)?inputDate.value:'';draft.arrivalUndecided=false;undecided.checked=false;renderFields();});
  undecided.addEventListener('change',()=>{draft.arrivalUndecided=undecided.checked;if(undecided.checked){draft.arrivalDate='';inputDate.value='';}renderFields();});
  guest.addEventListener('input',()=>setGuestName(guest.value));
  get('capsule-back').addEventListener('click',()=>showStep(step-1));
  get('capsule-next').addEventListener('click',()=>{if(step===2)showSummary();else showStep(step+1);});
  get('capsule-skip').addEventListener('click',()=>{
    if(step===0)draft.resemblance=null;
    if(step===1)draft.name='';
    if(step===2){draft.arrivalDate='';draft.arrivalUndecided=false;}
    updateInputs();if(step===2)showSummary();else showStep(step+1);
  });
  get('capsule-edit').addEventListener('click',()=>showStep(0));
  get('capsule-save').addEventListener('click',()=>{
    if(mode!=='summary'||!core.hasAnswers(draft))return;
    const record=store.save(draft,team());if(!record)return;
    setMode('saving');announce('Guardando tu cápsula.');publish();
    try{Promise.resolve(api.registerCapsule(record)).catch(()=>{});}catch(_){/* El futuro servicio no bloquea el uso local. */}
    if(motion.matches)finishSave();else saveTimer=window.setTimeout(()=>finishSave(),1500);
  });
  get('capsule-open').addEventListener('click',()=>{
    const record=store.get();if(!record||mode==='saving')return;
    updateInputs();showSummary();
  });
  get('capsule-close').addEventListener('click',()=>{
    const record=store.get();if(!record)return;
    setMode('saved');get('capsule-open').focus({preventScroll:true});get('capsule-open').scrollIntoView({block:'nearest',behavior:motion.matches?'instant':'smooth'});
  });
  get('capsule-delete').addEventListener('click',()=>{get('capsule-delete-confirm').hidden=false;get('capsule-delete-cancel').focus({preventScroll:true});get('capsule-delete-confirm').scrollIntoView({block:'nearest',behavior:motion.matches?'instant':'smooth'});});
  get('capsule-delete-cancel').addEventListener('click',()=>{get('capsule-delete-confirm').hidden=true;get('capsule-delete').focus({preventScroll:true});get('capsule-delete').scrollIntoView({block:'nearest',behavior:motion.matches?'instant':'smooth'});});
  get('capsule-delete-yes').addEventListener('click',()=>{
    const removed=store.clear();draft=core.empty();updateInputs();showStep(0);
    announce(removed?'Tu cápsula se borró de este dispositivo. Puedes empezar de nuevo.':'La cápsula se borró de esta página, pero no pudimos eliminar el guardado del navegador.');publish();
  });
  window.addEventListener('invitation:team-changed',()=>{
    const record=store.get();store.updateTeam(team());renderSummary();
    if(record)publish(); // Las respuestas y los campos no se reinicializan al cambiar el equipo.
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finishSave(false);});
  window.addEventListener('pagehide',()=>finishSave(false));
  motion.addEventListener('change',()=>{if(motion.matches)finishSave(false);});
  function keepFieldVisible(){
    const active=document.activeElement;
    if([inputName,inputDate,guest].includes(active)){
      const compact=(window.visualViewport?.height||window.innerHeight)<520;
      active.scrollIntoView({block:compact?'start':'center',behavior:'instant'});
    }
  }
  for(const input of [inputName,inputDate,guest])input.addEventListener('focus',keepFieldVisible);
  window.visualViewport?.addEventListener('resize',keepFieldVisible);
  const range=core.rangeText(options.arrivalRange);get('capsule-arrival-range').textContent=range;get('capsule-arrival-range').hidden=!range;
  const nextId=options.nextSectionId||'attendance-section',link=get('capsule-attendance'),placeholder=get('attendance-section');
  if(placeholder)placeholder.id=nextId;link.href=`#${nextId}`;
  link.addEventListener('click',event=>{
    const target=get(nextId);if(!target)return;event.preventDefault();finishSave(false);
    target.scrollIntoView({block:'start',behavior:motion.matches?'instant':'smooth'});target.focus({preventScroll:true});
  });
  const restored=store.get();
  if(restored){store.updateTeam(team());draft=core.clean({...restored.answers,guestName:restored.guestName});updateInputs();setMode('saved');}
  else{updateInputs();showStep(0,false);}
})();
