/* La elección expresa una corazonada. No contiene ni calcula el resultado del bebé. */
(() => {
  "use strict";
  const validTeam = team => team === "girl" || team === "boy";
  const teamName = team => team === "girl" ? "Equipo niña" : "Equipo niño";
  function validate(record,eventId) {
    return record && record.version === 1 && record.eventId === eventId && validTeam(record.team) && typeof record.confirmedAt === "string" && Number.isFinite(Date.parse(record.confirmedAt));
  }
  function createStore(eventId,storage) {
    const id = typeof eventId === "string" && eventId.trim() ? eventId.trim() : "plantilla-default-revelacion";
    const key = `baby-invitation:team:${encodeURIComponent(id)}`;
    let memory = null, persisted = false;
    try {
      const record = JSON.parse(storage?.getItem(key) || "null");
      if (validate(record,id)) { memory = record; persisted = true; }
    } catch (_) { /* Un registro inválido o almacenamiento bloqueado no impiden participar. */ }
    return {
      eventId:id, key,
      get:()=>memory ? {...memory} : null,
      isPersisted:()=>persisted,
      confirm(team,now = new Date()) {
        if (!validTeam(team)) return null;
        memory = {version:1,eventId:id,team,confirmedAt:now.toISOString()};
        persisted = false;
        try { if (storage) { storage.setItem(key,JSON.stringify(memory)); persisted = true; } } catch (_) { /* La elección sigue en memoria. */ }
        return {...memory};
      },
      clear() {
        memory = null; persisted = false;
        try { storage?.removeItem(key); } catch (_) { /* Sigue siendo posible cambiar de equipo. */ }
      }
    };
  }
  function inside(point,rect) { return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom; }
  // Punto independiente para conectar una base de datos en una próxima etapa.
  // Esta implementación no envía datos a ningún servicio.
  async function registerChoice(record) { return {mode:"local-only",eventId:record.eventId}; }
  const api = {validTeam,teamName,createStore,inside,registerChoice};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.InvitationChoice = api;
})();
