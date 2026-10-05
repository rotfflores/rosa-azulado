/* El mismo lienzo se muestra en la página y se exporta: no incluye controles.
   El pase toma el color del equipo elegido e incluye el resumen de todo lo que eligió el invitado. */
(() => {
  'use strict';
  function wrap(ctx,text,width){
    const lines=[];let line='';
    for(const word of String(text).split(/\s+/)){
      if(ctx.measureText(word).width>width){
        if(line){lines.push(line);line='';}
        for(const char of word){if(ctx.measureText(line+char).width>width){lines.push(line);line=char;}else line+=char;}
      }else if(line&&ctx.measureText(line+' '+word).width>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;
    }
    if(line)lines.push(line);return lines.length?lines:[''];
  }
  async function fontsReady(theme){
    if(document.fonts){await document.fonts.ready;await Promise.all([document.fonts.load(`500 40px ${theme.serif}`),document.fonts.load(`600 24px ${theme.sans}`)]);}
  }
  // Paleta del pase según el equipo; sin equipo, mezcla rosa y azul.
  function palette(team,theme){
    if(team==='girl')return {top:'#f7bfd0',bottom:'#fff1f6',deep:theme.pinkInk,balloons:['#ec9cb7'],confetti:['#ffffff',theme.pinkInk,'#f39ab8','#fbd3df'],soft:'#fde4ec'};
    if(team==='boy')return {top:'#acd8ec',bottom:'#eef8fc',deep:theme.blueInk,balloons:['#7cbcd8'],confetti:['#ffffff',theme.blueInk,'#7fc0dc','#cfe9f4'],soft:'#e0f1f8'};
    return {top:'#f3c6d6',bottom:'#d9eef6',deep:theme.ink,balloons:['#ec9cb7','#7cbcd8'],confetti:['#ffffff',theme.pinkInk,theme.blueInk,'#f39ab8','#7fc0dc'],soft:'#f1ecf3',mixed:true};
  }
  // Mide el contenido para que la altura del pase se adapte al texto.
  function layout(ctx,model,theme){
    const inner=396;
    ctx.font=`500 36px ${theme.serif}`;const name=wrap(ctx,model.name,inner);
    ctx.font=`700 18px ${theme.sans}`;
    const rows=(Array.isArray(model.predictions)?model.predictions:[]).map(row=>({label:row.label,value:wrap(ctx,row.value,inner)}));
    ctx.font=`500 25px ${theme.serif}`;const parents=wrap(ctx,model.parents,440);
    ctx.font=`600 18px ${theme.sans}`;const date=wrap(ctx,model.date,440),venue=wrap(ctx,model.venue,440);
    let panel=28+20+name.length*42+14+40+30+34;
    panel+=rows.length?rows.reduce((sum,row)=>sum+20+row.value.length*24+14,0):30;
    panel+=22+30+34+28;
    const height=200+panel+34+parents.length*31+12+(date.length+1)*25+venue.length*25+30+34+24+44;
    return {name,rows,parents,date,venue,panel,height};
  }
  function heart(ctx,x,y,size){
    ctx.beginPath();ctx.moveTo(x,y+size*.9);
    ctx.bezierCurveTo(x-size*1.2,y+size*.1,x-size*.6,y-size*.8,x,y-size*.15);
    ctx.bezierCurveTo(x+size*.6,y-size*.8,x+size*1.2,y+size*.1,x,y+size*.9);ctx.fill();
  }
  function draw(canvas,model,theme){
    let ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar la imagen.');
    const width=540,box=layout(ctx,model,theme),height=box.height,colors=palette(model.team,theme),ink=colors.deep;
    canvas.width=width*2;canvas.height=height*2;ctx=canvas.getContext('2d');ctx.scale(2,2);
    const round=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
    const spaced=(text,x,y,spacing)=>{if('letterSpacing' in ctx){ctx.letterSpacing=`${spacing}px`;ctx.fillText(text,x,y);ctx.letterSpacing='0px';}else ctx.fillText(text,x,y);};
    // Tarjeta con fondo del color del equipo.
    ctx.shadowColor='#5a456040';ctx.shadowBlur=24;ctx.shadowOffsetY=10;round(16,16,508,height-40,32);ctx.fillStyle=colors.bottom;ctx.fill();ctx.shadowColor='transparent';
    const wash=colors.mixed?ctx.createLinearGradient(16,0,524,0):ctx.createLinearGradient(0,16,0,height-24);
    wash.addColorStop(0,colors.top);wash.addColorStop(colors.mixed?1:.55,colors.bottom);if(!colors.mixed)wash.addColorStop(1,colors.soft);
    ctx.fillStyle=wash;round(16,16,508,height-40,32);ctx.fill();
    // Confeti fijo (semilla) para que el pase siempre se vea igual.
    let seed=7;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<46;i++){
      const x=30+random()*480,y=26+random()*(height-70),c=colors.confetti[i%colors.confetti.length];
      if(x>40&&x<500&&y>196&&y<200+box.panel+8)continue;
      ctx.globalAlpha=.55+random()*.35;ctx.fillStyle=c;
      if(i%5===0)heart(ctx,x,y,4+random()*3);
      else if(i%3===0){ctx.beginPath();ctx.arc(x,y,2+random()*2.5,0,Math.PI*2);ctx.fill();}
      else{ctx.save();ctx.translate(x,y);ctx.rotate(random()*Math.PI);ctx.fillRect(-4,-2,8,4);ctx.restore();}
    }
    ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.textBaseline='top';
    ctx.fillStyle=ink;ctx.font=`800 12px ${theme.sans}`;spaced('UN RECUERDO DE NUESTRA DULCE ESPERA',270,46,2);
    // Globo del equipo (dos globos si aún no hay equipo).
    const balloons=colors.balloons.length===1?[[270,colors.balloons[0]]]:[[234,colors.balloons[0]],[306,colors.balloons[1]]];
    for(const [x,color]of balloons){
      const top=78;
      ctx.strokeStyle=ink+'99';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,top+84);ctx.bezierCurveTo(x-10,top+98,x+10,top+108,x,top+122);ctx.stroke();
      const gradient=ctx.createRadialGradient(x-12,top+20,2,x,top+40,52);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.35,color);gradient.addColorStop(.8,color);gradient.addColorStop(1,ink+'99');
      ctx.fillStyle=gradient;ctx.beginPath();ctx.ellipse(x,top+40,32,42,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(x-6,top+86);ctx.lineTo(x+6,top+86);ctx.lineTo(x,top+80);ctx.closePath();ctx.fill();
      ctx.fillStyle='#ffffffaa';ctx.beginPath();ctx.ellipse(x-12,top+22,6,11,-.5,0,Math.PI*2);ctx.fill();
    }
    // Panel blanco tipo boleto con muescas a los lados.
    const panelTop=200;
    ctx.shadowColor='#5a456030';ctx.shadowBlur=18;ctx.shadowOffsetY=6;round(44,panelTop,452,box.panel,24);ctx.fillStyle='#fffdf9';ctx.fill();ctx.shadowColor='transparent';
    ctx.strokeStyle=ink+'55';ctx.lineWidth=1;ctx.setLineDash([4,5]);round(54,panelTop+10,432,box.panel-20,17);ctx.stroke();ctx.setLineDash([]);
    ctx.save();ctx.globalCompositeOperation='destination-out';
    for(const x of [16,524]){ctx.beginPath();ctx.arc(x,panelTop+box.panel/2,14,0,Math.PI*2);ctx.fill();}
    ctx.restore();
    let y=panelTop+28;
    ctx.fillStyle=ink;ctx.font=`800 12px ${theme.sans}`;spaced('PASE DE',270,y,3);y+=20;
    ctx.fillStyle=theme.ink;ctx.font=`500 36px ${theme.serif}`;for(const line of box.name){ctx.fillText(line,270,y);y+=42;}y+=14;
    // Píldora del equipo.
    ctx.font=`800 17px ${theme.sans}`;const pillWidth=Math.min(360,ctx.measureText(model.teamLabel).width+56);
    ctx.fillStyle=ink;round(270-pillWidth/2,y,pillWidth,40,20);ctx.fill();ctx.fillStyle='#ffffff';ctx.fillText(model.teamLabel,270,y+10);y+=40+30;
    const divider=()=>{ctx.strokeStyle=ink+'40';ctx.setLineDash([2,5]);ctx.beginPath();ctx.moveTo(84,y-15);ctx.lineTo(456,y-15);ctx.stroke();ctx.setLineDash([]);};
    divider();
    ctx.fillStyle=ink;ctx.font=`500 22px ${theme.serif}`;ctx.fillText('Mis corazonadas',270,y);y+=34;
    if(box.rows.length){
      for(const row of box.rows){
        ctx.fillStyle=theme.ink+'b0';ctx.font=`700 12px ${theme.sans}`;spaced(String(row.label).toUpperCase(),270,y,1.5);y+=20;
        ctx.fillStyle=theme.ink;ctx.font=`700 18px ${theme.sans}`;for(const line of row.value){ctx.fillText(line,270,y);y+=24;}y+=14;
      }
    }else{ctx.fillStyle=theme.ink+'b0';ctx.font=`600 16px ${theme.sans}`;ctx.fillText('Las guardo para el gran día',270,y);y+=30;}
    y+=22;divider();
    ctx.fillStyle=theme.ink;ctx.font=`700 18px ${theme.sans}`;ctx.fillText(`${model.guests} ${model.guests===1?'asistente':'asistentes'} · incluyéndote`,270,y);y+=30;
    ctx.font=`800 14px ${theme.sans}`;const statusWidth=ctx.measureText(model.status).width+40;
    ctx.fillStyle=ink+'22';round(270-statusWidth/2,y,statusWidth,30,15);ctx.fill();ctx.fillStyle=ink;ctx.fillText(model.status,270,y+7);
    // Datos del evento sobre el fondo de color.
    y=panelTop+box.panel+34;
    ctx.fillStyle=theme.ink;ctx.font=`500 25px ${theme.serif}`;for(const line of box.parents){ctx.fillText(line,270,y);y+=31;}y+=12;
    ctx.font=`600 18px ${theme.sans}`;for(const line of box.date){ctx.fillText(line,270,y);y+=25;}
    ctx.fillText(model.time,270,y);y+=25;
    for(const line of box.venue){ctx.fillText(line,270,y);y+=25;}y+=30;
    ctx.fillStyle=ink;ctx.font=`500 24px ${theme.serif}`;ctx.fillText('Una gran sorpresa nos espera',270,y);
    const footerWidth=ctx.measureText('Una gran sorpresa nos espera').width||300;heart(ctx,270-footerWidth/2-18,y+13,6);heart(ctx,270+footerWidth/2+18,y+13,6);
    return {width:canvas.width,height:canvas.height};
  }
  async function png(canvas,model,theme){await fontsReady(theme);draw(canvas,model,theme);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('No se pudo generar el PNG.')),'image/png'));}
  const api={wrap,fontsReady,palette,draw,png};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.InvitationPass=api;
})();
