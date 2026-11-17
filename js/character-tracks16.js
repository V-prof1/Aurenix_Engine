/* Aurenix 0.16 — timelines independentes: corpo, rosto e transformações.
 * Mantém leitura de animações antigas sem trilhas, e não executa dados importados.
 */
(function(global){
'use strict';
const C=global.AurenixCharacters;
if(!C)throw Error('AurenixCharacters obrigatório');
const previous={validate:C.validate,getPose:C.getPose,getTransforms:C.getTransforms,getFaceAt:C.getFaceAt,expand:C.expand};
const cp=C.copy,clamp=(x,a,b)=>Math.min(b,Math.max(a,Number(x)||0));
const groups=['body','face','objects'], MAX=100;
const expressionIds=new Set((C.FACE_EXPRESSIONS||[]).map(x=>x[0]));
const round=n=>Math.round(n*1000)/1000;
function normalizedTime(c,t){return round(clamp(t,0,clamp(c.duration||1,.1,120)));}
function defaults(model){return Object.fromEntries(model.parts.map(p=>[p.id,[...p.rotation]]));}
function initial(c){
 return {
 body:(c.frames||[]).map(f=>({time:f.time,pose:cp(f.pose||{})})),
 face:(c.frames||[]).map(f=>({time:f.time,expression:f.expression||'neutral'})),
 objects:(c.frames||[]).map(f=>({time:f.time,transforms:cp(f.transforms||{})}))
 };
}
function ensure(c){if(!c.tracks||typeof c.tracks!=='object')c.tracks=initial(c);for(const channel of groups)if(!Array.isArray(c.tracks[channel]))c.tracks[channel]=[];return c.tracks;}
function sanitize(model,clip,tracks){
 const ids=new Set(model.parts.map(p=>p.id)),out={};
 for(const type of groups){
  const source=Array.isArray(tracks?.[type])?tracks[type].slice(0,MAX):[];
  const frames=[];
  for(const item of source){
   if(!item||!Number.isFinite(Number(item.time)))continue;
   const frame={time:normalizedTime(clip,item.time)};
   if(type==='body'){
    frame.pose={};
    for(const [id,rot] of Object.entries(item.pose||{}))if(ids.has(id)&&Array.isArray(rot))frame.pose[id]=rot.slice(0,3).map(n=>clamp(n,-1440,1440));
   }else if(type==='face')frame.expression=expressionIds.has(item.expression)?item.expression:'neutral';
   else frame.transforms=C.sanitizeTransforms?.(model,item.transforms)||{};
   frames.push(frame);
  }
  frames.sort((a,b)=>a.time-b.time);
  out[type]=frames.filter((f,i)=>i===0||Math.abs(f.time-frames[i-1].time)>.0005);
 }
 return out;
}
function getClip(model,id){return model.animations?.find(c=>c.id===id||c.name===id);}
function findEnds(frames,c,t){
 const dur=clamp(c.duration||1,.1,120);
 const v=c.loop?((Number(t||0)%dur)+dur)%dur:clamp(t,0,dur);
 if(!frames.length)return [null,null,0];
 let a=frames[0],b=frames[frames.length-1];
 if(v<=a.time)b=a;
 else if(v>=b.time)a=b;
 else for(let i=1;i<frames.length;i++)if(frames[i].time>=v){a=frames[i-1];b=frames[i];break;}
 let weight=a===b?0:clamp((v-a.time)/Math.max(.000001,b.time-a.time),0,1);
 if(c.ease==='smooth')weight=weight*weight*(3-2*weight);
 else if(c.ease==='step')weight=weight<1?0:1;
 return [a,b,weight];
}
function body(model,c,t){
 const base=defaults(model),frames=c.tracks?.body||[];
 if(!frames.length)return base;
 const [a,b,w]=findEnds(frames,c,t);
 for(const p of model.parts){
  const from=a.pose?.[p.id]||p.rotation,to=b.pose?.[p.id]||p.rotation;
  base[p.id]=[0,1,2].map(i=>from[i]+(to[i]-from[i])*w);
 }
 return base;
}
function face(model,c,t){
 const items=c.tracks?.face||[];
 const defaultFace=model.face?.expression||'neutral';
 if(!items.length)return C.expressionValues(defaultFace);
 const [a,b,w]=findEnds(items,c,t);
 const from=C.expressionValues(a.expression||defaultFace),to=C.expressionValues(b.expression||defaultFace);
 return Object.fromEntries(Object.keys(from).map(k=>[k,from[k]+(to[k]-from[k])*w]));
}
function objects(model,c,t){
 const items=c.tracks?.objects||[],result={};
 if(!items.length)return result;
 const [a,b,w]=findEnds(items,c,t);
 for(const p of model.parts){
  const ta=a.transforms?.[p.id],tb=b.transforms?.[p.id];
  if(!ta&&!tb)continue;
  const out={};
  for(const key of ['position','offset','size']){
   const f=ta?.[key]||p[key],z=tb?.[key]||p[key];
   out[key]=[0,1,2].map(i=>f[i]+(z[i]-f[i])*w);
  }
  result[p.id]=out;
 }
 return result;
}
function getChannel(model,c,t,channel){
 if(channel==='body')return {pose:body(model,c,t)};
 if(channel==='face'){
  const frames=c.tracks?.face||[];
  if(!frames.length)return {expression:model.face?.expression||'neutral'};
  const [a,b,w]=findEnds(frames,c,t);
  return {expression:w<.5?(a.expression||'neutral'):(b.expression||'neutral')};
 }
 return {transforms:objects(model,c,t)};
}
function capture(model,c,channel,t,data){
 if(!groups.includes(channel))throw Error('Trilha inválida');
 ensure(c);
 const frames=c.tracks[channel],time=normalizedTime(c,t),entry={time,...cp(data)};
 const idx=frames.findIndex(x=>Math.abs(x.time-time)<.0005);
 if(idx>=0)frames[idx]=entry;
 else{
  if(frames.length>=MAX)throw Error('Máximo de '+MAX+' frames por trilha');
  frames.push(entry);frames.sort((a,b)=>a.time-b.time);
 }
 return entry;
}
function erase(c,channel,t){
 const frames=ensure(c)[channel],idx=frames.findIndex(f=>Math.abs(f.time-t)<.004);
 if(idx<0)return false;
 frames.splice(idx,1);return true;
}
function move(c,channel,from,to){
 const frames=ensure(c)[channel],idx=frames.findIndex(f=>Math.abs(f.time-from)<.004);
 if(idx<0)return false;
 const next=normalizedTime(c,to);
 if(frames.some((f,i)=>i!==idx&&Math.abs(f.time-next)<.005))return false;
 frames[idx].time=next;frames.sort((a,b)=>a.time-b.time);return true;
}
C.validate=function(input){
 const checked=previous.validate(input);
 for(let i=0;i<checked.animations.length;i++){
  const source=input.animations?.[i];
  if(source?.tracks)checked.animations[i].tracks=sanitize(checked,checked.animations[i],source.tracks);
 }
 return checked;
};
C.getPose=function(model,id,time=0){
 const c=getClip(model,id);
 return c?.tracks?body(model,c,time):previous.getPose(model,id,time);
};
C.getTransforms=function(model,id,time=0){
 const c=getClip(model,id);
 return c?.tracks?objects(model,c,time):previous.getTransforms(model,id,time);
};
C.getFaceAt=function(model,id,time=0,override=null){
 const c=getClip(model,id);
 if(override||!c?.tracks)return previous.getFaceAt(model,id,time,override);
 return face(model,c,time);
};
C.expand=function(model,root,animation='',time=0,poseOverride=null,faceOverride=null,partOverride=null){
 const c=getClip(model,animation);
 if(!c?.tracks)return previous.expand(model,root,animation,time,poseOverride,faceOverride,partOverride);
 const pose=poseOverride||body(model,c,time),faceArg=faceOverride||{values:face(model,c,time)};
 let mapped=partOverride&&Object.keys(partOverride).length?partOverride:objects(model,c,time);
 // O renderer legado usa frames unificados se o mapa estiver vazio.
 // Preenche a transformação-base para impedir que keyframes antigos reapareçam.
 if(!Object.keys(mapped).length)mapped=Object.fromEntries(model.parts.map(p=>[p.id,{position:[...p.position],offset:[...p.offset],size:[...p.size]}]));
 return previous.expand(model,root,animation,time,pose,faceArg,mapped);
};
C.AurenixTracks={groups,ensure,initial,capture,erase,move,normalizedTime,getChannel,sampleBody:body,sampleFace:face,sampleObjects:objects,sanitize};
})(window);
