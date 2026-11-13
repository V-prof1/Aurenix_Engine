const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function studio(){
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const w={},d={getElementById:()=>null};
 vm.runInNewContext(fs.readFileSync('js/studio07.js','utf8'),{window:w,document:d,localStorage:storage,console,prompt(){},confirm(){}});
 return {S:w.AurenixStudio07,storage};
}
const copy=x=>JSON.parse(JSON.stringify(x));
test('cenas independentes preservam objetos, scripts e blocos',()=>{
 const {S}=studio(),p={mode:'2d',programming:'blocks',objects:[{id:'a',x:0,blocks:[]}],blocks:[{event:'start'}],background:'#222222',grid:32};
 S.ensureScenes(p);const a=p.activeSceneId;
 p.objects[0].x=99;
 const b=S.createScene(p,{name:'Floresta'});
 assert.equal(p.objects.length,0);assert.equal(p.scenes.length,2);
 p.objects.push({id:'b',x:12});S.syncScene(p);
 S.activateScene(p,a);
 assert.equal(p.objects[0].x,99);
 assert.equal(p.blocks[0].event,'start');
 S.activateScene(p,b.id);
 assert.equal(p.objects[0].id,'b');
 assert.equal(p.scenes.length,2);
});
test('duplicar, renomear, mover e excluir cenas preserva ao menos uma',()=>{
 const {S}=studio(),p={mode:'3d',objects:[{id:'p',x:1}]};
 S.ensureScenes(p);
 const s=S.createScene(p,{duplicate:true,name:'Duplicada'});
 assert.equal(p.objects.length,1);
 S.renameScene(p,s.id,'Deserto');assert.equal(p.scenes[1].name,'Deserto');
 assert.ok(S.moveScene(p,s.id,-1));
 S.deleteScene(p,s.id);assert.equal(p.scenes.length,1);
 assert.throws(()=>S.deleteScene(p,p.activeSceneId),/única cena/);
});
test('tilemap tem cor, física e coordenadas negativas; suporta apagar',()=>{
 const {S}=studio(),p={tilemap:{size:16,cells:{}}};
 const tile=S.snapCell(p,-2,-18);
 assert.equal(tile.x,-1);assert.equal(tile.y,-2);
 S.setTile(p,tile.x,tile.y,{color:'#44aa55',solid:true});
 assert.equal(S.tileAt(p,-1,-2).solid,true);
 S.setTile(p,tile.x,tile.y,{erase:true});
 assert.equal(S.tileAt(p,-1,-2),null);
 assert.throws(()=>S.setTile(p,2,2,{color:'javascript:alert(1)'}),/inválida/);
});
test('keyframes interpolam movimento, rotação e opacidade de 2D/3D',()=>{
 const {S}=studio(),o={id:'player',x:0,y:0,z:0,w:1,h:2,d:1,rotation:0,opacity:1},c=S.addClip(o,'Correr');
 o.x=20;o.y=6;o.opacity=.5;S.addKeyframe(o,c,1);
 assert.equal(S.interpolate(c,.5).x,10);
 assert.equal(S.interpolate(c,.5).y,3);
 assert.equal(S.interpolate(c,.5).opacity,.75);
 assert.equal(S.interpolate(c,1.5).x,10);
 c.loop=false;assert.equal(S.interpolate(c,9).x,20);
});
test('prefabs podem ser instanciados apenas no modo correto',()=>{
 const {S}=studio(),o={id:'original',name:'Inimigo',type:'rect',x:10,y:0,script:'self.x += dt;'};const p={programming:'script',mode:'2d',objects:[]};
 const entry=S.savePrefab(o,'script'),newObj=S.createFromPrefab(p,entry.id,()=>'outraid');
 assert.equal(newObj.id,'outraid');assert.equal(newObj.script,o.script);assert.equal(p.objects.length,1);
 p.programming='blocks';assert.throws(()=>S.createFromPrefab(p,entry.id),/outro modo/);
});
test('modo blocos compila troca de cenas e animações sem script editável',()=>{
 const window={},document={addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('js/blocks.js','utf8'),{window,document,console});
 const B=window.AurenixBlocks,p={programming:'blocks',mode:'2d',objects:[{blocks:[{event:'start',id:'start',actions:[{op:'nextScene'}]}]}],scenes:[{id:'a',objects:[]},{id:'b',objects:[{blocks:[{event:'start',id:'start',actions:[{op:'playAnimation',value:'Correr'}]}]}]}],activeSceneId:'a'};
 B.compileAll(p);
 assert.match(p.objects[0].script,/api\.nextScene/);
 assert.match(p.scenes[1].objects[0].script,/api\.playAnimation/);
});
test('UI usa novos painéis, runtime tem troca de cena e exportação mobile',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const editor=fs.readFileSync('js/editor.js','utf8');
 const runtime=fs.readFileSync('js/runtime.js','utf8');
 for(const id of ['tabScenes','tabTiles','tabAnimation','tabPrefabs','menuScenes','menuDebug'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('js/studio07.js'));
 assert.ok(editor.includes('function prepareProject()'));
 assert.ok(runtime.includes('loadScene:name=>requestScene(name)'));
 assert.ok(runtime.includes('solidTilesNear(player)'));
 assert.ok(runtime.includes('animateObject(o,dt)'));
});

test('navegação do celular permanece acima do dimmer e painel recarrega tiles',()=>{
 const css=fs.readFileSync('style.css','utf8');
 const editor=fs.readFileSync('js/editor.js','utf8');
 assert.match(css,/\.mobile-nav\{position:relative;z-index:56!important\}/);
 assert.ok(editor.includes("if(drag?.kind==='tile')S?.renderTiles()"));
 assert.ok(editor.includes("if(tab==='tiles')S?.renderTiles()"));
});

test('projeto HTML5 externo não é convertido em projeto visual',()=>{
 const {S}=studio(),p={mode:'html5',external:{entry:'index.html',files:{}},objects:[]};
 assert.deepEqual(Array.from(S.ensureScenes(p)),[]);
 assert.equal(p.scenes,undefined);
});
