const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
const code=p=>fs.readFileSync(p,'utf8');
function harness(){
 const window={crypto:webcrypto};const storage=new Map();
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 const ctx={window,crypto:webcrypto,TextEncoder,Uint8Array,Math,Date,ArrayBuffer,URLSearchParams,localStorage,console};
 vm.runInNewContext(code('js/cloud-drive.js'),ctx,{filename:'cloud-drive.js'});
 return {C:window.AurenixCloudCore,storage,localStorage,ctx,window};
}
const project=(id='abc',updated=100,x=1)=>({id,name:'Meu jogo',mode:'2d',objects:[{id:'1',x}],assets:[{id:'img1',name:'imagem.png',data:'data:image/png;base64,YQ=='}],updated});
const pixel=(id='pix1')=>({id,name:'Sprite teste',size:16,frames:[{layers:[]}],fps:8});
function drive(){
 const records=new Map(),calls=[],snap=()=>[...records.values()].map(x=>({...x.file}));
 return {records,calls,api:{
  listAll:async()=>snap(),
  download:async r=>{const x=[...records.values()].find(v=>v.file.id===r.id);if(!x)throw Error('remote missing');return x.text;},
  upload:async(type,id,text,remote)=>{
   const name='aurenix-'+type+'-'+id+'.json';
   const existing=records.get(name);
   calls.push({type,id,remote:remote?.id||'',text});
   const version=String((Number(existing?.file.version)||0)+1);
   const file={id:existing?.file.id||'gd-'+(records.size+1),name,version,modifiedTime:'2026-11-16T17:10:00Z',
    description:'Aurenix Cloud - '+JSON.parse(text).title,size:Buffer.byteLength(text)};
   records.set(name,{file,text});return {...file};
  }
 }};
}
test('Formato Aurenix Cloud preserva cenas, sprites, audio e scripts sem OAuth',()=>{
 const {C}=harness(),p=project(),art=pixel();
 p.scenes=[{id:'a',script:'api.spawn("circle")',objects:[{x:1}],blocks:[]}];
 p.assets.push({id:'audio',type:'audio/wav',data:'data:audio/wav;base64,AAAA'});
 const str=C.packageData('project',p),restored=C.unpack('project',str);
 assert.equal(restored.scenes[0].script,'api.spawn("circle")');
 assert.equal(restored.assets.length,2);
 assert.equal(C.unpack('pixel',C.packageData('pixel',art)).name,art.name);
 const settings={id:'settings',name:'Config',theme:{id:2},prefabs:[{name:'Boss'}]};
 assert.equal(C.unpack('settings',C.packageData('settings',settings)).prefabs[0].name,'Boss');
 assert.throws(()=>C.unpack('project','{}'),/formato|Formato/);
 assert.throws(()=>C.packageData('project',{id:'../../password',mode:'2d',objects:[],assets:[]}),/ID/);
});
test('Primeiro dispositivo faz backup, segundo restaura sem perder assets',async()=>{
 const {C}=harness(),d=drive();
 const a=C.manager({api:d.api,getUser:()=>({id:'googleuserA'}),storage:makeStore()});
 const b=C.manager({api:d.api,getUser:()=>({id:'googleuserA'}),storage:makeStore()});
 const p=project(),created=await a.push('project',p);
 assert.equal(created.action,'created');assert.equal(d.records.size,1);
 const files=await b.list();assert.equal(files.length,1);
 const cloud=await b.pull('project',files[0]);assert.equal(cloud.objects[0].x,1);
 assert.equal(cloud.assets[0].data,p.assets[0].data);
 await b.markPulled('project',cloud,files[0]);
 assert.equal((await b.push('project',cloud)).action,'same');
});
function makeStore(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test('Conflito remoto e local divergentes nao sobrescreve o backup',async()=>{
 const {C}=harness(),d=drive(),s1=makeStore(),s2=makeStore();
 const m1=C.manager({api:d.api,storage:s1,getUser:()=>({id:'googleA'})});
 const m2=C.manager({api:d.api,storage:s2,getUser:()=>({id:'googleA'})});
 const p=project();
 await m1.push('project',p);
 const file=(await m2.list())[0],copy=await m2.pull('project',file);
 await m2.markPulled('project',copy,file);
 copy.objects[0].x=9;copy.updated=250;await m2.push('project',copy);
 p.objects[0].x=5;p.updated=350;
 const conflict=await m1.push('project',p);
 assert.equal(conflict.action,'conflict');
 assert.equal(C.unpack('project',d.records.get('aurenix-project-abc.json').text).objects[0].x,9);
 assert.equal(d.calls.length,2,'conflito nao dispara terceiro upload');
 await m1.forceUpload('project',p);
 assert.equal(C.unpack('project',d.records.get('aurenix-project-abc.json').text).objects[0].x,5);
});
test('Uma nuvem existente sem historico local exige revisao antes de sobrescrever',async()=>{
 const {C}=harness(),d=drive();
 const a=C.manager({api:d.api,storage:makeStore(),getUser:()=>({id:'id-1'})});
 const b=C.manager({api:d.api,storage:makeStore(),getUser:()=>({id:'id-1'})});
 await a.push('project',project('shared',100,2));
 const conflict=await b.push('project',project('shared',150,3));
 assert.equal(conflict.action,'conflict');
 assert.equal(conflict.reason,'untracked-existing');
 assert.equal(d.calls.length,1);
});
test('Metadados de sincronizacao isolados por Google userId',async()=>{
 const {C}=harness(),d=drive(),storage=makeStore();
 const a=C.manager({api:d.api,storage,getUser:()=>({id:'alice'})});
 const b=C.manager({api:d.api,storage,getUser:()=>({id:'bob'})});
 await a.push('project',project());
 assert.equal(a.cache().get('project','abc').remoteVersion,'1');
 assert.equal(b.cache().get('project','abc'),null);
});
test('Cliente Drive REST usa appDataFolder sem acesso a arquivos normais',async()=>{
 const {C}=harness(),calls=[];
 const mock=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/files?')&&!url.includes('/upload/'))return {ok:true,json:async()=>({files:[],nextPageToken:''})};
  return {ok:true,json:async()=>({id:'file1',name:'aurenix-project-abc.json',version:'1',modifiedTime:'2026-11-16'})};
 };
 const api=C.client({getToken:()=> 'test-token-in-memory',fetchImpl:mock});
 await api.listAll();
 await api.upload('project','abc',C.packageData('project',project()));
 assert.ok(calls[0].url.includes('spaces=appDataFolder'));
 assert.ok(calls[1].url.includes('uploadType=multipart'));
 assert.ok(calls[1].options.body.includes('"appDataFolder"'));
 assert.equal(calls[0].options.headers.Authorization,'Bearer test-token-in-memory');
});
test('Codigo de OAuth Google usa plugin nativo em Android e nao persiste tokens',async()=>{
 const {C}=harness(),calls=[],storage=new Map();
 const native={
  initialize:async opts=>{calls.push(opts);},
  signIn:async()=>({accessToken:'secret-must-not-save',userId:'googleId',email:'user@example.com',displayName:'Teste'}),
  signOut:async()=>{}
 };
 const window={AURENIX_GOOGLE_WEB_CLIENT_ID:'123456-abcd.apps.googleusercontent.com',
  Capacitor:{isNativePlatform:()=>true,Plugins:{GoogleSignIn:native}}};
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 vm.runInNewContext(code('js/cloud-auth.js'),{window,localStorage,fetch:async()=>{throw Error('not needed')},console,setTimeout,clearTimeout,Date});
 await window.AurenixGoogleAuth.signIn();
 assert.equal(window.AurenixGoogleAuth.getToken(),'secret-must-not-save');
 assert.equal(window.AurenixGoogleAuth.state().user.id,'googleId');
 assert.ok(calls[0].scopes.includes(C.SCOPE));
 assert.ok(!JSON.stringify([...storage]).includes('secret-must-not-save'));
 await window.AurenixGoogleAuth.signOut();
 assert.equal(window.AurenixGoogleAuth.getToken(),'');
});
test('Interface tem acesso no menu, home, Pixel Studio e botao Voltar',()=>{
 const html=code('index.html'),home=code('js/home.js'),pixelHtml=code('pixelstudio.html'),back=code('js/back.js');
 for(const src of ['cloud-config.js','cloud-drive.js','cloud-auth.js','cloud-ui.js','cloud-ui.css'])assert.ok(html.includes(src),src);
 assert.ok(html.includes('menuCloud'));assert.ok(home.includes('data-home="cloud"'));
 assert.ok(pixelHtml.includes('id="psCloud"'));
 assert.ok(back.includes('AurenixCloud?.isOpen'));
 const pkg=JSON.parse(code('package.json'));assert.equal(pkg.dependencies['@capawesome/capacitor-google-sign-in'],'0.1.4');
});
test('Todos os novos JS sao sintaticamente validos',()=>{
 for(const file of ['js/cloud-drive.js','js/cloud-auth.js','js/cloud-ui.js','js/editor.js','js/home.js','js/back.js']){
  assert.doesNotThrow(()=>new vm.Script(code(file),{filename:file}),file);
 }
});

test('Metadado remoto usa nome legivel do projeto sem dar acesso a pastas comuns',async()=>{
 const {C}=harness();
 let posted='';
 const mock=async(url,options)=>{
  posted=String(options?.body||'');
  return {ok:true,json:async()=>({id:'f1',name:'aurenix-project-abc.json',version:'1'})};
 };
 const cli=C.client({getToken:()=> 't',fetchImpl:mock});
 await cli.upload('project','abc',C.packageData('project',project()));
 assert.ok(posted.includes('Aurenix Cloud - Meu jogo'),posted.slice(0,230));
 assert.ok(posted.includes('appDataFolder'));
});
