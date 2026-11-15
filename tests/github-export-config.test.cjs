const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
function build(){
 const w={},ctx={window:w,TextEncoder,Uint8Array,ArrayBuffer,btoa:s=>Buffer.from(s,'binary').toString('base64')};
 vm.runInNewContext(fs.readFileSync('js/github-build.js','utf8'),ctx);
 return w.AurenixGithubBuild;
}
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aurenix-android-test-'));
 const manifest=path.join(dir,'android/app/src/main/AndroidManifest.xml'),gradle=path.join(dir,'android/app/build.gradle'),script=path.join(dir,'scripts/configure_android.py');
 for(const p of [manifest,gradle,script])fs.mkdirSync(path.dirname(p),{recursive:true});
 fs.writeFileSync(manifest,'<?xml version="1.0" encoding="utf-8"?><manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><activity android:name=".MainActivity" android:exported="true" /></application></manifest>');
 fs.writeFileSync(gradle,'android { defaultConfig { versionCode 1 versionName "1.0" } }');
 return {dir,manifest,gradle,script};
}
test('Aplicar configuração Android altera versão e paisagem no manifesto',()=>{
 const B=build(),temp=fixture();
 try{
  const p=B.plan({gameFiles:[{name:'index.html',data:'OK'}],gameName:'Meu Jogo',repoName:'teste-android',version:'2.4.6',orientation:'landscape'});
  const file=key=>p.files.find(f=>f.path===key).data;
  fs.writeFileSync(path.join(temp.dir,'aurenix-export.json'),file('aurenix-export.json'));
  fs.writeFileSync(temp.script,file('scripts/configure_android.py'));
  const result=cp.spawnSync('python3',[temp.script],{cwd:temp.dir,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const manifest=fs.readFileSync(temp.manifest,'utf8'),gradle=fs.readFileSync(temp.gradle,'utf8');
  assert.match(manifest,/screenOrientation="landscape"/);
  assert.match(gradle,/versionCode 20406/);
  assert.match(gradle,/versionName "2.4.6"/);
 }finally{fs.rmSync(temp.dir,{recursive:true,force:true});}
});
test('Orientação automática não força atributo na AndroidManifest',()=>{
 const B=build(),temp=fixture();
 try{
  const p=B.plan({gameFiles:[{name:'index.html',data:'OK'}],gameName:'Teste',version:'1.0.0',orientation:'auto'});
  fs.writeFileSync(path.join(temp.dir,'aurenix-export.json'),p.files.find(f=>f.path==='aurenix-export.json').data);
  fs.writeFileSync(temp.script,p.files.find(f=>f.path==='scripts/configure_android.py').data);
  const out=cp.spawnSync('python3',[temp.script],{cwd:temp.dir,encoding:'utf8'});
  assert.equal(out.status,0,out.stderr);
  assert.doesNotMatch(fs.readFileSync(temp.manifest,'utf8'),/screenOrientation/);
 }finally{fs.rmSync(temp.dir,{recursive:true,force:true});}
});
