const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const source=p=>fs.readFileSync(p,'utf8');
function setup(mockFetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({})})){
 const window={},mem=new Map(),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};
 const context={window,fetch:mockFetch,localStorage:storage,TextEncoder,ArrayBuffer,Uint8Array,console,Math,Date,
  setTimeout,clearTimeout,btoa:s=>Buffer.from(s,'binary').toString('base64'),URLSearchParams};
 vm.runInNewContext(source('js/github-build.js'),context);
 vm.runInNewContext(source('js/github-account.js'),context);
 return {B:window.AurenixGithubBuild,G:window.AurenixGithubAccount,storage,mem};
}
test('Gerador inclui workflow GitHub, assets, versao, orientacao e nao precisa de token',()=>{
 const {B}=setup(),p=B.plan({gameFiles:[{name:'index.html',data:'<!doctype html>'},{name:'js/runtime.js',data:'console.log(1)'}],gameName:'Jogo Teste',repoName:'Meu Game',version:'2.1.3',orientation:'landscape'});
 const names=Array.from(p.files,p=>p.path);
 for(const file of ['www/index.html','www/js/runtime.js','package.json','capacitor.config.json','aurenix-export.json','scripts/configure_android.py','.github/workflows/aurenix-apk.yml','README-AURENIX.md'])assert.ok(names.includes(file),file);
 assert.equal(p.version,'2.1.3');assert.equal(p.appId,'com.aurenix.games.meugame');
 const owned=B.plan({gameFiles:[{name:'index.html',data:'OK'}],repoName:'meu-game',ownerName:'outro-usuario'});
 assert.equal(owned.appId,'com.aurenix.games.outrousuariomeugame');
 const config=JSON.parse(p.files.find(f=>f.path==='aurenix-export.json').data);
 assert.equal(config.orientation,'landscape');assert.equal(config.versionCode,20103);
 const workflow=p.files.find(f=>f.path.includes('/workflows/')).data;
 assert.match(workflow,/workflow_dispatch/);
 assert.match(workflow,/assembleDebug/);
 assert.match(workflow,/upload-artifact/);
 assert.match(workflow,/gh release create/);
});
test('Protecao de caminhos bloqueia travessia, entradas perigosas e duplicatas',()=>{
 const {B}=setup();
 assert.throws(()=>B.normalizePath('../privado.txt'),/inseguro/);
 assert.throws(()=>B.normalizePath('dir/../segredo'),/inseguro/);
 assert.throws(()=>B.normalizePath('x//y'),/inseguro/);
 assert.equal(B.normalizePath('assets\\imagem.png'),'assets/imagem.png');
 assert.throws(()=>B.plan({gameFiles:[{name:'index.html',data:'ok'},{name:'index.html',data:'outro'}]}),/repetido/);
 assert.throws(()=>B.plan({gameFiles:[{name:'main.html',data:'ok'}]}),/index.html/);
 assert.throws(()=>B.plan({gameFiles:[{name:'index.html',data:'ok'}],version:'abc'}),/versão/i);
});
test('Script do workflow configura Android sem Python syntax errors',()=>{
 const {B}=setup(),proc=cp.spawnSync('python3',['-c','import ast,sys; ast.parse(sys.stdin.read())'],{input:B.androidScript,encoding:'utf8'});
 assert.equal(proc.status,0,proc.stderr);
});
test('Autenticacao, criacao de repositorio e commit atomic funcionam com API simulada',async()=>{
 const calls=[],token='ghp_'+'a'.repeat(32),sha='a'.repeat(40);
 let newRepo=null;
 const response=(obj,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(obj)});
 const mock=async(url,options={})=>{
  const pathname=new URL(url).pathname,method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
  calls.push({pathname,method,body,headers:options.headers});
  if(pathname==='/user')return response({login:'criadordeJogos'});
  if(pathname==='/user/repos'&&method==='POST'){
   newRepo={name:body.name,full_name:'criadordeJogos/'+body.name,owner:{login:'criadordeJogos'},default_branch:'main',permissions:{push:true},private:body.private};
   return response(newRepo,201);
  }
  if(pathname==='/user/repos')return response(newRepo?[newRepo]:[]);
  if(pathname.endsWith('/git/ref/heads/main'))return response({object:{sha}});
  if(pathname.endsWith('/git/commits/'+sha))return response({tree:{sha}});
  if(pathname.endsWith('/git/blobs'))return response({sha:'b'.repeat(40)},201);
  if(pathname.endsWith('/git/trees'))return response({sha:'c'.repeat(40)},201);
  if(pathname.endsWith('/git/commits')&&method==='POST')return response({sha:'d'.repeat(40)},201);
  if(pathname.endsWith('/git/refs/heads/main')&&method==='PATCH')return response({ref:'refs/heads/main'});
  if(pathname.endsWith('/actions/runs'))return response({workflow_runs:[{id:23,run_number:4,name:'Aurenix APK do Jogo',status:'completed',conclusion:'success'}]});
  if(pathname.endsWith('/actions/runs/23/artifacts'))return response({artifacts:[{id:45,name:'jogo-aurenix-apk',expired:false}]});
  if(pathname.endsWith('/releases/tags/aurenix-4'))return response({assets:[{name:'Aurenix-Jogo.apk',browser_download_url:'https://github.com/criadordeJogos/meu-jogo/releases/download/aurenix-4/Aurenix-Jogo.apk'}]});
  throw Error('Chamada inesperada '+method+' '+pathname);
 };
 const {B,G,mem}=setup(mock);
 await G.connect(token);
 assert.equal(G.state().user.login,'criadordeJogos');
 const p=B.plan({gameFiles:[{name:'index.html',data:'html'}],gameName:'Meu Jogo',repoName:'meu-jogo'});
 await G.sendPlan({createNew:true,newRepoName:'meu-jogo',privateRepo:true,plan:p});
 const run=G.state().lastBuild;
 assert.equal(run.repo,'meu-jogo');assert.equal(run.sha,'d'.repeat(40));
 assert.ok(calls.some(c=>c.pathname==='/user/repos'&&c.method==='POST'&&c.body.private===true));
 assert.ok(calls.some(c=>c.pathname.endsWith('/git/trees')&&c.body.tree.some(e=>e.path==='.github/workflows/aurenix-apk.yml')));
 assert.ok(calls.some(c=>c.pathname.endsWith('/git/refs/heads/main')&&c.method==='PATCH'&&c.body.force===false));
 const stored=JSON.stringify([...mem.entries()]);
 assert.ok(!stored.includes(token),'Token nao pode ficar no armazenamento');
 assert.ok(!JSON.stringify(p).includes(token),'Token nao pode entrar nos arquivos do jogo');
 await G.checkBuild();
 assert.equal(G.state().lastBuild.status,'success');
 assert.match(G.state().lastBuild.releaseUrl,/\.apk$/);
 assert.equal(G.state().lastBuild.artifactId,45);
 G.forget();assert.equal(G.state().connected,false);
});
test('UI fornece acesso no celular e encerra usando o botao Voltar',()=>{
 assert.match(source('index.html'),/ALPHA 0\.19/);
 assert.match(source('js/home.js'),/ALPHA 0\.19/);
 const html=source('index.html'),editor=source('js/editor.js'),back=source('js/back.js'),tb=source('js/toolbox08.js');
 for(const file of ['github-build.js','github-account.js','github-publisher-ui.js','github-oauth-config.js','github-publisher.css'])assert.ok(html.includes(file),file);
 assert.ok(html.includes('menuGithubAPK'));
 assert.ok(editor.includes('AurenixGithubUI?.init'));
 assert.ok(back.includes('AurenixGithubUI?.isOpen'));
 assert.ok(tb.includes('githubAPK'));
});
test('JavaScript dos novos modulos compila com sintaxe valida',()=>{
 for(const file of ['js/github-build.js','js/github-account.js','js/github-publisher-ui.js','js/editor.js'])
 assert.doesNotThrow(()=>new vm.Script(source(file),{filename:file}),file);
});
