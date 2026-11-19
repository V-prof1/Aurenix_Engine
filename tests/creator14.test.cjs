const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
function setup(){
 const window={};
 const ctx={window,console,TextEncoder,TextDecoder,Uint8Array,Float32Array,Math,Date,atob:s=>Buffer.from(s,'base64').toString('binary')};
 for(const p of ['js/character3d.js','js/character-face13.js','js/character-motion14.js','js/model-touch14.js','js/runtime.js'])
 vm.runInNewContext(read(p),ctx,{filename:p});
 return {C:window.AurenixCharacters,T:window.AurenixModelTouch,R:window.AurenixRuntime};
}
function fixture(){
 const {C,T,R}=setup(),model=C.preset('blocky');
 const clip=C.newClip(model,'Expressão com movimento');clip.loop=false;clip.duration=1;
 return {C,T,R,model,clip};
}
test('Pose, rosto e escala coexistem no mesmo quadro com compatibilidade .aurenix3d v1',()=>{
 const {C,model,clip}=fixture(),head=model.parts.find(p=>p.name==='Cabeça');
 const angles=Object.fromEntries(model.parts.map(p=>[p.id,[...p.rotation]]));
 angles[head.id]=[0,30,0];
 const transforms={[head.id]:{position:[0,1,0],offset:[0,.45,0],size:[1.4,1.1,.85]}};
 C.capture(model,clip,1,angles,'surprised',transforms);
 const saved=C.validate(JSON.parse(JSON.stringify(model)));
 const f=saved.animations[0].frames.find(f=>f.time===1);
 assert.equal(f.expression,'surprised');
 assert.equal(f.pose[head.id][1],30);
 assert.deepEqual(Array.from(f.transforms[head.id].size),[1.4,1.1,.85]);
 assert.deepEqual(Array.from(C.getPose(saved,clip.id,1)[head.id]),[0,30,0]);
});
test('Tween XYZ e tamanho interpolam de forma suave sem alterar posição original',()=>{
 const {C,model,clip}=fixture(),head=model.parts.find(p=>p.name==='Cabeça');
 const before=JSON.stringify(model.parts);
 const pose=Object.fromEntries(model.parts.map(p=>[p.id,[...p.rotation]]));
 C.capture(model,clip,0,pose,'neutral',{[head.id]:{position:[0,0,0],size:[.8,.8,.7]}});
 C.capture(model,clip,1,pose,'happy',{[head.id]:{position:[0,2,0],size:[1.5,1.5,1]}});
 const x=C.getTransforms(model,clip.id,.5)[head.id];
 assert.equal(x.position[1],1);
 assert.ok(x.size[0]>1&&x.size[0]<1.5);
 const meshes=C.expand(model,{id:'a',visible:true},clip.id,.5);
 const mesh=meshes.find(p=>p._partId===head.id);
 assert.ok(mesh&&Array.from(mesh._modelMatrix).every(Number.isFinite));
 assert.equal(JSON.stringify(model.parts),before);
});
test('Objetos de cenário também animam posição, orientação e dimensões',()=>{
 const {C}=setup(),door=C.preset('door'),clip=door.animations[0];
 const leaf=door.parts.find(p=>p.name==='Folha da porta');
 const from=C.expand(door,{id:'door',visible:true},clip.id,0).find(p=>p._partId===leaf.id);
 const poses=Object.fromEntries(door.parts.map(p=>[p.id,[...p.rotation]]));
 const transforms={[leaf.id]:{position:[.1,.3,.6],size:[1.1,2.0,.2]}};
 C.capture(door,clip,1,poses,'neutral',transforms);
 const to=C.expand(door,{id:'door',visible:true},clip.id,1).find(p=>p._partId===leaf.id);
 assert.ok(Math.abs(from.y-to.y)>.2);
 assert.ok(Math.abs(from._modelMatrix[0]-to._modelMatrix[0])>.05);
});
test('Importar um modelo da 0.12 sem trilhas de objeto ainda é válido',()=>{
 const {C}=setup(),doc=C.preset('blocky');
 const c=C.newClip(doc,'Antiga');
 for(const f of c.frames)delete f.transforms;
 const result=C.validate(JSON.parse(JSON.stringify(doc)));
 assert.deepEqual(Object.keys(result.animations[0].frames[0].transforms),[]);
 const meshes=C.expand(result,{id:'old',visible:true},c.id,.3);
 assert.equal(meshes.length,result.parts.length);
});
test('Validar arquivos impede propriedades extras, IDs falsos, escala negativa e frames inválidos',()=>{
 const {C}=fixture(),model=C.preset('human'),clip=C.newClip(model,'Mov');
 clip.frames[0].transforms={['bad-id']:{size:[999,-3,4]},[model.parts[0].id]:{position:[999,-999,0],size:[-200,999,2],js:'alert(1)'}};
 const clean=C.validate(JSON.parse(JSON.stringify(model)));
 const t=clean.animations[0].frames[0].transforms;
 assert.ok(!t['bad-id']);
 assert.ok(t[model.parts[0].id].position.every(x=>Math.abs(x)<=500));
 assert.ok(t[model.parts[0].id].size.every(x=>x>=.02&&x<=30));
 assert.equal(Object.hasOwn(t[model.parts[0].id],'js'),false);
});
test('Manipulação por toque oferece movimento, escala, rotação e encaixe previsíveis',()=>{
 const {T}=setup(),start={position:[0,1,0],rotation:[0,0,0],size:[.8,1,.6]};
 const move=T.transform({tool:'move',start,dx:80,dy:-40,camera:{yaw:0,distance:8}});
 assert.ok(move.position[0]>0);assert.ok(move.position[1]>1);
 const z=T.transform({tool:'move',start,dx:0,dy:80,camera:{distance:8},depth:true});
 assert.ok(z.position[2]<0);
 const rotate=T.transform({tool:'rotate',start,dx:26,dy:0,snapToGrid:true});
 assert.equal(rotate.rotation[1]%5,0);
 const scale=T.transform({tool:'scale',start,dx:0,dy:-85});
 assert.ok(scale.size[0]>start.size[0]);
 const face=T.transform({tool:'face',start,dx:35,dy:-22,camera:{distance:6}});
 assert.ok(face.position[0]>0&&face.position[1]>1);
 assert.deepEqual(start.position,[0,1,0]);
});
test('Puxar partes do rosto usa identificadores de peças, não UV ou imagens',()=>{
 const {C,T}=setup(),doc=C.preset('blocky'),meshes=C.expand(doc,{id:'face',visible:true});
 const project=v=>({x:v[0]*100+400,y:v[1]*-100+400});
 const markers=T.faceMarkers(meshes,project);
 assert.ok(markers.length>=7);
 const marker=markers.find(x=>x.role==='mouth');
 assert.ok(marker);
 const selected=T.pick(meshes,{x:marker.x,y:marker.y},project,{facesOnly:true,threshold:30});
 assert.ok(selected&&selected._faceRole);
});
test('Aplicativo 0.14 entrega interface, 3 trilhas, modo facial e exportação offline',()=>{
 const editor=read('js/editor.js'),home=read('js/home.js'),html=read('index.html'),modeler=read('modelstudio.html'),sw=read('sw.js');
 for(const path of ['js/character-motion14.js','js/model-touch14.js','js/model14.css'])assert.ok(sw.includes(path),path);
 for(const word of ['data-tool14="move"','data-tool14="rotate"','data-tool14="scale"','data-tool14="face"','ax14Tracks','ax14LoadPalette','goPixel'])
  assert.ok(modeler.includes(word),word);
 assert.ok(modeler.includes('js/character-motion14.js'));
 assert.ok(editor.includes("fetch('js/character-motion14.js')"));
 assert.ok(editor.includes("data:characterSrc+'\\n'+faceSrc+'\\n'+motionSrc+'\\n'+tracksSrc+'\\n'+symmetrySrc+'\\n'+advancedSrc+'\\n'+rigSrc+'\\n'+gltf19Src+'\\n'+runtimeSrc"));
 assert.ok(home.includes('ALPHA 0.19'));
 assert.ok(html.includes('js/character-motion14.js'));
 assert.equal(JSON.parse(read('capacitor.config.json')).appId,'com.aurenix.engine.alpha014');
});
test('Fonte javascript do módulo de animação 0.14 e Model Studio sintaticamente válida',()=>{
 for(const p of ['js/character-motion14.js','js/model-touch14.js','js/modelstudio.js','js/editor.js'])
 assert.doesNotThrow(()=>new vm.Script(read(p),{filename:p}));
});
