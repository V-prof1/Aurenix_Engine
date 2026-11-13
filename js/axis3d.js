/* Aurenix 0.6 — indicador de orientação tridimensional com X/Y/Z grandes.
   Projeta os vetores de base conforme a câmera orbital, sem WebGL extra. */
(function(global){
'use strict';
const AXES=[
 {key:'X',rgb:'#ff7f92',vec:[1,0,0],yaw:Math.PI/2,pitch:.13},
 {key:'Y',rgb:'#86ebaf',vec:[0,1,0],yaw:Math.PI/4,pitch:1.35},
 {key:'Z',rgb:'#7db8ff',vec:[0,0,1],yaw:0,pitch:.13}
];
function projectAxes(camera){
 const yaw=Number(camera?.yaw)||0,pitch=Number(camera?.pitch)||0;
 const right=[Math.cos(yaw),0,-Math.sin(yaw)];
 const up=[-Math.sin(pitch)*Math.sin(yaw),Math.cos(pitch),-Math.sin(pitch)*Math.cos(yaw)];
 const eye=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
 return AXES.map(a=>({
 ...a,screenX:a.vec.reduce((v,x,i)=>v+x*right[i],0),
 screenY:-a.vec.reduce((v,x,i)=>v+x*up[i],0),
 depth:a.vec.reduce((v,x,i)=>v+x*eye[i],0)
 }));
}
function create(canvas,onSnap){
 if(!canvas) return {draw(){},getPositions:()=>[]};
 const ctx=canvas.getContext('2d');if(!ctx)return {draw(){},getPositions:()=>[]};
 let positions=[],size=120;
 function draw(cam,active=true){
  const rect=canvas.getBoundingClientRect(),width=rect.width||120;
  size=Math.max(110,Math.min(155,width));
  const ratio=Math.min(global.devicePixelRatio||1,2);
  const target=Math.round(size*ratio);
  if(canvas.width!==target||canvas.height!==target){canvas.width=target;canvas.height=target;}
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size,size);
  if(!active){positions=[];return;}
  const origin=size/2,length=size*.285,radius=Math.max(13,size*.115),directions=projectAxes(cam);
  ctx.beginPath();ctx.arc(origin,origin,3,0,2*Math.PI);ctx.fillStyle='#a8b7ce';ctx.fill();
  for(const a of directions){
   ctx.beginPath();ctx.moveTo(origin,origin);ctx.lineTo(origin-a.screenX*length*.65,origin-a.screenY*length*.65);
   ctx.strokeStyle=a.rgb+'52';ctx.lineWidth=3;ctx.stroke();
  }
  const sorted=directions.slice().sort((a,b)=>a.depth-b.depth);
  positions=[];
  for(const a of sorted){
   const x=origin+a.screenX*length,y=origin+a.screenY*length;
   ctx.beginPath();ctx.moveTo(origin,origin);ctx.lineTo(x,y);
   ctx.strokeStyle=a.rgb;ctx.lineCap='round';ctx.lineWidth=5;ctx.stroke();
   ctx.shadowColor=a.rgb;ctx.shadowBlur=10;
   ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle='#18273a';ctx.fill();
   ctx.shadowBlur=0;ctx.strokeStyle=a.rgb;ctx.lineWidth=3;ctx.stroke();
   ctx.font='900 '+Math.round(radius*1.12)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillStyle='#f3fbff';ctx.fillText(a.key,x,y+.5);
   positions.push({key:a.key,x,y,radius:radius+10,...a});
  }
  ctx.fillStyle='#ced8ea';ctx.font='700 10px system-ui';ctx.textAlign='center';
  ctx.fillText('ORIENTAÇÃO 3D',origin,size-3);
 }
 canvas.addEventListener('pointerdown',e=>{
  e.stopPropagation();e.preventDefault();
  const r=canvas.getBoundingClientRect();
  const x=(e.clientX-r.left)*(size/Math.max(1,r.width)),y=(e.clientY-r.top)*(size/Math.max(1,r.height));
  let closest=null,best=Infinity;
  for(const a of positions){
    const d=Math.hypot(x-a.x,y-a.y);
    if(d<Math.max(26,a.radius+5)&&d<best){closest=a;best=d;}
  }
  if(closest)onSnap?.({axis:closest.key,yaw:closest.yaw,pitch:closest.pitch});
 });
 return {draw,getPositions:()=>positions.slice()};
}
global.AurenixAxis3D={create,projectAxes};
})(window);