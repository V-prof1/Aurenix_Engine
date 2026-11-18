/* Aurenix 0.17 - importador GLB/GLTF/ZIP local sem chamadas de rede.
 * Converte geometria triangular de glTF 2.0 em OBJ para o renderer legado.
 * Preserva metadados de animação, ossos e materiais sem fingir skinning em tempo real.
 */
(function(global){'use strict';
const dec=new TextDecoder(),enc=new TextEncoder();
const TYPES={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const COUNT={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
const allowed=/\.(obj|glb|gltf|png|jpe?g|webp|zip)$/i;
const fileName=s=>String(s||'').replaceAll('\\','/').split('/').pop().replace(/[<>:"|?*]/g,'_').slice(0,160);
const baseDir=n=>String(n||'').replaceAll('\\','/').replace(/[^/]*$/,'');
function ext(n){return String(n).split('.').at(-1).toLowerCase();}
function bytesFromDataUri(uri){
 if(!uri.startsWith('data:'))throw Error('URI de dados inválida');
 const [header,payload]=uri.split(',',2);
 if(/;base64/i.test(header)){
  const bin=atob(payload||'');return Uint8Array.from(bin,c=>c.charCodeAt(0));
 }
 return enc.encode(decodeURIComponent(payload||''));
}
function parseGLB(input){
 const data=input instanceof Uint8Array?input:new Uint8Array(input),v=new DataView(data.buffer,data.byteOffset,data.byteLength);
 if(data.length<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2)throw Error('GLB 2.0 inválido');
 if(v.getUint32(8,true)>data.length)throw Error('GLB truncado');
 const length=v.getUint32(8,true);let offset=12,json=null,binary=null;
 while(offset+8<=length){
  const size=v.getUint32(offset,true),type=v.getUint32(offset+4,true);offset+=8;
  if(size>90*1024*1024||offset+size>length)throw Error('Chunk GLB excede o arquivo');
  const body=data.slice(offset,offset+size);offset+=size;
  if(type===0x4e4f534a){json=JSON.parse(dec.decode(body).replace(/\0+$/g,''));}
  if(type===0x004e4942)binary=body;
 }
 if(!json)throw Error('GLB sem JSON');
 return {json,binary};
}
async function resources(json,files={},base='',binary=null){
 if(!json?.asset?.version?.startsWith('2.'))throw Error('O importador requer glTF 2.0');
 if(json.extensionsRequired?.length)throw Error('Extensão glTF obrigatória não instalada: '+json.extensionsRequired.join(', '));
 const buffers=[];
 for(let i=0;i<(json.buffers||[]).length;i++){
  const b=json.buffers[i],uri=b.uri;
  let data;
  if(!uri)data=binary;
  else if(uri.startsWith('data:'))data=bytesFromDataUri(uri);
  else{
   if(/^(https?:|blob:|file:|\/)/i.test(uri)||uri.includes('..'))throw Error('GLTF não pode buscar arquivos remotos ou externos ao pacote');
   const name=decodeURIComponent(uri).replace(/^\.\//,'');
   data=files[base+name]||files[name]||files[fileName(name)];
  }
  if(!data)throw Error('Buffer GLTF ausente: '+(uri||'BIN '+i)+'; inclua todos os arquivos no ZIP');
  if(data.length<b.byteLength)throw Error('Buffer GLTF incompleto');
  buffers.push(data);
 }
 return buffers;
}
function accessor(json,buffers,id){
 const a=json.accessors?.[id];if(!a)throw Error('Atributo GLTF inexistente');
 if(a.sparse)throw Error('Acessores GLTF sparse ainda não suportados');
 const view=json.bufferViews?.[a.bufferView];if(!view)throw Error('BufferView inválida');
 const Type=TYPES[a.componentType],components=COUNT[a.type];
 if(!Type||!components||a.count>2e6)throw Error('Accessor GLTF inválido');
 const data=buffers[view.buffer];if(!data)throw Error('Buffer GLTF inexistente');
 const offset=(view.byteOffset||0)+(a.byteOffset||0),stride=view.byteStride||Type.BYTES_PER_ELEMENT*components;
 if(stride<Type.BYTES_PER_ELEMENT*components)throw Error('Stride glTF inválido');
 const dv=new DataView(data.buffer,data.byteOffset,data.byteLength);
 const values=[];
 for(let i=0;i<a.count;i++){
  const v=[];for(let j=0;j<components;j++){
   const addr=offset+i*stride+j*Type.BYTES_PER_ELEMENT;
   if(addr+Type.BYTES_PER_ELEMENT>data.byteLength)throw Error('Accessor fora do buffer');
   const value=({5120:()=>dv.getInt8(addr),5121:()=>dv.getUint8(addr),5122:()=>dv.getInt16(addr,true),5123:()=>dv.getUint16(addr,true),5125:()=>dv.getUint32(addr,true),5126:()=>dv.getFloat32(addr,true)})[a.componentType]();
   v.push(a.normalized&&a.componentType!==5126?value/(a.componentType===5121?255:a.componentType===5123?65535:1):value);
  }
  values.push(v);
 }
 return values;
}
function quatMat(q){
 const [x,y,z,w]=q||[0,0,0,1];
 return [1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,
 2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,
 2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,0,0,0,1];
}
function mul(a,b){const m=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)m[c*4+r]+=a[k*4+r]*b[c*4+k];return m;}
function nodeMatrix(n){
 if(n.matrix?.length===16)return n.matrix;
 const t=n.translation||[0,0,0],s=n.scale||[1,1,1],m=quatMat(n.rotation);
 for(let j=0;j<3;j++)for(let i=0;i<3;i++)m[j*4+i]*=s[j];
 m[12]=t[0];m[13]=t[1];m[14]=t[2];return m;
}
function point(m,p,normal=false){
 const w=normal?0:1;
 return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12]*w,
         m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13]*w,
         m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]*w];
}
function convert(json,buffers,{maxTriangles=70000}={}){
 const nodes=json.nodes||[],meshes=json.meshes||[],roots=json.scenes?.[json.scene||0]?.nodes||nodes.map((_,i)=>i),entries=[],visited=new Set();
 function visit(index,parent,depth){
  if(depth>80)throw Error('Hierarquia de modelos muito profunda');
  const n=nodes[index];if(!n||visited.has(index))return;
  visited.add(index);const matrix=mul(parent,nodeMatrix(n));
  if(n.mesh!==undefined)entries.push({mesh:meshes[n.mesh],node:n,idx:index,matrix});
  for(const child of n.children||[])visit(child,matrix,depth+1);
 }
 const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 for(const root of roots)visit(root,identity,0);
 if(!entries.length)throw Error('GLTF sem geometrias triangulares');
 let vertex=0,triangles=0,lines=['# Aurenix GLTF/GLB -> OBJ (somente malha estática triangulada)'];
 for(const entry of entries){
  lines.push('o '+String(entry.node.name||'Malha'+entry.idx).replace(/[^\w-]/g,'_').slice(0,55));
  for(const primitive of entry.mesh?.primitives||[]){
   if(primitive.mode!==undefined&&primitive.mode!==4)continue;
   if(primitive.extensions?.KHR_draco_mesh_compression)throw Error('Malha Draco requer decodificador externo; exporte GLB sem Draco');
   const positions=accessor(json,buffers,primitive.attributes?.POSITION);
   const normals=primitive.attributes?.NORMAL===undefined?null:accessor(json,buffers,primitive.attributes.NORMAL);
   const ids=primitive.indices===undefined?positions.map((_,i)=>[i]):accessor(json,buffers,primitive.indices);
   if(triangles+ids.length/3>maxTriangles)throw Error('Modelo muito pesado; limite: '+maxTriangles+' triângulos por importação');
   for(const p of positions){if(p.length<3)throw Error('Posições inválidas');const v=point(entry.matrix,p);lines.push('v '+v.map(n=>Number(n).toFixed(6)).join(' '));}
   if(normals)for(const n of normals){const v=point(entry.matrix,n,true),len=Math.hypot(...v)||1;lines.push('vn '+v.map(a=>(a/len).toFixed(6)).join(' '));}
   for(let i=0;i+2<ids.length;i+=3){
    const [a,b,c]=[ids[i][0],ids[i+1][0],ids[i+2][0]];
    if([a,b,c].some(x=>x<0||x>=positions.length))throw Error('Índice fora da malha');
    const idx=[a,b,c].map(x=>x+vertex+1);
    lines.push('f '+idx.map(x=>normals?x+'//'+x:x).join(' '));
    triangles++;
   }
   vertex+=positions.length;
  }
 }
 if(!triangles)throw Error('GLTF não contém triângulos');
 return {obj:lines.join('\n'),triangles,nodes:nodes.length,meshCount:entries.length};
}
function animations(json,buffers){
 return (json.animations||[]).map((anim,index)=>{
  const channels=(anim.channels||[]).map(channel=>{
   const sampler=anim.samplers?.[channel.sampler];if(!sampler)return null;
   const times=accessor(json,buffers,sampler.input);
   const data=accessor(json,buffers,sampler.output);
   return {node:channel.target?.node,path:channel.target?.path||'',interpolation:sampler.interpolation||'LINEAR',
    times:times.map(x=>x[0]),values:data};
  }).filter(Boolean);
  return {name:anim.name||'Animação '+(index+1),duration:Math.max(0,...channels.flatMap(x=>x.times)),channels};
 });
}
async function parseFile(file,files={}){
 const extName=ext(file.name);
 let json,binary=null;const bytes=new Uint8Array(await file.arrayBuffer());
 if(extName==='glb')({json,binary}=parseGLB(bytes));
 else if(extName==='gltf')json=JSON.parse(dec.decode(bytes));
 else throw Error('Use GLB ou GLTF');
 const buffers=await resources(json,files,baseDir(file.name),binary);
 const geometry=convert(json,buffers),clips=animations(json,buffers),skins=(json.skins||[]).map(s=>({name:s.name||'Esqueleto',joints:(s.joints||[]).map(i=>({node:i,name:json.nodes?.[i]?.name||'Osso '+i})),skeleton:s.skeleton??null}));
 const textures=(json.images||[]).map(img=>({name:fileName(img.name||img.uri||'Textura'),uri:img.uri||null,mimeType:img.mimeType||'image/png'}));
 return {geometry,clips,skins,textures,source:json};
}
async function fromZip(file,Zip=global.AurenixZip){
 if(!Zip?.unpack)throw Error('Extrator ZIP não disponível');
 const contents=await Zip.unpack(file),entries=Object.keys(contents).filter(k=>allowed.test(k)&&!/\/__MACOSX\//.test(k));
 if(entries.length>160)throw Error('Pacote muito grande: limite 160 recursos reconhecidos');
 return {contents,entries,modelPaths:entries.filter(x=>/\.(glb|gltf|obj)$/i.test(x))};
}
global.AurenixImport17={parseGLB,resources,accessor,convert,animations,parseFile,fromZip,allowed,fileName};
})(window);
