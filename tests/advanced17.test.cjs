const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {TextEncoder,TextDecoder}=require('node:util');
function harness(files=['js/advanced17-core.js','js/import17.js']){
 const window={},context={window,TextEncoder,TextDecoder,atob:global.atob,btoa:global.btoa,Uint8Array,DataView,Math,Date,console};
 for(const file of files)vm.runInNewContext(fs.readFileSync(file,'utf8'),context,{filename:file});
 return window;
}
test('Terrenos determinísticos, ferramentas de escultura e carregamento por região',()=>{
 const {AurenixAdvanced17:A}=harness();
 const w={size:25,cell:2,seed:44};A.worldInit(w);
 assert.equal(w.heights.length,625);
 assert.equal(JSON.stringify(w.heights),JSON.stringify(A.createTerrain(25,44)));
 const before=A.elevation(w,0,0);
 assert.ok(A.sculpt(w,0,0,'raise',2,.8)>0);
 assert.ok(A.elevation(w,0,0)>before);
 assert.ok(A.sculpt(w,0,0,'smooth',2,.5)>0);
 assert.ok(A.sculpt(w,0,0,'lower',2,.2)>0);
 assert.ok(A.sculpt(w,0,0,'flatten',2,.1)>0);
 assert.equal(A.elevation(w,2000,2000),null);
 const scene={mode:'3d',advanced:A.defaults()};scene.advanced.world={...scene.advanced.world,...w,enabled:true};
 const a=A.terrainObjects(scene,{target:[0,0,0]}),b=A.terrainObjects(scene,{target:[400,0,400]});
 assert.ok(a.length>0&&a.length<=220);assert.equal(b.length,0);
 const forest=A.scatter(scene,'forest',15,12);
 assert.ok(forest.some(x=>x.type==='cylinder')&&forest.some(x=>x.type==='cone'));
});
test('FSM de NPCs, perseguição e dano com resistência',()=>{
 const {AurenixAdvanced17:A}=harness();
 const npc={x:0,z:0,health:100,maxHealth:100,speed:3,sight:20,hearing:8},p={x:6,z:0};
 const st=A.npcTick(npc,p,.25);assert.equal(st.detected,true);
 assert.ok(npc.x>0);assert.ok(['chase','attack'].includes(st.state));
 const dealt=A.damage(npc,40,'physical');assert.equal(dealt.amount,40);assert.equal(npc.health,60);
 A.status(npc,'poison',2,3);A.tickStatus(npc,.5);assert.ok(npc.health<60);
});
test('Economia mantém sete raridades, sete poderes e compra com licença divina',()=>{
 const {AurenixAdvanced17:A}=harness();
 assert.equal(A.rarity.length,7);
 const shop=A.restock({marketSeed:500},17,24),again=A.restock({marketSeed:500},17,24);
 assert.equal(JSON.stringify(shop.map(x=>[x.type,x.rarity,x.power])),JSON.stringify(again.map(x=>[x.type,x.rarity,x.power])));
 assert.ok(shop.every(x=>x.rarity>=1&&x.rarity<=7&&x.power>=1&&x.power<=7));
 const divine=A.makeItem('staff',7,7),eco={coins:100000,licenseDivine:false},inv={slots:8,items:[]};
 assert.equal(A.buy(inv,eco,divine).ok,false);
 assert.equal(A.buy(inv,eco,divine,['divine']).ok,true);
 assert.equal(inv.items.length,1);
});
test('GLTF 2.0 triangular sem internet é convertido para OBJ e malha 3D',async()=>{
 const {AurenixImport17:I}=harness();
 const data=new Uint8Array(42),view=new DataView(data.buffer);
 const coords=[0,0,0,1,0,0,0,1,0];coords.forEach((x,i)=>view.setFloat32(i*4,x,true));
 [0,1,2].forEach((x,i)=>view.setUint16(36+i*2,x,true));
 const gltf={asset:{version:'2.0'},buffers:[{byteLength:42}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],nodes:[{name:'Triangle',mesh:0}],scenes:[{nodes:[0]}]};
 const geometry=I.convert(gltf,[data]);
 assert.equal(geometry.triangles,1);
 assert.match(geometry.obj,/f 1 2 3/);
 const packed=JSON.stringify(gltf),padding=4-(packed.length%4),jsonBytes=new TextEncoder().encode(packed+' '.repeat(padding%4));
 const glb=new Uint8Array(12+8+jsonBytes.length+8+data.length+2),v=new DataView(glb.buffer);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,glb.length,true);
 v.setUint32(12,jsonBytes.length,true);v.setUint32(16,0x4e4f534a,true);glb.set(jsonBytes,20);
 const off=20+jsonBytes.length;v.setUint32(off,data.length+2,true);v.setUint32(off+4,0x004e4942,true);glb.set(data,off+8);
 const decoded=I.parseGLB(glb);assert.equal(decoded.json.asset.version,'2.0');
 const buffers=await I.resources(decoded.json,{},'',decoded.binary);
 assert.equal(I.convert(decoded.json,buffers).triangles,1);
 await assert.rejects(I.resources({...gltf,buffers:[{uri:'https://remote.example/model.bin',byteLength:42}]},{},'',null),/remotos/);
});
test('Alpha 0.17 expõe painel mobile sem substituir editor e executa módulos no export',()=>{
 const read=p=>fs.readFileSync(p,'utf8');
 const html=read('index.html'),studio=read('studio.html'),editor=read('js/editor.js'),runtime=read('js/runtime.js');
 for(const page of [html,studio])for(const token of ['id="tabAdvanced17"','id="axAdvanced17Panel"','js/advanced17-core.js','js/import17.js','js/advanced17-editor.js','js/advanced17.css'])assert.ok(page.includes(token),token);
 for(const token of ['Importer.parseFile','advancedSrc','AurenixAdvancedEditor17?.init','AurenixAdvancedEditor17?.render'])assert.ok(editor.includes(token),token);
 for(const token of ['ADV.terrainObjects','ADV.elevation','ADV.npcTick','ADV.buy','gameSaveDB','navigator.getGamepads'])assert.ok(runtime.includes(token),token);
 assert.ok(!read('js/advanced17-core.js').includes('fetch('));
});
