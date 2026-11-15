/* Aurenix 0.9 — gizmos 3D móveis, redimensionamento, movimento e rotação por eixo.
 * Alças com hit-area maior que o tamanho visual, uma única ação no histórico.
 * Ferramentas: select/resize = escala, translate = eixo/solo, rotate = eixo.
 */
(function(global){
'use strict';
const RAD=Math.PI/180;
const dimensions={x:'w',y:'h',z:'d'};
const colors={x:'#ff8094',y:'#85efad',z:'#82b6ff',plane:'#f8d98b'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const handles=[['x',-1],['x',1],['y',-1],['y',1],['z',-1],['z',1]];
function rotateAxis(o,axis){
 let x=axis==='x'?1:0,y=axis==='y'?1:0,z=axis==='z'?1:0;
 const a=num(o.rz)*RAD,b=num(o.rx)*RAD,c=num(o.ry)*RAD;
 let t=x*Math.cos(a)-y*Math.sin(a);y=x*Math.sin(a)+y*Math.cos(a);x=t;
 t=y*Math.cos(b)-z*Math.sin(b);z=y*Math.sin(b)+z*Math.cos(b);y=t;
 t=x*Math.cos(c)+z*Math.sin(c);z=-x*Math.sin(c)+z*Math.cos(c);x=t;
 return {x,y,z};
}
function coords(o,axis,sign){
 const size=Math.max(.1,num(o[dimensions[axis]],1)),v=rotateAxis(o,axis);
 return [num(o.x)+v.x*sign*size/2,num(o.y)+v.y*sign*size/2,num(o.z)+v.z*sign*size/2];
}
function gestureValue(origin,axis,sign,mode,delta,snap){
 const next={...origin},v=rotateAxis(origin,axis);
 if(mode==='resize'){
  const sizeKey=dimensions[axis];
  const size=clamp(num(origin[sizeKey],1)+sign*delta,.1,10000);
  const after=clamp(snap?Math.round(size*4)/4:size,.1,10000);
  const shift=sign*(after-num(origin[sizeKey],1))/2;
  next[sizeKey]=Math.round(after*1000)/1000;
  for(const k of ['x','y','z'])next[k]=Math.round((num(origin[k])+v[k]*shift)*1000)/1000;
 }else if(mode==='translate'){
  let d=clamp(delta,-1e4,1e4);if(snap)d=Math.round(d*4)/4;
  for(const k of ['x','y','z'])next[k]=Math.round((num(origin[k])+v[k]*d)*1000)/1000;
 }else if(mode==='rotate'){
  const key={x:'rx',y:'ry',z:'rz'}[axis];
  let d=clamp(delta,-720,720);if(snap)d=Math.round(d/5)*5;
  next[key]=Math.round((num(origin[key])+d)*100)/100;
 }
 return next;
}
function create(options){
 const {viewport,scene3dCanvas,getProject,getSelected,getRenderer,getTool,onStart,onChange,onEnd,getSnap}=options;
 if(!viewport||!scene3dCanvas)return {draw(){},start(){return false},move(){return false},end(){return false},cancel(){},isDragging(){return false}};
 const canvas=document.createElement('canvas');canvas.id='ax3dHandles';canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8;';
 viewport.appendChild(canvas);
 const ctx=canvas.getContext('2d');
 let spots=[],drag=null,visibleMode='resize',shownHintAt=0;
 const ready=()=>getProject()?.mode==='3d'&&getRenderer()?.vp&&!!getSelected()?.visible&&!getSelected()?.editorLocked;
 const mode=()=>{const tool=getTool?.();return tool==='translate'?'translate':tool==='rotate'?'rotate':tool==='pan'?'pan':'resize';};
 function projectAt(renderer,o,v,len){
  return renderer.project([num(o.x)+v.x*len,num(o.y)+v.y*len,num(o.z)+v.z*len]);
 }
 function draw(){
  if(!ctx)return;
  if(!ready()||mode()==='pan'){spots=[];ctx.clearRect(0,0,canvas.width,canvas.height);return;}
  const bounds=scene3dCanvas.getBoundingClientRect(),w=bounds.width,h=bounds.height;
  if(w<=1||h<=1)return;
  const dpr=Math.min(global.devicePixelRatio||1,1.8),tw=Math.round(w*dpr),th=Math.round(h*dpr);
  if(canvas.width!==tw||canvas.height!==th){canvas.width=tw;canvas.height=th;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const o=getSelected(),renderer=getRenderer(),center=renderer.project([num(o.x),num(o.y),num(o.z)]);
  if(!center)return;
  const current=mode();visibleMode=current;spots=[];
  const distance=clamp(num(o.w,1)+num(o.h,1)+num(o.d,1),1,50);
  const size=clamp(distance/3+.25,.75,4.2);
  const axes=current==='resize'?handles:[['x',1],['y',1],['z',1]];
  for(const [axis,sign] of axes){
   const v=rotateAxis(o,axis);
   const length=current==='resize'?Math.max(.25,num(o[dimensions[axis]],1)/2):size;
   const p=projectAt(renderer,o,v,sign*length);
   if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
   let x=p.x,y=p.y;
   // When an axis points straight at the camera its projection can collapse.
   if(Math.hypot(x-center.x,y-center.y)<13){
    const fallback={x:[40,10],y:[0,-49],z:[-37,24]}[axis];
    x=center.x+fallback[0]*sign;y=center.y+fallback[1]*sign;
   }
   spots.push({axis,sign,x,y,v,mode:current});
   ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo(x,y);ctx.lineWidth=current==='rotate'?4:3;
   ctx.strokeStyle=colors[axis]+'b4';ctx.setLineDash(current==='resize'?[6,4]:[]);ctx.stroke();ctx.setLineDash([]);
  }
  if(current==='translate'){
   const spot={axis:'plane',sign:1,x:center.x,y:center.y,mode:current};
   spots.push(spot);
   ctx.beginPath();ctx.roundRect(center.x-14,center.y-14,28,28,7);
   ctx.fillStyle='#f8d98bba';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#1b2e40';ctx.stroke();
   ctx.fillStyle='#142237';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 10px system-ui';ctx.fillText('XZ',center.x,center.y);
  }
  // Prioritize axis tips over plane in hitTest.
  for(const s of spots.filter(s=>s.axis!=='plane')){
   const active=drag?.axis===s.axis&&drag?.sign===s.sign;
   const radius=active?20:17;
   ctx.save();ctx.shadowColor=colors[s.axis];ctx.shadowBlur=active?19:9;
   ctx.beginPath();ctx.arc(s.x,s.y,radius,0,Math.PI*2);
   ctx.fillStyle='#122b3d';ctx.fill();ctx.strokeStyle=colors[s.axis];ctx.lineWidth=active?4.5:3.5;ctx.stroke();
   ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.font='900 12px system-ui';
   ctx.fillText(current==='resize'?(s.sign>0?'+':'−')+s.axis.toUpperCase():s.axis.toUpperCase(),s.x,s.y);
   ctx.restore();
  }
  if(w>250&&h>180){
   const label={resize:'Puxe + / − para escalar',translate:'Puxe X, Y, Z ou XZ para mover',rotate:'Puxe um eixo para girar'}[current];
   const width=clamp(label.length*7+24,170,w-16);
   const x=clamp(center.x-width/2,8,Math.max(8,w-width-8)),y=clamp(center.y+63,14,h-29);
   ctx.save();ctx.beginPath();ctx.roundRect(x,y,width,25,9);ctx.fillStyle='#09192ed9';ctx.fill();
   ctx.strokeStyle='#577488';ctx.lineWidth=1;ctx.stroke();
   ctx.fillStyle='#d7f4fb';ctx.font='700 11px system-ui';ctx.textAlign='center';
   ctx.fillText(label,x+width/2,y+16);ctx.restore();
  }
 }
 function hitTest(e){
  if(!ready()||mode()==='pan')return null;
  const bounds=scene3dCanvas.getBoundingClientRect(),x=e.clientX-bounds.left,y=e.clientY-bounds.top;
  let best=null,dist=Infinity;
  for(const s of spots.filter(x=>x.axis!=='plane')){
   const d=Math.hypot(x-s.x,y-s.y);
   if(d<=35&&d<dist){best=s;dist=d;}
  }
  if(best)return best;
  const plane=spots.find(x=>x.axis==='plane');
  if(plane&&Math.hypot(x-plane.x,y-plane.y)<=28)return plane;
  return null;
 }
 function start(e){
  if(drag||!ready()||e.button>0)return false;
  const spot=hitTest(e);if(!spot)return false;
  const o=getSelected(),renderer=getRenderer(),origin={...o};
  const m=mode();
  let vx=0,vy=0,scale=1;
  if(spot.axis!=='plane'){
   const v=spot.v,p=renderer.project([num(o.x),num(o.y),num(o.z)]);
   const q=projectAt(renderer,o,v,1);
   if(p&&q){vx=q.x-p.x;vy=q.y-p.y;scale=vx*vx+vy*vy;}
  }
  drag={id:o.id,pointerId:e.pointerId,axis:spot.axis,sign:spot.sign,mode:m,
   startX:e.clientX,startY:e.clientY,vx,vy,scale,origin,changed:false};
  e.preventDefault();return true;
 }
 function delta(d,dx,dy){
  if(d.axis==='plane'){
   return {x:(dx*Math.cos(num(d.origin.ry)*RAD)+dy*Math.sin(num(d.origin.ry)*RAD))*.02,
           z:(-dx*Math.sin(num(d.origin.ry)*RAD)+dy*Math.cos(num(d.origin.ry)*RAD))*.02};
  }
  if(d.mode==='rotate'){
   const dragX=dx*.8,dragY=dy*.8;
   return d.axis==='y'?dragX:d.axis==='x'?dragY:dragX;
  }
  if(d.scale>8)return (dx*d.vx+dy*d.vy)/d.scale;
  return (d.axis==='y'?-dy:dx)/Math.max(16,Math.sqrt(d.scale));
 }
 function move(e){
  if(!drag||e.pointerId!==drag.pointerId)return false;
  const o=getSelected();if(!o||o.id!==drag.id){drag=null;return false;}
  const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
  if(Math.hypot(dx,dy)<4&&!drag.changed)return true;
  const snap=!!getSnap?.(),raw=delta(drag,dx,dy);
  let next;
  if(drag.axis==='plane'){
   const factor=Math.max(.002,(getRenderer()?.cameraDistance||15)/Math.max(240,scene3dCanvas.clientHeight))*.9;
   const yaw=getRenderer()?.cameraYaw??.7,wx=(dx*Math.cos(yaw)+dy*Math.sin(yaw))*factor,wz=(-dx*Math.sin(yaw)+dy*Math.cos(yaw))*factor;
   next={...drag.origin,x:num(drag.origin.x)+wx,z:num(drag.origin.z)+wz};
   if(snap){next.x=Math.round(next.x*4)/4;next.z=Math.round(next.z*4)/4;}
  }else next=gestureValue(drag.origin,drag.axis,drag.sign,drag.mode,raw,snap);
  if(!drag.changed){drag.changed=true;onStart?.();}
  for(const key of ['x','y','z','w','h','d','rx','ry','rz']){
   if(Number.isFinite(next[key]))o[key]=next[key];
  }
  onChange?.();e.preventDefault();return true;
 }
 function end(e){
  if(!drag||e.pointerId!==drag.pointerId)return false;
  const changed=drag.changed;drag=null;if(changed)onEnd?.();
  e.preventDefault();return true;
 }
 function cancel(){
  if(!drag)return;
  const o=getSelected();if(o?.id===drag.id)Object.assign(o,drag.origin);
  const changed=drag.changed;drag=null;
  if(changed)onChange?.();
 }
 return {draw,start,move,end,cancel,isDragging:()=>!!drag,hitTest,canvas};
}
global.AurenixGizmo={create,rotateAxis,coords,gestureValue};
})(window);
