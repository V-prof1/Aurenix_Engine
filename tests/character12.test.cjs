const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=p=>fs.readFileSync(p,'utf8');
function harness(){
 const window={};
 const ctx={window,console,Date,Math,Uint8Array,Float32Array,TextEncoder,TextDecoder};
 vm.runInNewContext(source('js/character3d.js'),ctx);
 vm.runInNewContext(source('js/runtime.js'),ctx);
 return {C:window.AurenixCharacters,R:window.AurenixRuntime,window};
}
test('Model Studio has complete 3D human, robot and creature presets',()=>{
 const {C}=harness();
 for(const type of ['human','robot','creature']){
  const doc=C.preset(type),valid=C.validate(doc);
  assert.equal(valid.format,'aurenix-character-v1');
  assert.ok(valid.parts.length>=6);
  assert.equal(new Set(valid.parts.map(x=>x.id)).size,valid.parts.length);
 }
});
test('3D hierarchical shoulder rotation changes arm mesh world center',()=>{
 const {C}=harness(),m=C.preset('robot'),arm=m.parts.find(p=>p.name==='Braço esquerdo');
 const a=C.expand(m,{id:'root',visible:true},'',0);
 arm.rotation[2]=65;
 const b=C.expand(m,{id:'root',visible:true},'',0);
 const old=a.find(p=>p._partId===arm.id),updated=b.find(p=>p._partId===arm.id);
 assert.ok(Math.abs(updated.x-old.x)>.03||Math.abs(updated.y-old.y)>.03);
 assert.equal(b.length,m.parts.length);
 assert.ok(b.every(p=>Array.from(p._modelMatrix).every(Number.isFinite)));
});
test('Keyframe animation captures arm rotation and interpolates at runtime',()=>{
 const {C,R}=harness(),doc=C.preset('human'),arm=doc.parts.find(p=>p.name==='Braço direito');
 const clip=C.newClip(doc,'Correr');clip.loop=false;
 const pose=Object.fromEntries(doc.parts.map(p=>[p.id,[...p.rotation]]));
 pose[arm.id]=[70,0,0];
 C.capture(doc,clip,.5,pose);
 assert.equal(C.getPose(doc,clip.id,.5)[arm.id][0],70);
 assert.equal(C.getPose(doc,clip.id,.25)[arm.id][0],35);
 const asset={id:'humanoid',name:'humanoid.aurenix3d',type:'application/x-aurenix-character+json',data:JSON.stringify(doc)};
 const root={id:'char1',type:'character3d',assetId:asset.id,x:0,y:2,z:0,rigClip:clip.id,rigTime:.5,visible:true};
 const parts=R.expandedSceneObjects({assets:[asset],objects:[root]});
 assert.equal(parts.length,doc.parts.length);
 assert.ok(parts.every(p=>p.id.startsWith('char1::')));
 assert.equal(parts.find(p=>p._partId===arm.id)._parentId,'char1');
});
test('Model edits update project render without stale cache',()=>{
 const {C,R}=harness(),model=C.preset('human'),asset={id:'a',type:'application/x-aurenix-character+json',data:JSON.stringify(model)};
 const a=R.characterAsset(asset);assert.equal(a.parts[0].color,model.parts[0].color);
 model.parts[0].color='#ff0000';asset.data=JSON.stringify(model);
 assert.equal(R.characterAsset(asset).parts[0].color,'#ff0000');
});
test('Model validation rejects malformed files and cyclic hierarchies',()=>{
 const {C}=harness(),doc=C.preset('human');
 assert.throws(()=>C.validate({...doc,format:'not-a-character'}),/compatível/);
 const cycle=C.copy(doc);cycle.parts[0].parent=cycle.parts[1].id;
 assert.throws(()=>C.validate(cycle),/ciclo/);
 const tooMany=C.copy(doc);
 for(let i=0;i<80;i++)tooMany.parts.push({...C.part('piece','cube',null,[0,0,0],[0,0,0],[1,1,1],'#ccddee')});
 assert.throws(()=>C.validate(tooMany),/80 peças/);
});
test('All authoring files are present in HTML and Android CI packaging',()=>{
 const index=source('index.html'),page=source('modelstudio.html'),editor=source('js/editor.js'),workflow=source('.github/workflows/engine-apk.yml');
 for(const p of ['js/character3d.js','js/model-bridge.js','js/model-bridge.css'])assert.ok(index.includes(p),p);
 for(const p of ['js/character3d.js','js/modelstudio.js','js/runtime.js'])assert.ok(page.includes(p),p);
 assert.ok(index.includes('menuModelStudio'));
 assert.ok(index.includes('tabModels'));
 assert.ok(editor.includes('characterSrc'));
 assert.ok(editor.includes("data:characterSrc+'\\n'+faceSrc+'\\n'+runtimeSrc"));
 assert.ok(editor.includes("inlineRuntime:characterSrc+'\\n'+faceSrc+'\\n'+runtimeSrc"));
 assert.ok(workflow.includes('cp index.html studio.html pixelstudio.html modelstudio.html'));
});
test('No paid service or executable code is needed in character assets',()=>{
 const {C,R}=harness(),doc=C.preset('human'),model=R.characterAsset({type:'application/x-aurenix-character+json',data:JSON.stringify(doc)});
 assert.ok(model.parts.every(p=>typeof p.position[0]==='number'));
 assert.equal(model.animations.length,0);
});
test('3D model editor and model bridge scripts compile',()=>{
 for(const name of ['js/character3d.js','js/modelstudio.js','js/model-bridge.js','js/runtime.js','js/editor.js'])
  assert.doesNotThrow(()=>new vm.Script(source(name),{filename:name}),name);
});