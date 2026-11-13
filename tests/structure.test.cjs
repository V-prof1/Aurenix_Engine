const test=require('node:test');const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('scripts da interface e pixel studio compilam sem erro de sintaxe',()=>{
 for(const path of ['js/home.js','js/editor.js','js/runtime.js','js/gizmo3d.js','js/file-save.js']){
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path,'utf8'),{filename:path}),path);
 }
 const html=fs.readFileSync('pixelstudio.html','utf8'),match=[...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)];
 assert.equal(match.length,1);assert.doesNotThrow(()=>new vm.Script(match[0][1],{filename:'pixelstudio.inline.js'}));
});
test('configuração mantém identificador paralelo para não apagar dados do APK 0.3',()=>{
 const app=JSON.parse(fs.readFileSync('capacitor.config.json','utf8'));
 assert.equal(app.appId,'com.aurenix.engine.alpha04');
});
test('editor inclui ancoragem e seleção bloqueada persistentes',()=>{
 const editor=fs.readFileSync('js/editor.js','utf8');
 for(const str of ['anchored','editorLocked','wasSelected','initializeHome','window.AurenixFiles'])assert.ok(editor.includes(str),str);
});
