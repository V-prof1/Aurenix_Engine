const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function boot(){
 const context={window:{},console,Math,Date};
 for(const file of ['js/character3d.js','js/character-face13.js','js/character-motion14.js','js/character-tracks16.js','js/character-symmetry16.js'])
   vm.runInNewContext(fs.readFileSync(file,'utf8'),context,{filename:file});
 const C=context.window.AurenixCharacters;
 return {C,T:C.AurenixTracks,S:C.AurenixSymmetry,model:C.preset('blocky')};
}
test('Pares anatômicos permitidos, pares cruzados recusados e link reversível',()=>{
 const {C,S,model}=boot();
 const eyeL=model.parts.find(x=>x.name==='Olho esquerdo'),eyeR=model.parts.find(x=>x.name==='Olho direito');
 const arm=model.parts.find(x=>x.name==='Braço esquerdo');
 const leg=model.parts.find(x=>x.name==='Perna direita');
 const pupil=model.parts.find(x=>x.name==='Pupila direita');
 assert.equal(S.compatible(model,eyeL,eyeR),true);
 assert.equal(S.compatible(model,eyeL,arm),false);
 assert.equal(S.compatible(model,arm,leg),false);
 assert.equal(S.compatible(model,eyeL,pupil),false);
 assert.throws(()=>S.link(model,eyeL.id,arm.id),/mesma família/);
 S.link(model,eyeL.id,eyeR.id);
 assert.equal(S.partner(model,eyeR.id).id,eyeL.id);
 assert.equal(C.validate(model).mirrorLocks.length,1);
 assert.equal(S.unlink(model,eyeR.id),true);
 assert.equal(S.partner(model,eyeR.id),null);
});
test('Espelhamento bilateral move X oposto, Y igual, rotação invertida em YZ',()=>{
 const {S,model}=boot();
 const left=model.parts.find(x=>x.name==='Olho esquerdo'),right=model.parts.find(x=>x.name==='Olho direito');
 S.link(model,left.id,right.id);
 const before=S.snapshot(right);
 right.position[0]+=.21;right.position[1]+=.07;right.rotation[2]+=20;right.size[0]+=.12;right.color='#ff2200';
 assert.equal(S.mirror(model,right.id,before,S.snapshot(right)),true);
 assert.ok(Math.abs(left.position[0]+.39)<1e-5);
 assert.ok(Math.abs(left.position[1]-(before.position[1]+.07))<1e-5);
 assert.equal(left.rotation[2],-20);
 assert.ok(Math.abs(left.size[0]-right.size[0])<.0001);
 assert.equal(left.color,'#ff2200');
});
test('Timelines do rosto, corpo e objetos operam com frames independentes',()=>{
 const {C,T,model}=boot();
 const c=C.newClip(model,'teste');
 T.ensure(c);
 const eye=model.parts.find(p=>p.name==='Olho direito');
 T.capture(model,c,'body',.25,{pose:{[eye.id]:[0,35,0]}});
 T.capture(model,c,'face',.4,{expression:'wink'});
 T.capture(model,c,'objects',.6,{transforms:{[eye.id]:{position:[.8,.2,.4]}}});
 assert.ok(T.move(c,'body',.25,.3));
 assert.equal(c.tracks.body.some(x=>x.time===.3),true);
 assert.equal(c.tracks.face.some(x=>x.time===.4),true);
 assert.equal(c.tracks.objects.some(x=>x.time===.6),true);
 assert.equal(T.erase(c,'body',.3),true);
 assert.equal(c.tracks.body.some(x=>x.time===.3),false);
 assert.equal(c.tracks.face.some(x=>x.time===.4),true);
 const checked=C.validate(model);
 assert.ok(checked.animations[0].tracks.face.some(x=>x.expression==='wink'));
 assert.ok(checked.animations[0].tracks.objects.some(x=>x.transforms[eye.id]));
 assert.ok(C.expand(checked,{id:'preview',x:0,y:0,z:0},c.id,.6).length>0);
});
test('Interface da Alpha 0.16 oferece bloqueio e navegação direta entre frames',()=>{
 const html=fs.readFileSync('modelstudio.html','utf8'),js=fs.readFileSync('js/modelstudio.js','utf8');
 for(const id of ['ax16PairSelect','ax16PairLock','ax16PairUnlock','ax16TrackControls','ax16CaptureAll'])assert.ok(html.includes(id),id);
 for(const m of ['trackSeek','trackPointerDown','trackPointerMove','trackPointerUp','trackCreate','trackDelete','trackNavigate','Sym.mirror','Tracks.capture'])assert.ok(js.includes(m),m);
 for(const file of ['index.html','studio.html','modelstudio.html'])assert.ok(fs.readFileSync(file,'utf8').includes('js/character-tracks16.js'),file);
});