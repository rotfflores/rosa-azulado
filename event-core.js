/* Fechas e iCalendar, compartidos por la sección y sus pruebas. Sin dependencias. */
(() => {
  "use strict";
  const clean = value => typeof value === "string" ? value.trim() : "";

  function explicitDate(value) {
    const text = clean(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(text);
    if (!match) return null;
    const [,year,month,day,hour,minute,second = "0"] = match;
    if (+year < 1000 || +month < 1 || +month > 12 || +day < 1 || +day > new Date(Date.UTC(+year,+month,0)).getUTCDate() || +hour > 23 || +minute > 59 || +second > 59) return null;
    const parsed = new Date(text);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  function explicitZone(value) {
    const zone = clean(value);
    if (!zone) return null;
    try { new Intl.DateTimeFormat("es-MX",{timeZone:zone}).format(0); return zone; }
    catch (_) { return null; }
  }
  function mapsLink(value,address) {
    try {
      const link = new URL(clean(value));
      const host = link.hostname.toLowerCase();
      const google = /^(www\.|maps\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);
      const isMap = google && (host.startsWith("maps.") || /^\/maps(?:\/|$)/.test(link.pathname));
      const short = host === "maps.app.goo.gl" || (host === "goo.gl" && link.pathname.startsWith("/maps/"));
      if (link.protocol === "https:" && !link.username && !link.password && (isMap || short)) return link.href;
    } catch (_) { /* La dirección seleccionable sigue disponible si el enlace no es válido. */ }
    return clean(address) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean(address))}` : "";
  }
  function normalize(event = {}) {
    const zone = explicitZone(event.timeZone);
    const start = zone ? explicitDate(event.start) : null;
    const end = zone ? explicitDate(event.end) : null;
    const venue = clean(event.venue), address = clean(event.address), maps = mapsLink(event.mapsUrl,address);
    const location = [venue,address].filter(Boolean).join(", ") || maps;
    const name = clean(event.name), description = clean(event.description), note = clean(event.note);
    return {zone,start,end,venue,address,maps,location,name,description,note,
      canSave: Boolean(start && end && end > start && name && location && description)};
  }
  function dayKey(date,zone) {
    const parts = new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
    const get = type => parts.find(part=>part.type===type).value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }
  function countdown(event,now = new Date()) {
    if (!event.start || !event.zone) return {state:"pending",values:null};
    const difference = event.start.getTime() - now.getTime();
    if (difference <= 0) {
      return {state:dayKey(now,event.zone) > dayKey(event.start,event.zone) ? "past" : "today",values:{days:0,hours:0,minutes:0,seconds:0}};
    }
    const seconds = Math.ceil(difference / 1000);
    return {state:"counting",values:{days:Math.floor(seconds/86400),hours:Math.floor(seconds/3600)%24,minutes:Math.floor(seconds/60)%60,seconds:seconds%60}};
  }
  function nextDayBoundary(now,zone) {
    // Busca el cambio del día local; no supone que los días de una zona duren siempre 24 horas.
    const today = dayKey(now,zone);
    let low = now.getTime(), high = low + 36*3600000;
    while (high-low > 1) {
      const middle = Math.floor((low+high)/2);
      if (dayKey(new Date(middle),zone) === today) low = middle; else high = middle;
    }
    return high;
  }
  function labels(event) {
    if (!event.start || !event.zone) return null;
    const format = options => new Intl.DateTimeFormat("es-MX",{timeZone:event.zone,...options}).format(event.start);
    return {month:format({month:"long",year:"numeric"}),day:format({day:"numeric"}),weekday:format({weekday:"long"}),
      date:format({weekday:"long",day:"numeric",month:"long",year:"numeric"}),
      time:format({hour:"numeric",minute:"2-digit",hour12:true}),
      zone:new Intl.DateTimeFormat("es-MX",{timeZone:event.zone,timeZoneName:"long"}).formatToParts(event.start).find(part=>part.type==="timeZoneName").value};
  }
  const icsDate = date => date.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const escapeText = text => text.replace(/\\/g,"\\\\").replace(/\r\n|\r|\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
  function fold(line) {
    const encoder = new TextEncoder();
    let output = "", bytes = 0;
    for (const character of line) {
      const length = encoder.encode(character).length;
      if (bytes+length > 75) { output += "\r\n "; bytes = 1; }
      output += character; bytes += length;
    }
    return output;
  }
  function calendarFile(event,stamp = new Date()) {
    if (!event.canSave) return null;
    let hash = 2166136261;
    for (const char of `${event.name}|${event.start.toISOString()}|${event.end.toISOString()}`) hash = Math.imul(hash ^ char.charCodeAt(0),16777619);
    const description = [event.description,event.note].filter(Boolean).join("\n\n");
    return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Invitacion//Revelacion de bebe//ES","CALSCALE:GREGORIAN","BEGIN:VEVENT",
      `UID:${(hash>>>0).toString(16)}@invitacion.local`,`DTSTAMP:${icsDate(stamp)}`,
      `DTSTART:${icsDate(event.start)}`,`DTEND:${icsDate(event.end)}`,
      `SUMMARY:${escapeText(event.name)}`,`LOCATION:${escapeText(event.location)}`,`DESCRIPTION:${escapeText(description)}`,
      "END:VEVENT","END:VCALENDAR"].map(fold).join("\r\n")+"\r\n";
  }
  const api = {explicitDate,explicitZone,mapsLink,normalize,dayKey,countdown,nextDayBoundary,labels,calendarFile};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.InvitationEvent = api;
})();
