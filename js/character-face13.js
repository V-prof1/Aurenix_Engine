/* Aurenix Face & Props 0.13 — expresões de peças, sem texturas ou GPU especial.
 * Estende o formato .aurenix3d v1 sem quebrar modelos já salvos. */
(function(global){
'use strict';
const C=global.AurenixCharacters;
if(!C)throw Error('Carregue character3d.js antes de character-face13.js');
const EXPRESSIONS=[
 ['neutral','😐 Neutro'],['happy','😄 Feliz'],['sad','😢 Triste'],
 ['angry','😠 Raiva'],['surprised','😮 Surpreso'],['scared','😨 Medo'],
 ['sleepy','😴 Sonolento'],['blink','😑 Piscar'],['wink','😉 Piscadela'],
 ['suspicious','🤨 Desconfiado'],['talk','🗣️ Falando']
];
const IDS=new Set(EXPRESSIONS.map(x=>x[0]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0)),cp=C.copy;
const oldPreset=C.preset,oldValidate=C.validate,oldClip=C.newClip,oldCapture=C.capture,oldExpand=C.expand;
const roles={
 'olho esquerdo':'eyeL','olho direito':'eyeR','pupila esquerda':'pupilL','pupila direita':'pupilR',
 'sobrancelha esquerda':'browL','sobrancelha direita':'browR',
 'boca':'mouth','canto sorriso esquerdo':'cornerL','canto sorriso direito':'cornerR',
 'bochecha esquerda':'cheekL','bochecha direita':'cheekR'
};
function role(part){
 if(!part)return '';
 if(typeof part.faceRole==='string'&&/^(eye|pupil|brow|corner|cheek)[LR]$|^mouth$/.test(part.faceRole))return part.faceRole;
 return roles[String(part.name||'').toLowerCase().trim()]||'';
}
function faceDoc(doc){return {expression:IDS.has(doc?.face?.expression)?doc.face.expression:'neutral',intensity:clamp(doc?.face?.intensity??1,0,1)};}
function addFaceParts(doc){
 const head=doc.parts.find(x=>/cabeça|head/i.test(x.name));
 if(!head||doc.parts.length>72)return doc;
 const add=(name,pos,size,color,rotation=[0,0,0])=>{
  if(doc.parts.some(p=>p.name.toLowerCase()===name.toLowerCase()))return;
  const p=C.part(name,'cube',head.id,pos,[0,0,0],size,color,rotation);
  p.faceRole=roles[name.toLowerCase()]||'';
  doc.parts.push(p);
 };
 add('Sobrancelha esquerda',[-.19,.50,.375],[.27,.055,.075],'#2e3853');
 add('Sobrancelha direita',[.19,.50,.375],[.27,.055,.075],'#2e3853');
 // Os cantos de sorriso ficam minúsculos em repouso e aparecem só ao sorrir.
 add('Canto sorriso esquerdo',[-.18,.115,.398],[.04,.04,.035],'#65444f');
 add('Canto sorriso direito',[.18,.115,.398],[.04,.04,.035],'#65444f');
 add('Bochecha esquerda',[-.29,.19,.352],[.035,.035,.035],'#ec90a8');
 add('Bochecha direita',[.29,.19,.352],[.035,.035,.035],'#ec90a8');
 for(const p of doc.parts){const r=role(p);if(r)p.faceRole=r;}
 return doc;
}
function propPreset(kind){
 const world={format:C.FORMAT,createdAt:new Date().toISOString(),parts:[],animations:[],face:{expression:'neutral',intensity:1}};
 const p=(name,type,parent,pos,offset,size,color,rotation=[0,0,0])=>{
  const part=C.part(name,type,parent?.id||null,pos,offset,size,color,rotation);
  world.parts.push(part);return part;
 };
 if(kind==='crate'){
  world.name='Caixote de madeira';
  const box=p('Caixa','cube',null,[0,1,0],[0,0,0],[1.5,1.5,1.5],'#ad8056');
  for(const x of [-.72,.72])p('Reforço de madeira','cube',box,[x,0,.76],[0,0,0],[.12,1.45,.1],'#624c3c');
  for(const y of [-.72,.72])p('Tábua da frente','cube',box,[0,y,.76],[0,0,0],[1.43,.11,.1],'#624c3c');
  p('Selo','cube',box,[0,0,.79],[0,0,0],[.28,.28,.07],'#d3b485');
 }else if(kind==='tree'){
  world.name='Árvore low-poly';const trunk=p('Tronco','cylinder',null,[0,1.1,0],[0,0,0],[.65,2.2,.65],'#79523e');
  const crown=p('Copa','cube',trunk,[0,1.6,0],[0,.4,0],[2.3,1.55,2.1],'#428a64');
  for(const [x,z] of [[-.8,0],[.8,0],[0,-.7]])p('Folhagem','cube',crown,[x,.2,z],[0,0,0],[1.15,1.25,1.25],'#60aa71');
 }else if(kind==='lamp'){
  world.name='Poste de luz';const post=p('Poste','cylinder',null,[0,1.6,0],[0,0,0],[.22,3.2,.22],'#536b86');
  p('Base','cube',post,[0,-1.5,0],[0,0,0],[.75,.2,.75],'#34495d');
  p('Suporte da lâmpada','cube',post,[.45,1.43,0],[0,0,0],[1,.15,.35],'#3d506c');
  p('Lâmpada','cube',post,[.85,1.21,0],[0,0,0],[.45,.24,.35],'#fff0a5');
 }else if(kind==='door'){
  world.name='Porta com dobradiça';const post=p('Batente','cube',null,[0,1.4,0],[0,0,0],[1.6,2.8,.18],'#574b48');
  const door=p('Folha da porta','cube',post,[-.65,0,.15],[.65,0,0],[1.25,2.55,.11],'#976b4e');
  p('Maçaneta','sphere',door,[1.13,0,.12],[0,0,0],[.13,.13,.13],'#dec783');
  const c=C.newClip(world,'Abrir porta');c.loop=false;c.duration=1;
  c.frames=[{time:0,pose:Object.fromEntries(world.parts.map(x=>[x.id,[...x.rotation]])),expression:'neutral'},
   {time:1,pose:Object.fromEntries(world.parts.map(x=>[x.id,x.id===door.id?[0,85,0]:[...x.rotation]])),expression:'neutral'}];
 }else if(kind==='chair'){
  world.name='Cadeira quadradinha';const seat=p('Assento','cube',null,[0,1.0,0],[0,0,0],[1.5,.20,1.25],'#a77b55');
  p('Encosto','cube',seat,[0,.65,-.56],[0,0,0],[1.50,1.3,.18],'#815d47');
  for(const x of [-.59,.59])for(const z of [-.45,.45])p('Pé de cadeira','cube',seat,[x,-.57,z],[0,0,0],[.22,1.10,.22],'#654c3c');
 }else throw Error('Modelo de cenário desconhecido: '+kind);
 return world;
}
C.preset=function(kind){
 if(['crate','tree','lamp','door','chair'].includes(kind))return propPreset(kind);
 const m=oldPreset(kind);m.face={expression:'neutral',intensity:1};return addFaceParts(m);
};
C.validate=function(input){
 const checked=oldValidate(input);
 checked.face=faceDoc(input);
 const originals=new Map((input.parts||[]).map(p=>[p.id,p]));
 for(const p of checked.parts){
  const origin=originals.get(p.id),r=role(origin||p);if(r)p.faceRole=r;
 }
 for(let i=0;i<checked.animations.length;i++){
  const frames=checked.animations[i].frames,original=input.animations?.[i]?.frames||[];
  for(let k=0;k<frames.length;k++){
   // Validation sorts frames. Use nearest timestamp rather than trusting input order.
   const match=original.find(f=>Math.abs(Number(f.time)-frames[k].time)<.00001);
   frames[k].expression=IDS.has(match?.expression)?match.expression:checked.face.expression;
  }
 }
 return checked;
};
C.newClip=function(model,name){
 const c=oldClip(model,name),expression=faceDoc(model).expression;
 for(const frame of c.frames)frame.expression=expression;
 return c;
};
C.capture=function(model,clip,t,poseOverride=null,faceOverride=null){
 oldCapture(model,clip,t,poseOverride);
 const time=clamp(t,0,clip.duration),frame=clip.frames.find(f=>Math.abs(f.time-time)<.0001);
 if(frame)frame.expression=IDS.has(faceOverride)?faceOverride:faceDoc(model).expression;
};
function faceAt(model,clipId='',time=0,override=null){
 if(override&&typeof override==='object'&&override.values)return override.values;
 if(IDS.has(override))return expressionValues(override);
 const base=faceDoc(model),clip=(model.animations||[]).find(c=>c.id===clipId||c.name===clipId);
 if(!clip?.frames?.length)return expressionValues(base.expression);
 const duration=clamp(clip.duration||1,.1,120),t=clip.loop?((time%duration)+duration)%duration:clamp(time,0,duration);
 const frames=clip.frames;
 let a=frames[0],b=frames[frames.length-1];
 if(t<=a.time)b=a;else if(t>=b.time)a=b;
 else for(let i=1;i<frames.length;i++)if(frames[i].time>=t){a=frames[i-1];b=frames[i];break;}
 let ratio=a===b?0:clamp((t-a.time)/Math.max(.0001,b.time-a.time),0,1);
 if(clip.ease==='step')ratio=0;else if(clip.ease==='smooth')ratio=ratio*ratio*(3-2*ratio);
 const x=expressionValues(a.expression||base.expression),y=expressionValues(b.expression||base.expression);
 return Object.fromEntries(Object.keys(x).map(k=>[k,x[k]+(y[k]-x[k])*ratio]));
}
const expressionParams={
 neutral:   {eye:1,mouthW:1,mouthH:1,browY:0,browTilt:0,smile:0,cheek:0,pupilY:0,mouthTilt:0},
 happy:     {eye:.77,mouthW:1.52,mouthH:1.2,browY:.025,browTilt:-5,smile:1,cheek:1,pupilY:0,mouthTilt:0},
 sad:       {eye:.72,mouthW:.86,mouthH:1,browY:-.035,browTilt:16,smile:0,cheek:.15,pupilY:-.04,mouthTilt:180},
 angry:     {eye:.52,mouthW:1.10,mouthH:.82,browY:-.12,browTilt:-25,smile:0,cheek:0,pupilY:0,mouthTilt:0},
 surprised: {eye:1.3,mouthW:.63,mouthH:3.6,browY:.14,browTilt:0,smile:0,cheek:0,pupilY:0,mouthTilt:0},
 scared:    {eye:1.42,mouthW:.66,mouthH:3.1,browY:.10,browTilt:13,smile:0,cheek:0,pupilY:-.04,mouthTilt:0},
 sleepy:    {eye:.28,mouthW:.85,mouthH:1.1,browY:-.06,browTilt:4,smile:0,cheek:0,pupilY:-.02,mouthTilt:0},
 blink:     {eye:.045,mouthW:1,mouthH:1,browY:0,browTilt:0,smile:0,cheek:0,pupilY:0,mouthTilt:0},
 wink:      {eye:1,mouthW:1.38,mouthH:1,browY:.04,browTilt:0,smile:.85,cheek:.8,pupilY:0,mouthTilt:0},
 suspicious:{eye:.70,mouthW:.9,mouthH:1,browY:.04,browTilt:-15,smile:.1,cheek:0,pupilY:0,mouthTilt:0},
 talk:      {eye:1,mouthW:.8,mouthH:2.7,browY:0,browTilt:0,smile:.1,cheek:0,pupilY:0,mouthTilt:0}
};
function expressionValues(id){return expressionParams[IDS.has(id)?id:'neutral'];}
function modifyPart(p,face,model){
 const kind=role(p);if(!kind)return null;
 const intensity=faceDoc(model).intensity;
 const mix=(v,defaultValue=1)=>defaultValue+(v-defaultValue)*intensity;
 const visual={sx:1,sy:1,sz:1,dx:0,dy:0,dz:0,rz:0};
 if(kind==='mouth'){
  visual.sx=mix(face.mouthW);visual.sy=mix(face.mouthH);visual.rz=mix(face.mouthTilt,0);
 }else if(kind==='eyeL'||kind==='eyeR'||kind==='pupilL'||kind==='pupilR'){
  const side=kind.endsWith('L')?'L':'R',name=model.face?.expression||'';
  let eye=face.eye;
  if(name==='wink'||name==='suspicious')eye=side==='L'?Math.min(eye,.08):eye;
  visual.sy=mix(eye);
  if(kind.startsWith('pupil'))visual.dy=face.pupilY;
 }else if(kind==='browL'||kind==='browR'){
  const side=kind.endsWith('L')?1:-1;
  visual.dy=face.browY*intensity;visual.rz=side*face.browTilt*intensity;
 }else if(kind==='cornerL'||kind==='cornerR'){
  visual.sx=mix(1+face.smile*3);visual.sy=mix(1+face.smile*3);
  visual.dy=face.smile*.07*intensity;
  visual.rz=(kind==='cornerL'?-1:1)*face.smile*28*intensity;
 }else if(kind==='cheekL'||kind==='cheekR'){
  visual.sx=mix(1+face.cheek*3);visual.sy=mix(1+face.cheek*2);
 }
 return visual;
}
C.expand=function(model,root,animation='',time=0,poseOverride=null,faceOverride=null){
 const meshes=oldExpand(model,root,animation,time,poseOverride),face=faceAt(model,animation,time,faceOverride);
 const byId=new Map(model.parts.map(p=>[p.id,p]));
 for(const mesh of meshes){
  const part=byId.get(mesh._partId),v=modifyPart(part,face,model);
  if(!v)continue;
  // Character meshes use column-major local-to-world matrices.
  const local=C.mul(C.translate([v.dx/part.size[0],v.dy/part.size[1],v.dz/part.size[2]]),
    C.mul(C.rotate([0,0,v.rz]),C.scale([Math.max(.02,v.sx),Math.max(.02,v.sy),Math.max(.02,v.sz)])));
  mesh._modelMatrix=C.mul(mesh._modelMatrix,local);
  mesh.x=mesh._modelMatrix[12];mesh.y=mesh._modelMatrix[13];mesh.z=mesh._modelMatrix[14];
 }
 return meshes;
};
C.FACE_EXPRESSIONS=EXPRESSIONS;
C.expressionValues=expressionValues;
C.getFaceAt=faceAt;
C.ensureFace=addFaceParts;
})(window);
