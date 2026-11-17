/* Aurenix 0.16 — bloqueio bilateral de membros equivalentes.
 * Permite olhos+olhos, braços+braços, luvas+luvas; recusa tipos misturados.
 */
(function(global){
'use strict';
const C=global.AurenixCharacters;
if(!C)throw Error('AurenixCharacters obrigatório');
const oldValidate=C.validate;
const fold=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[_\-]+/g,' ').replace(/\s+/g,' ').trim();
const cp=C.copy;
const FACE={eye:'olho',pupil:'pupila',brow:'sobrancelha',corner:'canto sorriso',cheek:'bochecha'};
function signature(part){
 if(!part)return null;
 const role=String(part.faceRole||'').match(/^(eye|pupil|brow|corner|cheek)([LR])$/);
 if(role)return {kind:FACE[role[1]],side:role[2]==='L'?'left':'right'};
 let name=fold(part.name),side=null;
 if(/\b(esquerd[oa]|left)\b/.test(name)){side='left';name=name.replace(/\b(esquerd[oa]|left)\b/g,'');}
 else if(/\b(direit[oa]|right)\b/.test(name)){side='right';name=name.replace(/\b(direit[oa]|right)\b/g,'');}
 if(!side)return null;
 const kind=name.trim().replace(/\s+/g,' ');
 if(!kind)return null;
 return {kind,side};
}
function compatible(model,a,b){
 if(!a||!b||a.id===b.id)return false;
 const x=signature(a),y=signature(b);
 if(!x||!y||x.kind!==y.kind||x.side===y.side)return false;
 if(a.parent===b.parent)return true; // Ex.: ambos os olhos estão na Cabeça.
 const map=new Map(model.parts.map(p=>[p.id,p]));
 const pa=map.get(a.parent),pb=map.get(b.parent);
 const sx=signature(pa),sy=signature(pb);
 return !!(sx&&sy&&sx.kind===sy.kind&&sx.side!==sy.side);
}
function locks(model){return Array.isArray(model.mirrorLocks)?model.mirrorLocks:[];}
function partner(model,id){
 const pair=locks(model).find(x=>x.a===id||x.b===id);
 return pair?model.parts.find(p=>p.id===(pair.a===id?pair.b:pair.a))||null:null;
}
function clean(model){
 const map=new Map(model.parts.map(p=>[p.id,p])),seen=new Set();
 model.mirrorLocks=locks(model).filter(pair=>{
  if(!pair||seen.has(pair.a)||seen.has(pair.b)||!compatible(model,map.get(pair.a),map.get(pair.b)))return false;
  seen.add(pair.a);seen.add(pair.b);return true;
 }).map(x=>({a:x.a,b:x.b}));
 return model.mirrorLocks;
}
function link(model,a,b){
 const p=model.parts.find(x=>x.id===a),q=model.parts.find(x=>x.id===b);
 if(!compatible(model,p,q))throw Error('Selecione duas peças correspondentes da mesma família (ex.: olho esquerdo + olho direito).');
 clean(model);
 model.mirrorLocks=model.mirrorLocks.filter(x=>![a,b].some(id=>x.a===id||x.b===id));
 model.mirrorLocks.push({a,b});return q;
}
function unlink(model,id){
 const length=locks(model).length;
 model.mirrorLocks=locks(model).filter(x=>x.a!==id&&x.b!==id);
 return length!==model.mirrorLocks.length;
}
function snapshot(part,display){
 return {position:[...(display?.position||part.position)],offset:[...(display?.offset||part.offset)],size:[...(display?.size||part.size)],rotation:[...(display?.rotation||part.rotation)],color:part.color,type:part.type};
}
function mirror(model,id,before,after,{clip=false,pose=null,transforms=null}={}){
 const target=partner(model,id);if(!target||!before||!after)return false;
 let any=false;
 for(const field of ['position','offset','size','rotation']){
  const prior=before[field],next=after[field];if(!Array.isArray(prior)||!Array.isArray(next))continue;
  let dest;
  if(field==='rotation'&&clip){
   if(!pose)throw Error('Dados da pose não disponíveis');
   dest=pose[target.id]??=[...target.rotation];
  }else if(clip){
   if(!transforms)throw Error('Dados da transformação não disponíveis');
   transforms[target.id]??={position:[...target.position],offset:[...target.offset],size:[...target.size]};
   dest=transforms[target.id][field]??=[...target[field]];
  }else dest=target[field];
  for(let axis=0;axis<3;axis++){
   const delta=Number(next[axis])-Number(prior[axis]);
   if(!Number.isFinite(delta)||Math.abs(delta)<1e-9)continue;
   const reflected=(field==='rotation'?(axis===0?1:-1):(field==='position'||field==='offset')&&axis===0?-1:1)*delta;
   const nextVal=Number(dest[axis])+reflected;
   dest[axis]=field==='size'?Math.max(.02,Math.min(30,nextVal)):field==='rotation'?Math.max(-1440,Math.min(1440,nextVal)):Math.max(-500,Math.min(500,nextVal));
   any=true;
  }
 }
 if(before.color!==after.color){target.color=after.color;any=true;}
 if(before.type!==after.type){target.type=after.type;any=true;}
 return any;
}
C.validate=function(input){
 const checked=oldValidate(input);
 checked.mirrorLocks=cp(input.mirrorLocks||[]);
 clean(checked);return checked;
};
C.AurenixSymmetry={signature,compatible,partner,locks,clean,link,unlink,snapshot,mirror};
})(window);
