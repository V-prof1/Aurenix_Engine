/* Aurenix 0.14 Mobile 3D gestures, deterministic & unit-testable. */
(function(global){
'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number(v)||0));
const snap=(v,step)=>Math.round(v/step)*step;
const round=v=>Math.round(v*10000)/10000;
function transform({tool='orbit',start,dx=0,dy=0,camera={},snapToGrid=false,depth=false}){
 if(!start)return null;
 const yaw=Number(camera.yaw)||0,k=clamp(Number(camera.distance)||7,2,40)/800;
 const result={position:[...(start.position||[0,0,0])],rotation:[...(start.rotation||[0,0,0])],size:[...(start.size||[1,1,1])]};
 if(tool==='move'){
  if(depth){result.position[2]-=dy*k;result.position[0]+=dx*k*Math.cos(yaw);}
  else{
   result.position[0]+=dx*k*Math.cos(yaw);
   result.position[2]+=dx*k*Math.sin(yaw);
   result.position[1]-=dy*k;
  }
 }else if(tool==='face'){
  result.position[0]+=dx*k*.65;
  result.position[1]-=dy*k*.65;
 }else if(tool==='rotate'){
  if(depth)result.rotation[2]+=dx*.48;else result.rotation[1]+=dx*.48;
  result.rotation[0]+=dy*.48;
 }else if(tool==='scale'){
  const factor=Math.exp(-dy*.007);
  result.size=result.size.map(n=>clamp(n*factor,.02,30));
 }
 if(snapToGrid){
  if(tool==='rotate')result.rotation=result.rotation.map(v=>snap(v,5));
  else if(tool==='scale')result.size=result.size.map(v=>snap(v,.05));
  else result.position=result.position.map(v=>snap(v,.05));
 }
 result.position=result.position.map(x=>round(clamp(x,-500,500)));
 result.rotation=result.rotation.map(x=>round(clamp(x,-1440,1440)));
 result.size=result.size.map(x=>round(clamp(x,.02,30)));
 return result;
}
function pick(parts,point,project,{facesOnly=false,threshold=62}={}){
 let best=null,bestDist=threshold;
 for(const mesh of parts||[]){
  if(facesOnly&&!mesh._faceRole)continue;
  const p=project([mesh.x||0,mesh.y||0,mesh.z||0]);
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
  const distance=Math.hypot(p.x-point.x,p.y-point.y);
  if(distance<bestDist){best=mesh;bestDist=distance;}
 }
 return best;
}
function faceMarkers(parts,project){
 const symbols={eyeL:'👁',eyeR:'👁',pupilL:'·',pupilR:'·',browL:'⌒',browR:'⌒',mouth:'⌣',cornerL:'·',cornerR:'·',cheekL:'•',cheekR:'•'};
 const positions=[];
 for(const p of parts||[]){
  if(!symbols[p._faceRole])continue;
  const xy=project([p.x,p.y,p.z]);
  if(!xy||!Number.isFinite(xy.x)||!Number.isFinite(xy.y))continue;
  positions.push({id:p._partId,role:p._faceRole,symbol:symbols[p._faceRole],x:xy.x,y:xy.y});
 }
 return positions;
}
global.AurenixModelTouch={transform,pick,faceMarkers};
})(window);
