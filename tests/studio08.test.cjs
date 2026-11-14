const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=file=>fs.readFileSync(file,'utf8');
function loadRuntime(){
 const window={},document={addEventListener(){}};
 vm.runInNewContext(source('js/runtime.js'),{window,document,console,Float32Array,Math,TextEncoder,Uint8Array,atob:s=>Buffer.from(s,'base64').toString('binary')});
 return window.AurenixRuntime;
}
function loadStudio(){
 const window={},document={getElementById:()=>null},storage={};
 vm.runInNewContext(source('js/studio08.js'),{window,document,console,localStorage:storage,Math,setTimeout,clearTimeout});
 return window.Aurenix08;
}
test('4 novas geometrias 3D têm triângulos e normais do mesmo tamanho',()=>{
 const R=loadRuntime();
 for(const type of ['pyramid','cone','torus','capsule']){
  const mesh=R.createGeometry(type);
  assert.ok(mesh.p.length>90,type);
  assert.equal(mesh.p.length,mesh.n.length,type);
  assert.equal(mesh.p.length%9,0,type);
  assert.ok(Array.from(mesh.p).every(Number.isFinite),type);
 }
});
test('importador OBJ aceita faces e quads e limita faces',()=>{
 const R=loadRuntime();
 const obj='v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4';
 const mesh=R.parseOBJ(obj);
 assert.equal(mesh.triangles,2);
 assert.equal(mesh.p.length,18);
 assert.equal(mesh.n.length,18);
 assert.ok(Math.max(...mesh.p)<=.5);
 const limited=R.parseOBJ(obj,1);
 assert.equal(limited.triangles,1);
 assert.throws(()=>R.parseOBJ('o empty\nv 0 1 0'),/triângulos/);
});
test('componentes aceitam 10 tipos e não duplicam no mesmo objeto',()=>{
 const S=loadStudio(),o={name:'objeto'};
 for(const type of Object.keys(S.definitions))assert.equal(S.add(o,type),true,type);
 assert.equal(Object.keys(S.definitions).length,10);
 assert.equal(o.components.length,10);
 assert.equal(S.add(o,'spin'),false);
 assert.ok(S.remove(o,'spin'));
 assert.equal(o.components.some(c=>c.type==='spin'),false);
 assert.throws(()=>S.add(o,'inexistente'),/inválido/);
});
test('configurações de HUD são preenchidas com defaults sem perder opções anteriores',()=>{
 const S=loadStudio(),p={mode:'pixel',gameSettings:{hud:false,cameraZoom:1.7}};
 const settings=S.loadDefaults(p);
 assert.equal(settings.hud,false);assert.equal(settings.cameraZoom,1.7);
 assert.equal(settings.pixelPerfect,true);
 assert.equal(settings.maxParticles,220);
 assert.equal(settings.joystickSize,122);
});
test('pixel art valida tamanho, camadas e exportação como PNG',()=>{
 const S=loadStudio();let cells=0;
 const window={},document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){cells++},set fillStyle(x){},set globalAlpha(x){}}),toDataURL:()=>'data:image/png;base64,AA=='})};
 const ctx={window,document,console,localStorage:{},Math,setTimeout,clearTimeout};
 vm.runInNewContext(source('js/studio08.js'),ctx);
 const art={name:'teste',size:8,frames:[{layers:[{visible:true,opacity:1,cells:Array(64).fill('#aabbcc')}]}]};
 assert.match(window.Aurenix08.previewArt(art),/^data:image\/png/);
 assert.equal(cells,64);
 assert.throws(()=>window.Aurenix08.previewArt({...art,size:999}),/incompatível/);
});
test('engine e HTML5 incluem ferramentas, atalhos, OBJ e telas de jogo',()=>{
 const html=source('index.html'),editor=source('js/editor.js'),runtime=source('js/runtime.js');
 for(const id of ['tabComponents','tabGameSettings','tabPixelBridge','ax08Check','objectSearch','assetSearch','menuComponents'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const path of ['js/studio08.js','js/studio08.css','js/toolbox08.js'])assert.ok(html.includes(path),path);
 assert.ok(editor.includes("createObj('model3d'"));
 assert.ok(editor.includes('function prepareProject()'));
 assert.match(runtime,/getByTag:tag/);
 assert.match(runtime,/updateComponents\(dt\)/);
 assert.match(runtime,/drawParticles\(dt\)/);
});
test('todos os scripts JS do aplicativo compilam',()=>{
 for(const f of ['js/runtime.js','js/editor.js','js/studio07.js','js/studio08.js','js/blocks.js','js/toolbox08.js','js/back.js','js/gizmo3d.js']){
  assert.doesNotThrow(()=>new vm.Script(source(f),{filename:f}),f);
 }
});
