// Página temporal para comprobar la descarga real. Todos sus datos son ficticios.
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname,"..");
const section = fs.readFileSync(path.join(root,"index.html"),"utf8").match(/<section class="event-section"[\s\S]*?<\/section>/)[0];
const event = {name:"Evento de prueba",timeZone:"America/Mexico_City",start:"2027-10-20T17:30:00-06:00",end:"2027-10-20T20:00:00-06:00",venue:"Lugar de prueba",address:"Calle de prueba 123",description:"Descripción ficticia para verificar la descarga de calendario.",note:"Esta nota pertenece únicamente a la prueba.",dressCode:{enabled:true,text:"Texto de vestimenta de prueba."}};
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="../"><title>Prueba del calendario — datos ficticios</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="event.css"><script>window.INVITATION_CONFIG=${JSON.stringify({event})};</script><script src="event-core.js" defer></script><script src="event.js" defer></script></head><body><p style="text-align:center;padding:15px;font-size:12px">Datos ficticios · Sólo para comprobar el calendario</p><main class="invitation" data-stage="cover">${section}</main><div id="vote-section" tabindex="-1"></div></body></html>`;
fs.writeFileSync(path.join(__dirname,"event-fixture.html"),html);
console.log("Fixture temporal creada con datos ficticios.");
