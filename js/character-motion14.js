/* Aurenix Studio 0.14 — unified 3D part-transform tracks.
 * Extends .aurenix3d v1. Old projects remain readable unchanged.
 * Transform frames support position, visual offset and scale alongside body pose and facial expression.
 */
(function(global){
'use strict';
const C=global.AurenixCharacters;
if(!C)throw Error('character3d.js is required');
const oldValidate=C.validate,oldExpand=C.expand,oldCapture=C.capture;
const copy=C.copy,clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const V=(a,def,min,max)=>[0,1,2].map(i=>clamp(a?.[i]??def[i],min,max));
const T_KEYS=['position','offset','size'];
function sanitize(model,raw){
 const parts=new Map(model.parts.map(x=>[x.id,x])),result={};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return result;
 for(const [id,data] of Object.entries(raw).slice(0,C.MAX_PARTS)){
  const p=parts.get(id);if(!p||!data||typeof data!=='object')continue;
  const t={};
  if(Array.isArray(data.position))t.position=V(data.position,p.position,-500,500);
  if(Array.isArray(data.offset))t.offset=V(data.offset,p.offset,-500,500);
  if(Array.isArray(data.size))t.size=V(data.size,p.size,.02,30);
  if(Object.keys(t).length)result[id]=t;
 }
 return result;
}
function validated(input){
 const doc=oldValidate(input);
 for(let i=0;i<doc.animations.length;i++){
  const clip=doc.animations[i],source=input.animations[i];
  for(const frame of clip.frames){
   const original=source.frames?.find(f=>Math.abs(Number(f.time)-frame.time)<.00001);
   frame.transforms=sanitize(doc,original?.transforms);
  }
 }
 return doc;
}
function sample(model,clipId,time=0){
 const clip=model.animations.find(c=>c.id===clipId||c.name===clipId);
 const result={};
 if(!clip?.frames?.length)return result;
 const duration=clamp(clip.duration||1,.1,120),t=clip.loop?((time%duration)+duration)%duration:clamp(time,0,duration);
 let a=clip.frames[0],b=clip.frames[clip.frames.length-1];
 if(t<=a.time)b=a;else if(t>=b.time)a=b;
 else for(let i=1;i<clip.frames.length;i++)if(clip.frames[i].time>=t){a=clip.frames[i-1];b=clip.frames[i];break;}
 let w=a===b?0:clamp((t-a.time)/Math.max(.0001,b.time-a.time),0,1);
 if(clip.ease==='smooth')w=w*w*(3-2*w);
 else if(clip.ease==='step')w=0;
 for(const p of model.parts){
  const from=a.transforms?.[p.id],to=b.transforms?.[p.id];
  if(!from&&!to)continue;
  const out={};
  for(const key of T_KEYS){
   const x=from?.[key]||p[key],y=to?.[key]||p[key];
   out[key]=[0,1,2].map(i=>x[i]+(y[i]-x[i])*w);
  }
  result[p.id]=out;
 }
 return result;
}
function mergedPart(part,transform){
 const result={...part};
 for(const key of T_KEYS)if(transform?.[key])result[key]=V(transform[key],part[key],key==='size'?.02:-500,key==='size'?30:500);
 return result;
}
function expand(model,root,animation='',time=0,poseOverride=null,faceOverride=null,partOverride=null){
 const overrides=partOverride&&Object.keys(partOverride).length?partOverride:sample(model,animation,time);
 if(!Object.keys(overrides).length){
  const meshes=oldExpand(model,root,animation,time,poseOverride,faceOverride);
  const byId=new Map(model.parts.map(p=>[p.id,p.faceRole||'']));
  for(const mesh of meshes)mesh._faceRole=byId.get(mesh._partId)||'';
  return meshes;
 }
 const parts=model.parts.map(part=>overrides[part.id]?mergedPart(part,overrides[part.id]):part);
 const meshes=oldExpand({...model,parts},root,animation,time,poseOverride,faceOverride);
 const byId=new Map(model.parts.map(p=>[p.id,p.faceRole||'']));
 for(const mesh of meshes)mesh._faceRole=byId.get(mesh._partId)||'';
 return meshes;
}
function capture(model,clip,t,poseOverride=null,faceOverride=null,transformsOverride=null){
 oldCapture(model,clip,t,poseOverride,faceOverride);
 const time=clamp(t,0,clip.duration);
 const frame=clip.frames.find(f=>Math.abs(f.time-time)<.0001);
 if(frame)frame.transforms=sanitize(model,transformsOverride||sample(model,clip.id,time));
}
function partTransform(model,id,clipId,time=0,override=null){
 const part=model.parts.find(x=>x.id===id);
 if(!part)return null;
 const frame=override||sample(model,clipId,time);
 return mergedPart(part,frame[id]);
}
C.validate=validated;
C.expand=expand;
C.capture=capture;
C.getTransforms=sample;
C.getPartTransform=partTransform;
C.sanitizeTransforms=sanitize;
C.TRANSFORM_TRACKS=T_KEYS;
})(window);
