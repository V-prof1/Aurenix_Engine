const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(scene){
 const nodes={},created=[],queue=[];
 const fakeCtx={save(){},restore(){},translate(){},scale(){},rotate(){},setTransform(){},clearRect(){},fillRect(){},beginPath(){},ellipse(){},arc(){},fill(){},stroke(){},fillText(){},strokeRect(){},moveTo(){},lineTo(){},setLineDash(){},drawImage(){},measureText(){return {width:10};}};
 function elem(id){
  return {id,style:{},children:[],textContent:'',clientWidth:480,clientHeight:270,width:480,height:270,
   classList:{add(){},remove(){}},addEventListener(){},remove(){},
   setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:122,height:122}},
   appendChild(el){this.children.push(el);},
   getContext(){return fakeCtx;}
  };
 }
 for(const id of ['game','hud','joystick','stick','jumpBtn','actionBtn'])nodes[id]=elem(id);
 const document={
  body:elem('body'),
  getElementById:id=>nodes[id]||null,
  querySelector:()=>null,addEventListener(){},
  createElement:tag=>{const x=elem(tag);created.push(x);return x;}
 };
 const win={addEventListener(){},__AURENIX_GAME__:null};
 let currentTime=0;
 const context={window:win,document,console,
  Math,Float32Array,Uint8Array,devicePixelRatio:1,innerWidth:480,innerHeight:270,
  performance:{now:()=>currentTime},requestAnimationFrame:fn=>{queue.push(fn);return queue.length;},
  setTimeout:()=>0,clearTimeout(){},atob:s=>Buffer.from(s,'base64').toString('binary')};
 vm.runInNewContext(fs.readFileSync('js/runtime.js','utf8'),context);
 const stop=win.AurenixRuntime.startGame(scene);
 const next=(time=16)=>{currentTime=time;const tick=queue.shift();assert.ok(tick,'RAF deve ser agendado');tick(time);};
 return {scene,nodes,created,context,stop,next,queue};
}
function player(){return {id:'player',name:'Player',type:'player2d',x:0,y:0,z:0,w:24,h:24,speed:200,visible:true,health:100,maxHealth:100};}
test('motor 2D inicia HUD, joystick customizado, coleta e dano sem scripts',()=>{
 const scene={id:'test',name:'Teste',mode:'2d',genre:'topdown',background:'#112233',objects:[
  player(),
  {id:'coin',name:'Moeda',type:'circle',visible:true,x:0,y:0,w:24,h:24,color:'#ffe077',components:[{type:'collectible',enabled:true,score:8,respawn:0}]},
  {id:'spike',name:'Espinho',type:'rect',visible:true,x:0,y:0,w:24,h:24,color:'#ff6868',components:[{type:'hazard',enabled:true,damage:15,cooldown:1}]}
 ],assets:[],gameSettings:{hud:true,showHealth:true,showScore:true,joystickSize:150,actionSize:82}};
 const h=harness(scene);
 assert.equal(h.nodes.joystick.style.width,'150px');
 h.next(16);
 assert.equal(scene.objects[1].visible,false);
 const score=h.created.find(x=>x.textContent==='✦ 8');
 assert.ok(score,'score should be visible and updated');
 const healthbar=h.created.find(x=>x.style.width==='85%');
 assert.ok(healthbar,'damage should update player health bar');
 h.stop();
});
test('componentes flutuação e rotação evoluem no loop e portal troca de cena',()=>{
 const portal={id:'portal',name:'Portal',type:'rect',visible:true,x:0,y:0,w:36,h:36,components:[{type:'portal',enabled:true,sceneName:'Segundo nível'}]};
 const level1={id:'l1',name:'Inicial',mode:'2d',objects:[player(),portal],background:'#112233',gravity:1100,gravity3d:18,genre:'topdown',grid:32,script:'',tilemap:{size:16,cells:{}}};
 const level2={id:'l2',name:'Segundo nível',mode:'2d',objects:[player(),{id:'spinner',name:'Giro',type:'rect',visible:true,x:20,y:20,w:20,h:20,components:[{type:'spin',speed:180,enabled:true}]}],background:'#334455',gravity:1100,gravity3d:18,genre:'topdown',grid:32,script:'',tilemap:{size:16,cells:{}}};
 const scene={...level1,objects:JSON.parse(JSON.stringify(level1.objects)),scenes:[level1,level2],activeSceneId:'l1',assets:[],gameSettings:{hud:false}};
 const h=harness(scene);
 h.next(16);
 assert.equal(scene.activeSceneId,'l2');
 assert.equal(scene.objects[1].id,'spinner');
 h.next(32);
 assert.ok(scene.objects[1].rotation>0,'Componente deve girar');
 h.stop();
});

test('mecanismos de cena e animação evitam reiniciar indefinidamente',()=>{
 const src=fs.readFileSync('js/runtime.js','utf8');
 assert.match(src,/found\.id===scene\.activeSceneId/);
 assert.match(src,/arr\.length<2/);
 assert.match(src,/current\?\.playing&&current\.clipId===clip\.id/);
 assert.match(src,/soundCooldown\.set\(asset\.id,now\)/);
});
