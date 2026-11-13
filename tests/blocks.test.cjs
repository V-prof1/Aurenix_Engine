const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const window={};
vm.runInNewContext(fs.readFileSync('js/blocks.js','utf8'),{window,document:{addEventListener(){}},console});
const B=window.AurenixBlocks;
test('compila eventos e movimentos do editor visual',()=>{
const project={programming:'blocks',mode:'2d',objects:[{id:'p1',name:'Player',blocks:[{id:'event1',event:'key',value:'e',actions:[{op:'moveX',value:90}]}]}]};
B.compileAll(project);
assert.match(project.objects[0].script,/isKeyDown/);
const fn=new Function('self','scene','api','dt',project.objects[0].script);
const self={x:0},api={isKeyDown:k=>k==='e'};
fn(self,project,api,1);assert.equal(self.x,90);
});
test('projetos de script não são modificados',()=>{
const p={programming:'script',mode:'2d',script:'original',objects:[{script:'self.x=1;'}]};
B.compileAll(p);assert.equal(p.script,'original');assert.equal(p.objects[0].script,'self.x=1;');
});
test('dados de usuário não injetam javascript no código gerado',()=>{
const p={programming:'blocks',mode:'2d',objects:[{blocks:[{event:'always',actions:[{op:'text',value:'";throw Error("X");//'}]}]}]};
B.compileAll(p);assert.doesNotThrow(()=>new Function('self','scene','api','dt',p.objects[0].script));
});
test('eventos de iniciar executam uma única vez',()=>{
const p={programming:'blocks',mode:'2d',objects:[{blocks:[{id:'once',event:'start',actions:[{op:'moveX',value:40}]}]}]};
B.compileAll(p);const fn=new Function('self','scene','api','dt',p.objects[0].script),self={x:0};
fn(self,p,{},1);fn(self,p,{},1);assert.equal(self.x,40);
});
