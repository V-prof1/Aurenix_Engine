/* Aurenix Engine 0.18 — malhas GLTF com skinning CPU local.
 * Primeiro rig por GLTF (1 mesh, 1 skin), triângulos sem Draco, até 6k vértices/12k triângulos.
 * Posições e articulações seguem glTF 2.0; não carrega URLs remotas nem executa scripts.
 * Fallback OBJ permanece para qualquer modelo incompatível.
 */
(function(global){'use strict';
const MAX_NODES=160,MAX_JOINTS=64,MAX_VERTS=6000,MAX_TRIS=12000;
const ident=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
function mul(a,b){const out=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function inverse(a){
 const aug=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?a[c*4+r]:(c-4===r?1:0)));
 for(let i=0;i<4;i++){
  let best=i;for(let r=i+1;r<4;r++)if(Math.abs(aug[r][i])>Math.abs(aug[best][i]))best=r;
  if(Math.abs(aug[best][i])<1e-9)return ident();
  [aug[i],aug[best]]=[aug[best],aug[i]];
  const v=aug[i][i];for(let col=0;col<8;col++)aug[i][col]/=v;
  for(let r=0;r<4;r++)if(r!==i){const factor=aug[r][i];for(let col=0;col<8;col++)aug[r][col]-=factor*aug[i][col];}
 }
 return Array.from({length:16},(_,i)=>aug[i%4][4+Math.floor(i/4)]);
}
function qnorm(q){
 const n=Math.hypot(...q)||1;
 return q.map(v=>v/n);
}
function qlerp(q1,q2,t){
 let a=qnorm(q1),b=qnorm(q2);
 if(a.reduce((s,x,i)=>s+x*b[i],0)<0)b=b.map(x=>-x);
 return qnorm(a.map((x,i)=>x+(b[i]-x)*t));
}
function trs(t,r,s){
 const [x,y,z,w]=qnorm(r||[0,0,0,1]),[sx,sy,sz]=s||[1,1,1],v=t||[0,0,0];
 return [(1-2*(y*y+z*z))*sx, (2*(x*y+z*w))*sx,(2*(x*z-y*w))*sx,0,
         (2*(x*y-z*w))*sy,(1-2*(x*x+z*z))*sy,(2*(y*z+x*w))*sy,0,
         (2*(x*z+y*w))*sz,(2*(y*z-x*w))*sz,(1-2*(x*x+y*y))*sz,0,
         v[0],v[1],v[2],1];
}
function transform(m,p){
 return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
}
function globals(nodes,overrides=null){
 const cached=new Array(nodes.length),visiting=new Set();
 function get(i,depth=0){
  if(i<0||i>=nodes.length||depth>100)throw Error('Ciclo no esqueleto glTF');
  if(cached[i])return cached[i];
  if(visiting.has(i))throw Error('Ciclo na hierarquia glTF');
  visiting.add(i);
  const n=nodes[i],v=overrides?.[i],m=n.matrix&&!v?n.matrix:trs(v?.translation||n.translation,v?.rotation||n.rotation,v?.scale||n.scale);
  cached[i]=n.parent>=0?mul(get(n.parent,depth+1),m):m;
  visiting.delete(i);return cached[i];
 }
 return nodes.map((_,i)=>get(i));
}
function valueAt(channel,time){
 const times=channel.times,values=channel.values;
 if(!times.length)return null;
 if(time<=times[0])return values[0];
 if(time>=times[times.length-1])return values[values.length-1];
 let low=0,high=times.length-1;while(high-low>1){const mid=(low+high)>>1;if(times[mid]<=time)low=mid;else high=mid;}
 const d=times[high]-times[low]||1,weight=(time-times[low])/d;
 if(channel.interpolation==='STEP')return values[low];
 if(channel.path==='rotation')return qlerp(values[low],values[high],weight);
 return values[low].map((v,i)=>v+(values[high][i]-v)*weight);
}
function animationPose(rig,clipId,time,loop=true){
 const clip=rig.clips.find(c=>c.name===clipId)||rig.clips[0];
 if(!clip)return {};
 const t=clip.duration?(loop?((Number(time)||0)%clip.duration+clip.duration)%clip.duration:clamp(time,0,clip.duration)):0;
 const nodeValues={};
 for(const channel of clip.channels){
  const value=valueAt(channel,t);
  if(value&&channel.node>=0&&channel.node<rig.nodes.length)(nodeValues[channel.node]??={})[channel.path]=value;
 }
 return nodeValues;
}
function sample(rig,clipName='',time=0,loop=true){
 if(!rig?.vertices?.length||!rig.triangles?.length)throw Error('Rig importado inválido');
 const pose=animationPose(rig,clipName,time,loop),world=globals(rig.nodes,pose),nodeWorld=world[rig.meshNode];
 const invertNode=inverse(nodeWorld),skinMatrices=rig.joints.map((j,i)=>mul(mul(invertNode,world[j]),rig.inverseBind[i]));
 const transformed=new Array(rig.vertices.length);
 for(let i=0;i<rig.vertices.length;i++){
  const original=rig.vertices[i],weights=rig.weights[i],joints=rig.jointIndices[i];
  const local=[0,0,0];let sum=0;
  for(let k=0;k<4;k++){
   const w=Number(weights?.[k])||0;if(w<=0)continue;const matrix=skinMatrices[joints[k]];if(!matrix)continue;
   const result=transform(matrix,original);
   for(let a=0;a<3;a++)local[a]+=result[a]*w;
   sum+=w;
  }
  if(sum<=1e-7)for(let k=0;k<3;k++)local[k]=original[k];
  else for(let k=0;k<3;k++)local[k]/=sum;
  const p=transform(nodeWorld,local);
  transformed[i]=p.map((v,j)=>(v-rig.center[j])*rig.scale);
 }
 const out=new Float32Array(rig.triangles.length*3),normal=new Float32Array(out.length);
 for(let i=0;i<rig.triangles.length;i+=3){
  const a=transformed[rig.triangles[i]],b=transformed[rig.triangles[i+1]],c=transformed[rig.triangles[i+2]];
  if(!a||!b||!c)throw Error('Índice da malha animada inválido');
  const ab=b.map((v,j)=>v-a[j]),ac=c.map((v,j)=>v-a[j]);
  const cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
  const length=Math.hypot(...cross)||1;const n=cross.map(v=>v/length);
  for(let k=0;k<3;k++){out.set([a,b,c][k],i*3+k*3);normal.set(n,i*3+k*3);}
 }
 return {p:out,n:normal,triangles:rig.triangles.length/3};
}
function build(json,buffers,Importer=global.AurenixImport17){
 if(!Importer?.accessor)throw Error('Importador GLTF não carregado');
 if(!Array.isArray(json?.nodes)||json.nodes.length>MAX_NODES)return null;
 const accessor=id=>Importer.accessor(json,buffers,id);
 const meshNode=json.nodes.findIndex(n=>Number.isInteger(n.mesh)&&Number.isInteger(n.skin));
 if(meshNode<0)return null;
 const node=json.nodes[meshNode],skin=json.skins?.[node.skin],mesh=json.meshes?.[node.mesh];
 if(!skin?.joints?.length||skin.joints.length>MAX_JOINTS||!mesh?.primitives?.length)return null;
 const vertices=[],jointIndices=[],weights=[],triangles=[];
 // Um mesh GLTF pode conter múltiplas primitives (roupa, pele, material etc.).
 // Todas as primitives esqueléticas compatíveis compartilham a mesma skin.
 for(const primitive of mesh.primitives){
  if((primitive.mode??4)!==4||primitive.attributes?.POSITION===undefined||
     primitive.attributes?.JOINTS_0===undefined||primitive.attributes?.WEIGHTS_0===undefined)continue;
  const pp=accessor(primitive.attributes.POSITION),jj=accessor(primitive.attributes.JOINTS_0),ww=accessor(primitive.attributes.WEIGHTS_0);
  if(pp.length!==jj.length||pp.length!==ww.length||pp.length+vertices.length>MAX_VERTS)return null;
  const ind=primitive.indices!==undefined?accessor(primitive.indices).map(x=>x[0]):pp.map((_,i)=>i);
  if(ind.length%3!==0||ind.length/3+triangles.length/3>MAX_TRIS||
     ind.some(i=>!Number.isInteger(i)||i<0||i>=pp.length))return null;
  const shift=vertices.length;
  vertices.push(...pp);jointIndices.push(...jj);weights.push(...ww);
  triangles.push(...ind.map(i=>i+shift));
 }
 if(triangles.length<3)return null;
 const parents=new Array(json.nodes.length).fill(-1);
 for(let i=0;i<json.nodes.length;i++)for(const child of json.nodes[i].children||[]){
  if(child<0||child>=json.nodes.length||parents[child]!==-1)return null;
  parents[child]=i;
 }
 const nodes=json.nodes.map((n,i)=>({name:String(n.name||'Articulação '+i).slice(0,65),parent:parents[i],
  translation:n.translation||[0,0,0],rotation:n.rotation||[0,0,0,1],scale:n.scale||[1,1,1],matrix:n.matrix||null}));
 const joints=skin.joints.slice(),inverseBind=skin.inverseBindMatrices!==undefined?accessor(skin.inverseBindMatrices):joints.map(()=>ident());
 if(inverseBind.length!==joints.length||inverseBind.some(m=>m.length!==16))return null;
 if(jointIndices.some(indices=>indices.some(i=>i<0||i>=joints.length)))return null;
 const clips=(json.animations||[]).slice(0,16).map((anim,index)=>{
  const channels=(anim.channels||[]).slice(0,256).map(channel=>{
   const sampler=anim.samplers?.[channel.sampler];
   if(!sampler||!['translation','rotation','scale'].includes(channel.target?.path)||!Number.isInteger(channel.target?.node))return null;
   if(sampler.interpolation&& !['STEP','LINEAR'].includes(sampler.interpolation))return null;
   const times=accessor(sampler.input).map(x=>x[0]),values=accessor(sampler.output);
   if(times.length!==values.length||times.length>500||times.some(v=>!Number.isFinite(v)))return null;
   return {node:channel.target.node,path:channel.target.path,interpolation:sampler.interpolation||'LINEAR',times,values};
  }).filter(Boolean);
  return {name:String(anim.name||'Animação '+(index+1)).slice(0,65),channels,duration:Math.max(0,...channels.flatMap(ch=>ch.times))};
 }).filter(clip=>clip.channels.length);
 const bind=globals(nodes),matrix=bind[meshNode],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const vertex of vertices){const p=transform(matrix,vertex);for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}}
 const center=min.map((v,i)=>(v+max[i])/2),scale=1/Math.max(.00001,...max.map((v,i)=>v-min[i]));
 const rig={format:'aurenix-gltf-rig18',version:1,nodes,meshNode,joints,inverseBind,vertices,jointIndices,weights,triangles,center,scale,clips};
 if(JSON.stringify(rig).length>5000000)return null;
 return rig;
}
global.AurenixGLTFRig18={build,sample,animationPose,valueAt,globals,trs,mul,inverse,limits:{nodes:MAX_NODES,joints:MAX_JOINTS,vertices:MAX_VERTS,triangles:MAX_TRIS}};
})(window);
