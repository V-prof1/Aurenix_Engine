const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
function gizmo(){
 const window={};
 vm.runInNewContext(read('js/gizmo3d.js'),{window,Math,Number});
 return window.AurenixGizmo;
}
test('Mover por eixo respeita rotação local e grade de 0,25',()=>{
 const g=gizmo(),p={x:0,y:0,z:0,w:2,h:2,d:2,rx:0,ry:0,rz:0};
 let next=g.gestureValue(p,'x',1,'translate',2.14,false);
 assert.equal(next.x,2.14);assert.equal(next.z,0);
 next=g.gestureValue(p,'z',1,'translate',1.13,true);
 assert.equal(next.z,1.25);
 const rotated={...p,ry:90};
 next=g.gestureValue(rotated,'x',1,'translate',2,false);
 assert.ok(Math.abs(next.z+2)<.001,'X local vira -Z depois de rotação Y=90°');
});
test('Escalar pela face conserva a face oposta sem valores negativos',()=>{
 const g=gizmo(),p={x:0,y:0,z:0,w:2,h:2,d:2,rx:0,ry:0,rz:0};
 let n=g.gestureValue(p,'x',1,'resize',2,false);
 assert.equal(n.w,4);assert.equal(n.x,1);
 assert.equal(n.x-n.w/2,-1);
 n=g.gestureValue(p,'y',-1,'resize',2,false);
 assert.equal(n.h, .1);
 assert.ok(Math.abs(n.y+n.h/2-1)<.00001);
});
test('Girar em X/Y/Z dá controles separados e encaixe de 5 graus',()=>{
 const g=gizmo(),p={x:0,y:0,z:0,w:2,h:2,d:2,rx:0,ry:13,rz:0};
 const n=g.gestureValue(p,'y',1,'rotate',27,true);
 assert.equal(n.ry,38);assert.equal(n.rx,0);
 const m=g.gestureValue(p,'x',1,'rotate',20,false);
 assert.equal(m.rx,20);assert.equal(m.ry,13);
});
function animationHarness(){
 const output={innerHTML:'',value:'',textContent:''},elements={axAnimations:output};
 const document={
  getElementById:id=>elements[id]||null,
  addEventListener(){},querySelectorAll(){return []}
 };
 const queued=[],window={},localStorage={getItem(){return null},setItem(){}};
 let now=0;
 const context={window,document,localStorage,console,Math,Number,performance:{now:()=>now},
  requestAnimationFrame:cb=>{queued.push(cb);return queued.length;},cancelAnimationFrame:()=>{},setTimeout:()=>0,clearTimeout(){}};
 vm.runInNewContext(read('js/studio07.js'),context);
 const p={mode:'3d',programming:'script',objects:[]};
 const o={id:'cube',name:'Cube',x:0,y:0,z:0,w:1,h:1,d:1,opacity:1,visible:true};
 p.objects.push(o);
 const S=window.AurenixStudio07;
 S.initialize({getProject:()=>p,getSelected:()=>o,onVisualUpdate(){},onChange(){},onHistory(){},toast(){}});
 return {S,p,o,output,queued,elements,setNow:t=>now=t};
}
test('Timeline mobile exibe scrub, keyframes, pausa e velocidade',()=>{
 const {S,o,output}=animationHarness();
 const c=S.addClip(o,'Idle');o.x=10;S.addKeyframe(o,c,1);
 S.renderAnimations();
 assert.match(output.innerHTML,/ax09Scrub/);
 assert.match(output.innerHTML,/axClipEase/);
 assert.match(output.innerHTML,/axClipSpeed/);
 assert.match(output.innerHTML,/ax09-timeline-track/);
 S.scrubTo(.5);assert.equal(o.x,5);assert.equal(S.isPreviewing(),true);
 S.stopPreview();assert.equal(o.x,10);assert.equal(S.isPreviewing(),false);
});
test('Preview animado avança quadros ao executar requestAnimationFrame',()=>{
 const {S,o,queued,setNow}=animationHarness();
 const clip=S.addClip(o,'Walk');clip.loop=false;clip.speed=2;
 o.x=20;S.addKeyframe(o,clip,1);
 S.playPreview();
 assert.equal(S.isPreviewing(),true);
 assert.ok(queued.length>0);
 setNow(250);
 queued.shift()(250);
 assert.equal(o.x,10);
 setNow(500);
 queued.shift()(500);
 assert.equal(o.x,20);
 S.stopPreview();
 assert.equal(o.x,20);
});
test('Interpolação respeita easing suave, acelerada, desacelerada e step',()=>{
 const {S,o}=animationHarness(),c=S.addClip(o,'Move');
 o.x=10;S.addKeyframe(o,c,1);c.loop=false;
 c.ease='in';assert.equal(S.interpolate(c,.5).x,2.5);
 c.ease='out';assert.equal(S.interpolate(c,.5).x,7.5);
 c.ease='step';assert.equal(S.interpolate(c,.5).x,0);
 c.ease='smooth';assert.equal(S.interpolate(c,.5).x,5);
});
test('UI Android usa espaço seguro e controles 3D por toque',()=>{
 const html=read('index.html'),css=read('js/mobile09.css'),editor=read('js/editor.js');
 assert.match(html,/data-tool="translate"/);
 assert.match(html,/data-tool="rotate"/);
 assert.match(html,/data-tool="resize"/);
 assert.match(html,/js\/mobile09.js/);
 assert.match(css,/ax09-keyboard-open/);
 assert.match(css,/ax09Scrub/);
 assert.match(editor,/gizmo3d\?\.isDragging/);
 assert.match(editor,/pointerMap\.clear\(\)/);
 assert.match(editor,/function prepareProject\(\)\{S\?\.stopPreview/);
});
test('Tela inicial 0.9 e panorâmica com dois dedos continuam disponíveis',()=>{
 assert.ok(read('js/home.js').includes('ALPHA 0.14'));
 assert.ok(read('js/editor.js').includes('function getPinchState()'));
 assert.ok(read('js/editor.js').includes('camera3.target[0]=drag.cam3.target[0]'));
 assert.ok(read('js/gizmo3d.js').includes('getCamera?.()?.yaw'));
});
test('Javascript de todos os novos módulos compila sem erros',()=>{
 for(const file of ['js/gizmo3d.js','js/mobile09.js','js/studio07.js','js/runtime.js','js/editor.js']){
  assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}),file);
 }
});
