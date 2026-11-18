const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {TextDecoder,TextEncoder}=require('node:util');
function api(){
 const window={},ctx={window,console,TextDecoder,TextEncoder,Math,Date,Uint8Array,DataView,Float32Array,ArrayBuffer,atob:global.atob};
 for(const f of ['js/import17.js','js/gltf18-rig.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 return window;
}
function synthetic(){
 const bytes=new Uint8Array(36+12+48+6+64+8+24),dv=new DataView(bytes.buffer);let off=0;
 const addFloats=xs=>{const at=off;for(const x of xs){dv.setFloat32(off,x,true);off+=4;}return {byteOffset:at,byteLength:off-at};};
 const addBytes=xs=>{const at=off;for(const x of xs)dv.setUint8(off++,x);return {byteOffset:at,byteLength:off-at};};
 const addShorts=xs=>{const at=off;for(const x of xs){dv.setUint16(off,x,true);off+=2;}return {byteOffset:at,byteLength:off-at};};
 const views=[addFloats([0,0,0,1,0,0,0,1,0]),addBytes([0,0,0,0,0,0,0,0,0,0,0,0]),addFloats([1,0,0,0,1,0,0,0,1,0,0,0]),addShorts([0,1,2]),addFloats([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),addFloats([0,1]),addFloats([0,0,0,1,0,0])].map(v=>({buffer:0,...v}));
 const ac=(bufferView,componentType,type,count)=>({bufferView,componentType,type,count});
 const json={asset:{version:'2.0'},buffers:[{byteLength:bytes.length}],bufferViews:views,
 accessors:[ac(0,5126,'VEC3',3),ac(1,5121,'VEC4',3),ac(2,5126,'VEC4',3),ac(3,5123,'SCALAR',3),ac(4,5126,'MAT4',1),ac(5,5126,'SCALAR',2),ac(6,5126,'VEC3',2)],
 meshes:[{primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2},indices:3}]}],
 nodes:[{name:'Corpo',mesh:0,skin:0,children:[1]},{name:'OssoPrincipal',translation:[0,0,0]}],
 scenes:[{nodes:[0]}],scene:0,skins:[{joints:[1],inverseBindMatrices:4}],
 animations:[{name:'Movimento',samplers:[{input:5,output:6,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:1,path:'translation'}}]}]};
 return {json,bytes};
}
test('GLTF animado mantém skin e articulações',()=>{
 const {AurenixImport17:I,AurenixGLTFRig18:R}=api(),{json,bytes}=synthetic();
 const rig=R.build(json,[bytes],I);
 assert.ok(rig);assert.equal(rig.joints.length,1);assert.equal(rig.vertices.length,3);assert.equal(rig.clips.length,1);
 assert.equal(rig.clips[0].name,'Movimento');assert.ok(JSON.stringify(rig).length<2500);
});
test('Articulação deforma vértices entre 0 e 0.5 segundos',()=>{
 const {AurenixImport17:I,AurenixGLTFRig18:R}=api(),{json,bytes}=synthetic(),rig=R.build(json,[bytes],I);
 const a=R.sample(rig,'Movimento',0),b=R.sample(rig,'Movimento',.5);
 assert.equal(a.triangles,1);assert.equal(a.p.length,9);assert.equal(b.n.length,9);
 assert.ok(Math.abs((b.p[0]-a.p[0])-.5)<1e-5,'deslocamento inválido: '+(b.p[0]-a.p[0]));
 assert.ok(b.n.every(Number.isFinite));
});
test('Matrizes inversas e quaternion de animação estáveis',()=>{
 const {AurenixGLTFRig18:R}=api();
 const a=R.trs([2,4,6],[0,0,0,1],[1,1,1]),id=R.mul(R.inverse(a),a);
 assert.ok(Math.abs(id[12])<1e-6&&Math.abs(id[13])<1e-6&&Math.abs(id[14])<1e-6);
 const channel={path:'rotation',times:[0,1],values:[[0,0,0,1],[0,0,1,0]],interpolation:'LINEAR'};
 const q=R.valueAt(channel,.5);assert.ok(Math.abs(Math.hypot(...q)-1)<1e-6);
});
test('Modelos sem skin ou complexos continuam com OBJ',()=>{
 const {AurenixImport17:I,AurenixGLTFRig18:R}=api(),{json,bytes}=synthetic();
 assert.equal(R.build({...json,skins:[]},[bytes],I),null);
 const oversized={...json,nodes:Array.from({length:161},()=>({}))};
 assert.equal(R.build(oversized,[bytes],I),null);
});
test('Editor e runtime compartilham rig sem dependências pagas',()=>{
 const read=p=>fs.readFileSync(p,'utf8');
 const editor=read('js/editor.js'),runtime=read('js/runtime.js');
 for(const f of ['index.html','studio.html'])assert.ok(read(f).includes('js/gltf18-rig.js'),f);
 for(const token of ['AurenixGLTFRig18','gltfRig','ax18PreviewRig','rigSrc'])assert.ok(editor.includes(token),token);
 for(const token of ['Rig.sample','gltfPlaying','gltfClip','cpu-rig:','DYNAMIC_DRAW'])assert.ok(runtime.includes(token),token);
 assert.ok(!read('js/gltf18-rig.js').includes('fetch('));
});
