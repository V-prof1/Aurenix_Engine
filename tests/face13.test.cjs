const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
function harness(){
 const window={},ctx={window,Math,Date,console,Float32Array,TextDecoder,TextEncoder,Uint8Array,atob:s=>Buffer.from(s,'base64').toString('binary')};
 for(const f of ['js/character3d.js','js/character-face13.js','js/runtime.js'])vm.runInNewContext(read(f),ctx,{filename:f});
 return {C:window.AurenixCharacters,R:window.AurenixRuntime};
}
test('Expressões faciais preservam estilo quadradinho e peças articuladas',()=>{
 const {C}=harness();
 assert.equal(C.FACE_EXPRESSIONS.length,11);
 const avatar=C.preset('blocky');assert.equal(avatar.parts.find(p=>p.name==='Cabeça').type,'cube');
 assert.equal(avatar.parts.find(p=>p.name==='Braço esquerdo').type,'cube');
 for(const kind of ['blocky','human','robot','creature']){
  const model=C.preset(kind),checked=C.validate(model);
  assert.equal(checked.face.expression,'neutral');
  assert.ok(checked.parts.some(p=>p.faceRole==='browL'));
  assert.ok(checked.parts.some(p=>p.faceRole==='browR'));
  assert.ok(checked.parts.some(p=>p.faceRole==='mouth'));
  assert.ok(checked.parts.every(p=>p.type!=='skinnedMesh'));
  assert.ok(checked.parts.length<C.MAX_PARTS);
 }
});
test('Face muda olhos, boca, sobrancelhas e mantém peça base intacta',()=>{
 const {C}=harness(),m=C.preset('human'),base=JSON.stringify(m.parts);
 const root={id:'av',x:0,y:0,z:0,visible:true,modelScale:1};
 const a=C.expand(m,root,'',0,null,'neutral'),b=C.expand(m,root,'',0,null,'surprised');
 const mouth=m.parts.find(x=>x.faceRole==='mouth'),eye=m.parts.find(x=>x.faceRole==='eyeL');
 const pa=a.find(x=>x._partId===mouth.id),pb=b.find(x=>x._partId===mouth.id);
 assert.ok(pb._modelMatrix[5]>pa._modelMatrix[5]*2,'Boca deve abrir em surpresa');
 const ea=a.find(x=>x._partId===eye.id),eb=C.expand(m,root,'',0,null,'blink').find(x=>x._partId===eye.id);
 assert.ok(eb._modelMatrix[5]<ea._modelMatrix[5]*.2,'Piscar fecha o olho');
 assert.equal(JSON.stringify(m.parts),base,'Expressões não devem alterar a malha original');
});
test('Frame registra expressão e interpolação sem perder keyframes antigos',()=>{
 const {C}=harness(),model=C.preset('robot'),clip=C.newClip(model,'Conversa');
 assert.equal(clip.frames[0].expression,'neutral');
 const pose=Object.fromEntries(model.parts.map(p=>[p.id,[...p.rotation]]));
 C.capture(model,clip,.5,pose,'talk');
 assert.equal(clip.frames.find(f=>f.time===.5).expression,'talk');
 const checked=C.validate(JSON.parse(JSON.stringify(model)));
 assert.equal(checked.animations[0].frames.find(f=>f.time===.5).expression,'talk');
 const mouth=checked.parts.find(p=>p.faceRole==='mouth'),root={id:'a',visible:true};
 const neutral=C.expand(checked,root,clip.id,0),talk=C.expand(checked,root,clip.id,.5);
 assert.ok(talk.find(p=>p._partId===mouth.id)._modelMatrix[5]>neutral.find(p=>p._partId===mouth.id)._modelMatrix[5]);
});
test('Sorrir, chorar, olhar desconfiado e piscar com olho individual',()=>{
 const {C}=harness(),m=C.preset('human');
 const happy=C.getFaceAt(m,'',0,'happy'),sad=C.getFaceAt(m,'',0,'sad'),wink=C.getFaceAt(m,'',0,'wink');
 assert.ok(happy.smile>sad.smile);
 assert.ok(sad.browTilt>0);
 assert.ok(wink.eyeL<wink.eyeR);
 assert.ok(C.getFaceAt(m,'',0,'suspicious').eyeL<C.getFaceAt(m,'',0,'suspicious').eyeR);
});
test('Cinco modelos low-poly de cenário usam hierarquia e porta articulada',()=>{
 const {C,R}=harness();
 for(const type of ['crate','tree','lamp','door','chair']){
  const doc=C.validate(C.preset(type)),assets=[{id:type,type:'application/x-aurenix-character+json',data:JSON.stringify(doc)}];
  assert.ok(doc.parts.length>=3,type);
  assert.ok(doc.parts.length<=C.MAX_PARTS);
  const meshes=R.expandedSceneObjects({assets,objects:[{id:'object',type:'character3d',assetId:type,visible:true}]});
  assert.equal(meshes.length,doc.parts.length,type);
 }
 const door=C.preset('door');assert.equal(door.animations[0].name,'Abrir porta');
 const a=C.getPose(door,door.animations[0].id,0),b=C.getPose(door,door.animations[0].id,1);
 const leaf=door.parts.find(p=>p.name==='Folha da porta');
 assert.ok(Math.abs(a[leaf.id][1]-b[leaf.id][1])>=80);
});
test('Modelos 0.12 sem metadados de rosto continuam abrindo',()=>{
 const {C}=harness(),doc=C.preset('human');
 delete doc.face;for(const p of doc.parts)delete p.faceRole;
 for(const c of doc.animations)for(const f of c.frames)delete f.expression;
 const migrated=C.validate(doc);
 assert.equal(migrated.face.expression,'neutral');
 assert.ok(migrated.parts.some(p=>p.faceRole==='eyeL'));
});
test('Aplicativo e exportação carregam plugin de rosto antes do motor 3D',()=>{
 const editor=read('js/editor.js'),html=read('index.html'),modelHTML=read('modelstudio.html'),cache=read('sw.js');
 assert.ok(html.includes('js/character-face13.js'));
 assert.ok(modelHTML.includes('js/character-face13.js'));
 assert.ok(editor.includes("fetch('js/character-face13.js')"));
 assert.ok(editor.includes("characterSrc+'\\n'+faceSrc+'\\n'+motionSrc+'\\n'+tracksSrc+'\\n'+symmetrySrc+'\\n'+advancedSrc+'\\n'+runtimeSrc"));
 assert.ok(cache.includes('character-face13.js'));
 const config=JSON.parse(read('capacitor.config.json'));
 assert.equal(config.appId,'com.aurenix.engine.alpha014');
});
test('Aurenix 0.13 está disponível offline e JavaScript novo compila',()=>{
 const script=read('js/character-face13.js'),studio=read('js/modelstudio.js'),page=read('modelstudio.html');
 assert.doesNotThrow(()=>new vm.Script(script));
 assert.doesNotThrow(()=>new vm.Script(studio));
 for(const type of ['happy','sad','angry','surprised','scared','sleepy','blink','wink','suspicious','talk'])assert.ok(page.includes('data-expression="'+type+'"'));
 for(const action of ['wave','jump','hit','dance','blink','talk'])assert.ok(page.includes('data-auto="'+action+'"'));
});
