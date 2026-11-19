/* Aurenix 0.19 — malhas GLTF multi-skin, UV, materiais locais e retargeting.
 * Somente Web APIs gratuitas, sem CDNs ou servidores; compatibilidade com rig18.
 */
(function(global){'use strict';
const R=global.AurenixGLTFRig18,I=global.AurenixImport17;
if(!R||!I)throw Error('Carregue import17.js e gltf18-rig.js primeiro');
const LIMIT={nodes:256,vertices:12000,triangles:24000,joints:96,images:16,imageBytes:5*1024*1024,bytes:12*1024*1024};
const clipName=s=>String(s||'').slice(0,70);
const vec=(v,otherwise)=>Array.isArray(v)?v:otherwise;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,Number(x)||0));
const dataUrl=(data,mime)=>global.AurenixZip?.asDataURL?global.AurenixZip.asDataURL(data,mime):'data:'+mime+';base64,'+btoa(String.fromCharCode(...data));
function getImageBytes(image,json,buffers,files={},base=''){
 if(image.bufferView!==undefined){
  const v=json.bufferViews?.[image.bufferView],b=v&&buffers[v.buffer];if(!b)throw Error('Imagem GLTF com bufferView inválida');
  return b.slice(v.byteOffset||0,(v.byteOffset||0)+(v.byteLength||0));
 }
 const uri=image.uri||'';
 if(uri.startsWith('data:')){
  const body=uri.split(',')[1]||'';
  if(/;base64/i.test(uri.slice(0,uri.indexOf(',')))){
   const raw=atob(body);return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }return new TextEncoder().encode(decodeURIComponent(body));
 }
 if(/^(https?:|file:|blob:|\/)/i.test(uri)||uri.includes('..')||!uri)throw Error('Texturas externas devem estar no ZIP local');
 const name=decodeURIComponent(uri).replace(/^\.\//,'');
 return files[base+name]||files[name]||files[I.fileName(name)]||null;
}
function images(json,buffers,files={},base=''){
 let total=0;
 return (json.images||[]).slice(0,LIMIT.images).map(image=>{
  let mime=String(image.mimeType||(/\.jpe?g(?:$|\?)/i.test(image.uri||'')?'image/jpeg':/\.webp$/i.test(image.uri||'')?'image/webp':'image/png')).toLowerCase();
  if(!['image/png','image/jpeg','image/webp'].includes(mime))return null;
  const raw=getImageBytes(image,json,buffers,files,base);
  if(!raw)throw Error('Textura ausente: '+String(image.uri||image.name||'imagem'));
  if(raw.length>LIMIT.imageBytes||(total+=raw.length)>LIMIT.bytes)throw Error('Textura(s) GLTF muito grandes: limite 5 MB por imagem / 12 MB total');
  return dataUrl(raw,mime);
 });
}
function materials(json){
 return (json.materials||[]).slice(0,100).map(m=>{
  const pbr=m.pbrMetallicRoughness||{},tex=pbr.baseColorTexture,entry=json.textures?.[tex?.index],base=vec(pbr.baseColorFactor,[1,1,1,1]);
  return {name:clipName(m.name||'Material'),color:base.map(x=>clamp(x,0,1)),image:entry?.source??null,
   alphaMode:['OPAQUE','MASK','BLEND'].includes(m.alphaMode)?m.alphaMode:'OPAQUE',alphaCutoff:clamp(m.alphaCutoff??.5,0,1),
   doubleSided:!!m.doubleSided,nearest:json.samplers?.[entry?.sampler]?.magFilter===9728};
 });
}
function bounds(rig){
 const matrices=R.globals(rig.nodes),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const part of rig.parts){
  const m=matrices[part.meshNode];
  for(const v of part.vertices){
   const xyz=[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]];
   for(let i=0;i<3;i++){min[i]=Math.min(min[i],xyz[i]);max[i]=Math.max(max[i],xyz[i]);}
  }
 }
 if(!Number.isFinite(min[0]))throw Error('GLTF sem malhas válidas');
 rig.center=min.map((v,i)=>(v+max[i])/2);
 rig.scale=1/Math.max(.00001,...max.map((v,i)=>v-min[i]));
}
function build(json,buffers,Importer=I){
 if(!json?.nodes?.length||json.nodes.length>LIMIT.nodes)return null;
 const accessor=id=>Importer.accessor(json,buffers,id),parents=new Array(json.nodes.length).fill(-1);
 for(let i=0;i<json.nodes.length;i++)for(const child of json.nodes[i].children||[]){
  if(child<0||child>=json.nodes.length||parents[child]!==-1)return null;
  parents[child]=i;
 }
 const nodes=json.nodes.map((n,i)=>({name:clipName(n.name||'Osso '+i),parent:parents[i],
  translation:vec(n.translation,[0,0,0]),rotation:vec(n.rotation,[0,0,0,1]),scale:vec(n.scale,[1,1,1]),matrix:n.matrix||null}));
 const parts=[],skins=(json.skins||[]).map(s=>{
  if(!s.joints?.length||s.joints.length>LIMIT.joints)return null;
  const ibm=s.inverseBindMatrices!==undefined?accessor(s.inverseBindMatrices):s.joints.map(()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  if(ibm.length!==s.joints.length||ibm.some(m=>m.length!==16))return null;
  return {name:clipName(s.name||'Esqueleto'),joints:s.joints, inverseBind:ibm};
 });
 let vertexCount=0,triangleCount=0,skinned=0;
 for(let i=0;i<json.nodes.length;i++){
  const n=json.nodes[i];if(!Number.isInteger(n.mesh))continue;
  const mesh=json.meshes?.[n.mesh];if(!mesh?.primitives?.length)continue;
  const skin=n.skin===undefined?-1:n.skin;
  if(skin>=0&&!skins[skin])continue;
  for(const primitive of mesh.primitives){
   if((primitive.mode??4)!==4||primitive.attributes?.POSITION===undefined)continue;
   if(primitive.extensions?.KHR_draco_mesh_compression)continue;
   const pos=accessor(primitive.attributes.POSITION),uvi=primitive.attributes?.TEXCOORD_0,
    uv=uvi===undefined?pos.map(()=>[0,0]):accessor(uvi);
   if(pos.length!==uv.length||!pos.length)return null;
   const indices=primitive.indices===undefined?pos.map((_,j)=>j):accessor(primitive.indices).map(x=>x[0]);
   if(indices.length%3||indices.some(j=>j<0||j>=pos.length))return null;
   vertexCount+=pos.length;triangleCount+=indices.length/3;
   if(vertexCount>LIMIT.vertices||triangleCount>LIMIT.triangles)return null;
   let joints=null,weights=null;
   if(skin>=0&&primitive.attributes?.JOINTS_0!==undefined&&primitive.attributes?.WEIGHTS_0!==undefined){
    joints=accessor(primitive.attributes.JOINTS_0);weights=accessor(primitive.attributes.WEIGHTS_0);
    if(joints.length!==pos.length||weights.length!==pos.length||joints.some(a=>a.some(v=>v<0||v>=skins[skin].joints.length)))return null;
    skinned++;
   }
   parts.push({name:clipName(n.name||mesh.name||'Parte '+i),meshNode:i,skin:skin>=0&&joints?skin:-1,
    vertices:pos,uvs:uv,triangles:indices,jointIndices:joints,weights,material:primitive.material??-1});
  }
 }
 if(!parts.length)return null;
 const clips=(json.animations||[]).slice(0,24).map((a,index)=>({
  name:clipName(a.name||'Animação '+(index+1)),
  channels:(a.channels||[]).slice(0,500).map(channel=>{
   const sampler=a.samplers?.[channel.sampler],to=channel.target||{};
   if(!sampler||!['translation','rotation','scale'].includes(to.path)||!Number.isInteger(to.node)||to.node>=nodes.length||to.node<0)return null;
   if(sampler.interpolation&&!['STEP','LINEAR'].includes(sampler.interpolation))return null;
   const times=accessor(sampler.input).map(v=>v[0]),values=accessor(sampler.output);
   if(times.length>1200||times.length!==values.length||times.some(v=>!Number.isFinite(v)))return null;
   return {node:to.node,path:to.path,interpolation:sampler.interpolation||'LINEAR',times,values};
  }).filter(Boolean),
 })).map(a=>({...a,duration:Math.max(0,...a.channels.flatMap(ch=>ch.times))})).filter(c=>c.channels.length);
 const rig={format:'aurenix-gltf-scene19',version:1,nodes,skins,parts,clips,materials:materials(json),meshCount:new Set(parts.map(p=>p.meshNode)).size,skinnedParts:skinned,
  // Propriedades do rig18: mantidas para ferramentas e testes antigos.
  meshNode:parts[0].meshNode,joints:skins[0]?.joints||[],vertices:parts.flatMap(p=>p.vertices),
  triangles:parts.flatMap(p=>p.triangles),center:[0,0,0],scale:1};
 bounds(rig);
 if(JSON.stringify(rig).length>9500000)return null;
 return rig;
}
function sample(rig,clipName='',time=0,loop=true){
 if(!rig?.parts?.length)return R.sample(rig,clipName,time,loop);
 const pose=R.animationPose(rig,clipName,time,loop),world=R.globals(rig.nodes,pose);
 const positions=[],normals=[],uv=[],groups=[];
 for(const part of rig.parts){
  const nodeWorld=world[part.meshNode],skin=rig.skins[part.skin];
  const transforms=skin?skin.joints.map((joint,i)=>R.mul(R.mul(R.inverse(nodeWorld),world[joint]),skin.inverseBind[i])):null;
  const transformed=part.vertices.map((vertex,i)=>{
   let local=vertex;
   if(transforms&&part.jointIndices?.[i]&&part.weights?.[i]){
    const target=[0,0,0];let weightSum=0;
    for(let k=0;k<4;k++){
     const influence=part.weights[i][k]||0,m=transforms[part.jointIndices[i][k]];if(influence<=0||!m)continue;
     const p=[m[0]*vertex[0]+m[4]*vertex[1]+m[8]*vertex[2]+m[12],m[1]*vertex[0]+m[5]*vertex[1]+m[9]*vertex[2]+m[13],m[2]*vertex[0]+m[6]*vertex[1]+m[10]*vertex[2]+m[14]];
     for(let axis=0;axis<3;axis++)target[axis]+=p[axis]*influence;weightSum+=influence;
    }
    if(weightSum>1e-7)local=target.map(n=>n/weightSum);
   }
   return [nodeWorld[0]*local[0]+nodeWorld[4]*local[1]+nodeWorld[8]*local[2]+nodeWorld[12],
    nodeWorld[1]*local[0]+nodeWorld[5]*local[1]+nodeWorld[9]*local[2]+nodeWorld[13],
    nodeWorld[2]*local[0]+nodeWorld[6]*local[1]+nodeWorld[10]*local[2]+nodeWorld[14]].map((n,k)=>(n-rig.center[k])*rig.scale);
  });
  const start=positions.length/3;
  for(let t=0;t<part.triangles.length;t+=3){
   const ids=part.triangles.slice(t,t+3),a=transformed[ids[0]],b=transformed[ids[1]],c=transformed[ids[2]];
   if(!a||!b||!c)continue;
   const x=b.map((v,i)=>v-a[i]),y=c.map((v,i)=>v-a[i]),n=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],length=Math.hypot(...n)||1;
   for(const id of ids){positions.push(...transformed[id]);normals.push(...n.map(v=>v/length));uv.push(...(part.uvs[id]||[0,0]).slice(0,2));}
  }
  groups.push({start,count:positions.length/3-start,material:part.material,part:part.name,skinned:part.skin>=0});
 }
 return {p:new Float32Array(positions),n:new Float32Array(normals),uv:new Float32Array(uv),groups,triangles:positions.length/9};
}
function normalizeBone(name){
 let n=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 n=n.replace(/^.*[:|]/,'').replace(/^(mixamorig|bip001|armature|rig|bone)[\s._-]*/,'').replace(/[^a-z0-9]/g,'');
 n=n.replace(/left/g,'l').replace(/right/g,'r');
 const aliases={pelvis:'hips',hip:'hips',root:'hips',torso:'spine',chest:'spine1',upperchest:'spine2',
  headtop:'head',neck1:'neck',lupperarm:'larm',rupperarm:'rarm',llowerarm:'lforearm',rlowerarm:'rforearm',
  lupperleg:'lthigh',rupperleg:'rthigh',llowerleg:'lshin',rlowerleg:'rshin'};
 return aliases[n]||n;
}
function invertQuat(q){return [-q[0],-q[1],-q[2],q[3]];}
function qmul(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
function boneMap(source,target,overrides={}){
 const targetNodes=new Map(),mapped={};
 for(let i=0;i<target.nodes.length;i++){
  const name=normalizeBone(target.nodes[i].name);if(name&&!targetNodes.has(name))targetNodes.set(name,i);
 }
 for(let i=0;i<source.nodes.length;i++){
  const original=source.nodes[i].name,explicit=overrides[original]??overrides[i];
  if(explicit!==undefined){
   const found=typeof explicit==='number'?explicit:target.nodes.findIndex(x=>x.name===explicit);
   if(found>=0&&found<target.nodes.length)mapped[i]=found;
  }else{const mappedId=targetNodes.get(normalizeBone(original));if(mappedId!==undefined)mapped[i]=mappedId;}
 }
 return mapped;
}
function retarget(source,target,clipName,overrides={}){
 const clip=source?.clips?.find(c=>c.name===clipName);if(!clip)return {ok:false,error:'Animação de origem não encontrada'};
 const mapping=boneMap(source,target,overrides);
 const scale=(target.scale&&source.scale)?source.scale/target.scale:1;
 const channels=[];
 for(const ch of clip.channels){
  const to=mapping[ch.node];if(to===undefined)continue;
  const fromNode=source.nodes[ch.node],toNode=target.nodes[to];
  const from=vec(fromNode[ch.path],ch.path==='rotation'?[0,0,0,1]:ch.path==='scale'?[1,1,1]:[0,0,0]);
  const toBase=vec(toNode[ch.path],ch.path==='rotation'?[0,0,0,1]:ch.path==='scale'?[1,1,1]:[0,0,0]);
  const values=ch.values.map(v=>{
   if(ch.path==='translation')return v.map((x,i)=>toBase[i]+(x-from[i])*scale);
   if(ch.path==='scale')return v.map((x,i)=>toBase[i]*(from[i]?x/from[i]:1));
   const q=qmul(qmul(toBase,invertQuat(from)),v),length=Math.hypot(...q)||1;
   return q.map(x=>x/length);
  });
  channels.push({...ch,node:to,values});
 }
 if(!channels.length)return {ok:false,error:'Nenhum osso compatível; use mapeamento manual'};
 const newName=clipName.slice(0,45)+' • Transferida';
 let unique=newName,j=2;while(target.clips.some(c=>c.name===unique))unique=newName+' '+j++;
 target.clips.push({name:unique,duration:clip.duration,channels,retargetedFrom:clipName});
 return {ok:true,name:unique,mappedNodes:Object.keys(mapping).length,channels:channels.length,skipped:clip.channels.length-channels.length};
}
global.AurenixGLTF19={build,sample,images,materials,boneMap,retarget,normalizeBone,limits:LIMIT};
})(window);
