/* Aurenix Character 3D v1 — no external libraries, mobile-safe articulated low-poly characters.
   Saved models contain only data. They never execute JavaScript. */
(function(global){
'use strict';
const FORMAT='aurenix-character-v1',TYPES=new Set(['cube','sphere','cylinder','cone','pyramid','torus','capsule']),MAX_PARTS=80,MAX_CLIPS=24;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const copy=x=>JSON.parse(JSON.stringify(x));
const uid=()=> 'bone'+Math.random().toString(36).slice(2,10);
const V=(values,def=[0,0,0],min=-500,max=500)=>[0,1,2].map(i=>clamp(values?.[i]??def[i],min,max));
const hex=x=>/^#[\da-fA-F]{6}$/.test(x||'')?x:'#78cadd';
const rad=v=>(Number(v)||0)*Math.PI/180;
function part(name,type,parent,pos,offset,size,color,rotation=[0,0,0]){
 return {id:uid(),name,type,parent,position:pos,offset,size,color,rotation};
}
function preset(kind='human'){
 const robot=kind==='robot',creature=kind==='creature';
 const skin=robot?'#8298b4':creature?'#83b68b':'#efbf9f';
 const outfit=robot?'#3c5f91':creature?'#466d4d':'#4f82bb';
 const legColor=robot?'#526f99':creature?'#555473':'#37445e';
 const hairColor=creature?'#3f765e':robot?'#384967':'#3d2f42';
 const torso=part('Tronco',robot?'cube':'capsule',null,[0,1.48,0],[0,0,0],[.82,1.05,.48],outfit);
 const head=part('Cabeça',robot?'cube':creature?'sphere':'capsule',torso.id,[0,.76,0],[0,.26,0],[.67,.67,.61],skin);
 const leftArm=part('Braço esquerdo','capsule',torso.id,[-.55,.38,0],[0,-.44,0],[.29,.87,.29],skin,[0,0,-9]);
 const rightArm=part('Braço direito','capsule',torso.id,[.55,.38,0],[0,-.44,0],[.29,.87,.29],skin,[0,0,9]);
 const leftLeg=part('Perna esquerda','capsule',torso.id,[-.23,-.55,0],[0,-.53,0],[.34,1.07,.35],legColor);
 const rightLeg=part('Perna direita','capsule',torso.id,[.23,-.55,0],[0,-.53,0],[.34,1.07,.35],legColor);
 const parts=[torso,head,leftArm,rightArm,leftLeg,rightLeg];
 parts.push(part('Olho esquerdo','cube',head.id,[-.18,.34,.335],[0,0,0],[.15,.14,.065],robot?'#6debd9':'#fff9ef'));
 parts.push(part('Olho direito','cube',head.id,[.18,.34,.335],[0,0,0],[.15,.14,.065],robot?'#6debd9':'#fff9ef'));
 if(!robot){
  parts.push(part('Pupila esquerda','cube',head.id,[-.18,.34,.381],[0,0,0],[.055,.085,.04],creature?'#242c40':'#3e648a'));
  parts.push(part('Pupila direita','cube',head.id,[.18,.34,.381],[0,0,0],[.055,.085,.04],creature?'#242c40':'#3e648a'));
 }
 parts.push(part('Boca','cube',head.id,[0,.13,.34],[0,0,0],[robot?.19:.23,.055,.05],robot?'#70d8bf':'#795457'));
 parts.push(part('Cinto','cube',torso.id,[0,-.52,.01],[0,0,0],[.8,.17,.55],robot?'#27364e':'#353746'));
 parts.push(part('Placa de peito','cube',torso.id,[0,.10,.28],[0,0,0],[.56,.45,.09],robot?'#65c9d1':creature?'#86a875':'#608fc4'));
 for(const [side,arm,leg] of [['esquerda',leftArm,leftLeg],['direita',rightArm,rightLeg]]){
  parts.push(part('Luva '+side,'cube',arm.id,[0,-.84,0],[0,0,0],[.3,.22,.33],robot?'#9cb2cd':creature?'#638b7d':'#2d435a'));
  parts.push(part('Bota '+side,'cube',leg.id,[0,-1.04,.14],[0,0,0],[.38,.22,.60],robot?'#4c5f78':creature?'#424764':'#253349'));
 }
 if(robot){
  parts.push(part('Antena','cylinder',head.id,[0,.67,0],[0,.1,0],[.08,.36,.08],'#9fc2ce'));
  parts.push(part('Luz da antena','sphere',head.id,[0,.93,0],[0,0,0],[.18,.18,.18],'#79ead5'));
 }else if(creature){
  parts.push(part('Chifre esquerdo','cone',head.id,[-.23,.55,0],[0,.15,0],[.24,.43,.24],hairColor));
  parts.push(part('Chifre direito','cone',head.id,[.23,.55,0],[0,.15,0],[.24,.43,.24],hairColor));
  parts.push(part('Cauda','capsule',torso.id,[0,-.52,-.3],[0,-.25,-.13],[.22,.65,.24],skin,[45,0,0]));
 }else{
  parts.push(part('Cabelo','cube',head.id,[0,.61,-.01],[0,0,0],[.72,.20,.63],hairColor));
  parts.push(part('Franja esquerda','cube',head.id,[-.22,.53,.25],[0,0,0],[.29,.26,.18],hairColor,[0,0,-18]));
  parts.push(part('Franja direita','cube',head.id,[.23,.53,.24],[0,0,0],[.27,.22,.18],hairColor,[0,0,14]));
 }
 return {format:FORMAT,name:robot?'Robô futurista':creature?'Criatura fantástica':'Herói low-poly',parts,animations:[],createdAt:new Date().toISOString()};
}
function validate(input){
 if(!input||typeof input!=='object'||input.format!==FORMAT)throw Error('Arquivo não é um personagem Aurenix compatível');
 if(!Array.isArray(input.parts)||input.parts.length<1||input.parts.length>MAX_PARTS)throw Error('Personagem deve ter de 1 a 80 peças');
 if(!Array.isArray(input.animations)||input.animations.length>MAX_CLIPS)throw Error('Limite de 24 animações');
 const doc={format:FORMAT,name:String(input.name||'Personagem').slice(0,72),parts:[],animations:[],createdAt:input.createdAt||new Date().toISOString()};
 const ids=new Set();
 for(const item of input.parts){
  if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))throw Error('Peça com ID inválido ou repetido');
  ids.add(item.id);
  doc.parts.push({id:item.id.slice(0,72),name:String(item.name||'Peça').slice(0,60),type:TYPES.has(item.type)?item.type:'cube',parent:typeof item.parent==='string'?item.parent:null,
   position:V(item.position),offset:V(item.offset),size:V(item.size,[1,1,1],.02,30),rotation:V(item.rotation,[0,0,0],-1440,1440),color:hex(item.color)});
 }
 const map=new Map(doc.parts.map(p=>[p.id,p]));
 for(const p of doc.parts){
  if(p.parent&&!map.has(p.parent))throw Error('Uma peça tem pai inexistente');
  let current=p,depth=0;
  while(current.parent){current=map.get(current.parent);if(++depth>MAX_PARTS)throw Error('Hierarquia de peças contém ciclo');}
 }
 for(const a of input.animations){
  if(!a||!Array.isArray(a.frames)||a.frames.length>100)throw Error('Animação inválida (máximo 100 poses)');
  const duration=clamp(a.duration||1,.1,120),frames=a.frames.map(f=>{
   const pose={};for(const [id,angles] of Object.entries(f.pose||{})){
    if(ids.has(id))pose[id]=V(angles,[0,0,0],-1440,1440);
   }
   return {time:clamp(f.time,0,duration),pose};
  }).sort((x,y)=>x.time-y.time);
  doc.animations.push({id:String(a.id||uid()).slice(0,72),name:String(a.name||'Animação').slice(0,50),
   duration,loop:a.loop!==false,speed:clamp(a.speed||1,.1,4),ease:['linear','smooth','step'].includes(a.ease)?a.ease:'smooth',frames});
 }
 return doc;
}
function getPose(model,clipId,time=0){
 const base=Object.fromEntries(model.parts.map(p=>[p.id,[...p.rotation]]));
 const clip=model.animations.find(c=>c.id===clipId||c.name===clipId);
 if(!clip||!clip.frames.length)return base;
 const duration=clamp(clip.duration||1,.1,120);
 let t=clip.loop?((time%duration)+duration)%duration:clamp(time,0,duration);
 let a=clip.frames[0],b=clip.frames[clip.frames.length-1];
 if(t<=a.time)b=a;
 else if(t>=b.time)a=b;
 else for(let i=1;i<clip.frames.length;i++)if(clip.frames[i].time>=t){a=clip.frames[i-1];b=clip.frames[i];break;}
 let ratio=a===b?0:clamp((t-a.time)/Math.max(.0001,b.time-a.time),0,1);
 if(clip.ease==='smooth')ratio=ratio*ratio*(3-2*ratio);else if(clip.ease==='step')ratio=ratio<1?0:1;
 for(const p of model.parts){
  const q=base[p.id],qa=a.pose?.[p.id]||q,qb=b.pose?.[p.id]||q;
  base[p.id]=[0,1,2].map(i=>qa[i]+(qb[i]-qa[i])*ratio);
 }
 return base;
}
function identity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function mul(a,b){const m=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)m[c*4+r]+=a[k*4+r]*b[c*4+k];return m;}
function translate(v){const m=identity();m[12]=v[0];m[13]=v[1];m[14]=v[2];return m;}
function scale(v){const m=identity();m[0]=v[0];m[5]=v[1];m[10]=v[2];return m;}
function rotate(a){
 const [x,y,z]=a.map(rad),cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
 const mx=[1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1],my=[cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1],mz=[cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1];
 return mul(mul(my,mx),mz);
}
function transformPoint(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
function expand(model,root={x:0,y:0,z:0,ry:0,rx:0,rz:0,modelScale:1},animation='',time=0,poseOverride=null){
 const pose=poseOverride||getPose(model,animation,time),byId=new Map(model.parts.map(p=>[p.id,p])),matrices=new Map(),result=[];
 const rootMatrix=mul(translate([root.x||0,root.y||0,root.z||0]),mul(rotate([root.rx||0,root.ry||0,root.rz||0]),scale([clamp(root.modelScale??1,.01,40),clamp(root.modelScale??1,.01,40),clamp(root.modelScale??1,.01,40)])));
 function calc(p){
  if(matrices.has(p.id))return matrices.get(p.id);
  const parent=p.parent?calc(byId.get(p.parent)):rootMatrix;
  const joint=mul(parent,mul(translate(p.position),rotate(pose[p.id]||p.rotation)));
  matrices.set(p.id,joint);return joint;
 }
 for(const p of model.parts){
  const matrix=mul(calc(p),mul(translate(p.offset),scale(p.size)));
  result.push({id:(root.id||'preview')+'::'+p.id,_parentId:root.id||'preview',_partId:p.id,type:p.type,visible:root.visible!==false,color:p.color,
   x:matrix[12],y:matrix[13],z:matrix[14],w:p.size[0],h:p.size[1],d:p.size[2],_modelMatrix:matrix,
   name:p.name});
 }
 return result;
}
function newClip(model,name='Nova animação'){
 if(model.animations.length>=MAX_CLIPS)throw Error('Máximo de 24 animações');
 const pose=Object.fromEntries(model.parts.map(p=>[p.id,[...p.rotation]]));
 const c={id:uid(),name:String(name).slice(0,50),duration:1,loop:true,speed:1,ease:'smooth',frames:[{time:0,pose:copy(pose)},{time:1,pose:copy(pose)}]};
 model.animations.push(c);return c;
}
function capture(model,clip,t,poseOverride=null){
 const pose=poseOverride?copy(poseOverride):Object.fromEntries(model.parts.map(p=>[p.id,[...p.rotation]]));
 const time=clamp(t,0,clip.duration);
 const same=clip.frames.find(f=>Math.abs(f.time-time)<.0001);
 if(same)same.pose=pose;
 else{if(clip.frames.length>=100)throw Error('Limite de 100 keyframes');clip.frames.push({time,pose});clip.frames.sort((a,b)=>a.time-b.time);}
}
function library(){
 const dbName='aurenix-character-library-v1';
 const open=()=>new Promise((resolve,reject)=>{
  if(!global.indexedDB){reject(Error('Armazenamento local indisponível'));return;}
  const req=global.indexedDB.open(dbName,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('characters'))req.result.createObjectStore('characters',{keyPath:'id'});};
  req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);
 });
 const tx=async(mode,callback)=>{const db=await open();try{return await new Promise((res,rej)=>{const t=db.transaction('characters',mode),store=t.objectStore('characters'),req=callback(store);req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});}finally{db.close();}};
 return {save:async(model,id=uid())=>{const checked=global.AurenixCharacters.validate(model);await tx('readwrite',store=>store.put({id,model:checked,name:checked.name,updated:Date.now()}));return id;},
  list:()=>tx('readonly',store=>store.getAll()),load:id=>tx('readonly',store=>store.get(id)),remove:id=>tx('readwrite',store=>store.delete(id))};
}
global.AurenixCharacters={FORMAT,MAX_PARTS,preset,validate,expand,getPose,newClip,capture,part,copy,uid,mul,translate,rotate,scale,transformPoint,library};
})(window);
