const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const w={AurenixZip:{asDataURL:(data,mime)=>'data:'+mime+';base64,'+Buffer.from(data).toString('base64')}};
 const ctx={window:w,console,TextDecoder,TextEncoder,Uint8Array,Float32Array,DataView,Math,Date,atob:global.atob,btoa:global.btoa};
 for(const f of ['js/import17.js','js/gltf18-rig.js','js/gltf19.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 return w;
}
const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function model(){
 const vertex=[[0,0,0],[1,0,0],[0,1,0]],uv=[[0,0],[1,0],[0,1]],joint=vertex.map(()=>[0,0,0,0]),weights=vertex.map(()=>[1,0,0,0]);
 const json={
  asset:{version:'2.0'},nodes:[
   {name:'Body',mesh:0,skin:0,children:[2]},
   {name:'Hair',mesh:1,skin:1,children:[3]},
   {name:'mixamorig:Hips'},
   {name:'Head'}
  ],
  meshes:[
   {primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2,TEXCOORD_0:4},indices:3,material:0},
     {attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2,TEXCOORD_0:4},indices:3,material:1}]},
   {primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2,TEXCOORD_0:4},indices:3,material:1}]}
  ],
  skins:[{joints:[2],inverseBindMatrices:5},{joints:[3],inverseBindMatrices:5}],
  animations:[{name:'Walk',samplers:[{input:6,output:7,interpolation:'LINEAR'}],
   channels:[{sampler:0,target:{node:2,path:'translation'}}]}],
  materials:[
   {name:'Skin',pbrMetallicRoughness:{baseColorFactor:[1,.5,.3,1],baseColorTexture:{index:0}}},
   {name:'Hair',pbrMetallicRoughness:{baseColorFactor:[.2,.1,.3,.8],baseColorTexture:{index:1}},alphaMode:'BLEND'}
  ],
  textures:[{source:0},{source:1}],
  images:[{uri:'data:image/png;base64,iVBORw0KGgo='},{uri:'hair.png',mimeType:'image/png'}],
  accessorData:{0:vertex,1:joint,2:weights,3:[[0],[1],[2]],4:uv,5:[I],6:[[0],[1]],7:[[0,0,0],[1,0,0]]}
 };
 return json;
}
function fake(){return {accessor:(json,buffers,id)=>json.accessorData[id]};}
test('0.19: múltiplas malhas, duas skins, materiais e UV preservados',()=>{
 const G=setup().AurenixGLTF19,rig=G.build(model(),[],fake());
 assert.ok(rig);
 assert.equal(rig.parts.length,3);
 assert.equal(rig.skins.length,2);
 assert.equal(rig.meshCount,2);
 assert.equal(rig.skinnedParts,3);
 assert.equal(rig.materials.length,2);
 const pose=G.sample(rig,'Walk',.5);
 assert.equal(pose.triangles,3);
 assert.equal(pose.uv.length,18);
 assert.equal(pose.groups.length,3);
 assert.equal(pose.groups[0].material,0);
 assert.equal(pose.groups[1].material,1);
 assert.equal(pose.groups[2].material,1);
 assert.ok(pose.p.every(Number.isFinite));
});
test('0.19: imagens data URI e externas do ZIP são incorporadas sem HTTP',()=>{
 const G=setup().AurenixGLTF19,json=model();
 const files={'models/hair.png':new Uint8Array([137,80,78,71,13,10,26,10])};
 const images=G.images(json,[],files,'models/');
 assert.equal(images.length,2);
 assert.match(images[0],/^data:image\/png;base64,/);
 assert.match(images[1],/^data:image\/png;base64,/);
 json.images[1].uri='https://example.com/texture.png';
 assert.throws(()=>G.images(json,[],files,'models/'),/ZIP local/);
});
test('0.19: transferência de movimento por nomes de ossos e mapeamento manual',()=>{
 const G=setup().AurenixGLTF19,source=G.build(model(),[],fake()),target=G.build(model(),[],fake());
 assert.ok(source&&target);
 target.nodes[2].name='Hips';target.nodes[3].name='Cranium';
 const map=G.boneMap(source,target);
 assert.equal(map[2],2);
 const result=G.retarget(source,target,'Walk');
 assert.equal(result.ok,true);assert.equal(result.channels,1);
 assert.equal(target.clips.length,2);
 const clip=target.clips.find(x=>x.name===result.name);
 assert.equal(clip.channels[0].node,2);
 const altered=G.build(model(),[],fake());
 altered.nodes[2].name='Quadril';
 const no=G.retarget(source,altered,'Walk');
 assert.equal(no.ok,false);
 const manual=G.retarget(source,altered,'Walk',{'mixamorig:Hips':2});
 assert.equal(manual.ok,true);
 assert.equal(manual.channels,1);
});
test('0.19: rig antigo e dados estáticos mantêm compatibilidade',()=>{
 const w=setup(),G=w.AurenixGLTF19,R=w.AurenixGLTFRig18;
 const json=model();delete json.nodes[0].skin;delete json.nodes[1].skin;
 const scene=G.build(json,[],fake());
 assert.ok(scene);assert.equal(scene.skinnedParts,0);assert.equal(G.sample(scene).triangles,3);
 assert.equal(G.sample(R.build({asset:{version:'2.0'},nodes:[]},[],fake())||scene).triangles,3);
});
test('0.19: aplicação e jogo carregam shader texturizado e retargeting offline',()=>{
 const read=x=>fs.readFileSync(x,'utf8');
 for(const html of ['index.html','studio.html'])assert.match(read(html),/gltf19\.js/);
 const editor=read('js/editor.js'),runtime=read('js/runtime.js');
 assert.match(editor,/gltf19Src/);assert.match(editor,/ax19Transfer/);assert.match(editor,/ax19Mappings/);
 assert.match(runtime,/aUV/);assert.match(runtime,/uUseTexture/);assert.match(runtime,/gl\.texImage2D/);
 assert.ok(!read('js/gltf19.js').includes('fetch('));
});
