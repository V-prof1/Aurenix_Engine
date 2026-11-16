/* Aurenix Cloud 0.11 — user-facing cloud backup/recovery on Android and future PC.
 * Local-first: cloud errors never delete local projects. No silent conflict resolution.
 */
(function(global){
'use strict';
const C=()=>global.AurenixCloudCore,A=()=>global.AurenixGoogleAuth,$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
let opts={},root=null,manager=null,remote=[],local={},busy=false,conflicts=new Map(),autoTimer=new Map(),syncChain=Promise.resolve(),lastSync=0;
let operationMessage='',errorMessage='';
const canSync=()=>A()?.connected?.()===true;
const autoKey=()=>('aurenix.cloud.autosync.'+String(A()?.getUser?.()?.id||''));
const autoEnabled=()=>{try{return canSync()&&localStorage.getItem(autoKey())==='true';}catch{return false;}};
const typeLabel={project:'🎮 Jogo',pixel:'🎨 Pixel Art',settings:'⚙ Preferências'};
function parseType(name){return /^aurenix-(project|pixel|settings)-/.exec(name||'')?.[1]||null;}
function labelOf(r){const title=String(r.description||'').replace(/^Aurenix Cloud\s*[-·]\s*/,'');return title&&title!==r.name?title:r.name.replace(/^aurenix-(project|pixel|settings)-/,'').replace(/\.json$/,'');}
function setStatus(s,error=false){operationMessage=String(s||'');errorMessage=error?operationMessage:'';const el=$('axCloudStatus');if(el){el.textContent=operationMessage;el.classList.toggle('error',error);}}
async function refreshLocal(){
 local.project=opts.listProjects?await opts.listProjects():[];
 local.pixel=opts.listPixels?await opts.listPixels():[];
 local.settings=opts.getSettings?[await opts.getSettings()]:[];
 return local;
}
function newManager(){
 if(!canSync())throw Error('Conecte sua conta Google primeiro');
 if(!manager)manager=C().manager({
  getToken:A().getToken,getUser:A().getUser,
  storage:localStorage,onStatus:setStatus
 });
 return manager;
}
async function refreshCloud(){
 const m=newManager();
 setStatus('Consultando sua pasta privada no Google Drive…');
 remote=await m.list();
 await refreshLocal();
 lastSync=Date.now();
 render();
 setStatus('Cloud atualizado: '+remote.filter(x=>parseType(x.name)).length+' arquivos na nuvem.');
 return remote;
}
function localItem(type,id){
 return (local[type]||[]).find(x=>x.id===id)||null;
}
async function receive(type,item,{mode='replace'}={}){
 const m=newManager(),data=await m.pull(type,item);
 await refreshLocal();
 const current=localItem(type,data.id);
 let copy=false;
 if(mode==='copy'&&current){copy=true;}
 if(mode==='replace'&&current){
  if(!confirm('Este '+typeLabel[type]+' já existe no aparelho.\n\nRestaurar o backup da nuvem SUBSTITUIRÁ a versão local. Faça um backup se ela tiver mudanças importantes. Continuar?'))return {action:'cancelled'};
 }
 let result=clone(data);
 if(copy){
  result.id='a'+Math.random().toString(36).slice(2,14);
  result.name=(result.name||'Arquivo')+' (cópia recuperada)';
  result.updated=Date.now();
 }
 if(type==='project'){
  if(!opts.putProject)throw Error('Este editor não permite restaurar projetos');
  await opts.putProject(result);
 }else if(type==='pixel'){
  if(!opts.putPixel)throw Error('Este editor não permite restaurar Pixel Arts');
  await opts.putPixel(result);
 }else{
  if(!opts.putSettings)throw Error('Preferências não podem ser restauradas');
  await opts.putSettings(result);
 }
 // Baseline is stored only AFTER confirmed IndexedDB/localStorage transaction.
 if(!copy)await m.markPulled(type,data,item);
 conflicts.delete(type+':'+data.id);
 await refreshLocal();
 render();
 setStatus(copy?'Cópia restaurada sem apagar sua versão local.':'Arquivo restaurado no aparelho.');
 opts.onRestored?.(type,result);
 return {action:copy?'copied':'restored',data:result};
}
async function push(type,data,{force=false}={}){
 const m=newManager();
 const result=force?await m.forceUpload(type,data):await m.push(type,data);
 if(result.action==='conflict'){
  conflicts.set(type+':'+data.id,result);
  setStatus('Conflito: '+(data.name||data.id)+' tem alterações diferentes no aparelho e na nuvem. Nenhuma versão foi apagada.',true);
 }else{
  conflicts.delete(type+':'+data.id);
  setStatus('Backup '+(result.action==='same'?'já atualizado':'enviado')+': '+(data.name||data.id));
 }
 return result;
}
async function syncAll(){
 if(!canSync())throw Error('Conecte sua conta Google');
 if(busy)throw Error('Outra sincronização está em andamento');
 busy=true;render();
 try{
  await opts.beforeSync?.();
  await refreshLocal();
  const source=[...(local.project||[]).map(x=>({type:'project',data:x})),...(local.pixel||[]).map(x=>({type:'pixel',data:x}))];
  // Preferences are explicit, not included in automatic sync on save.
  let synced=0,skipped=0;
  for(let i=0;i<source.length;i++){
   const e=source[i];
   setStatus('Sincronizando '+(i+1)+'/'+source.length+': '+(e.data.name||e.data.id));
   try{const r=await push(e.type,e.data);r.action==='conflict'?skipped++:synced++;}
   catch(ex){skipped++;setStatus('Arquivo não sincronizado: '+ex.message,true);}
  }
  await refreshCloud();
  setStatus(synced+' arquivos verificados/enviados; '+skipped+' conflitos ou erros. Os projetos locais permanecem intactos.');
  return {synced,skipped};
 }finally{busy=false;render();}
}
async function restoreAll(){
 if(!canSync())throw Error('Conecte sua conta Google');
 if(busy)throw Error('Sincronização em andamento');
 const list=remote.filter(x=>parseType(x.name)==='project'||parseType(x.name)==='pixel');
 if(!list.length)throw Error('Nenhum projeto ou desenho foi encontrado no Drive');
 if(!confirm('Restaurar '+list.length+' itens da nuvem?\n\nItens já existentes terão uma cópia importada para proteger seus dados locais.'))return;
 busy=true;render();
 let restored=0,failed=0;
 try{
  for(const item of list){
   try{
    await receive(parseType(item.name),item,{mode:'copy'});
    restored++;
   }catch(e){failed++;setStatus('Falha ao recuperar '+labelOf(item)+': '+e.message,true);}
  }
  setStatus(restored+' arquivos recuperados; '+failed+' erros. Seus arquivos anteriores não foram excluídos.');
 }finally{busy=false;render();}
}
async function connect(){
 await A().signIn();
 manager=null;conflicts.clear();
 await refreshCloud();render();
}
async function disconnect(){
 A().signOut().catch(()=>{});
 manager=null;remote=[];conflicts.clear();
 for(const t of autoTimer.values())clearTimeout(t);
 autoTimer.clear();render();setStatus('Conta desconectada. Os dados locais continuam neste aparelho.');
}
function onLocalSave(data,type='project'){
 if(!canSync()||!autoEnabled()||!data?.id)return;
 // Queue only while the application and the Google access token are active.
 const key=type+':'+data.id;
 clearTimeout(autoTimer.get(key));
 const snapshot=clone(data);
 autoTimer.set(key,setTimeout(()=>{
  autoTimer.delete(key);
  syncChain=syncChain.then(async()=>{
   if(!canSync()||!autoEnabled())return;
   const result=await push(type,snapshot);
   if(result.action==='conflict')render();
  }).catch(e=>{setStatus('Salvo no aparelho, mas backup pendente: '+e.message,true);});
 },3500));
}
function render(){
 if(!root)return;
 const connected=canSync(),user=A()?.getUser?.(),account=$('axCloudAccount'),actions=$('axCloudActions'),cloud=$('axCloudFiles'),status=$('axCloudStatus');
 if(account)account.innerHTML=connected?
  '<div class="ax-cloud-account"><span class="ax-cloud-avatar">G</span><div><strong>'+esc(user.name||'Google')+'</strong><small>'+esc(user.email)+'</small><small>✓ Drive particular conectado</small></div><button data-cloud="disconnect">Sair</button></div>':
  '<div class="ax-cloud-connect"><h3>☁ Seus jogos em qualquer dispositivo</h3><p>Use a mesma Conta Google no celular e futuramente no PC para recuperar seus jogos, Pixel Arts e configurações.</p>'+
  '<button class="ax-cloud-primary" data-cloud="connect" '+(!A()?.state?.().configured?'disabled':'')+'>Entrar com Google</button>'+
  (!A()?.state?.().configured?'<p class="ax-cloud-warning">O login Google precisa de um Client ID OAuth da Aurenix e da configuração Android (SHA-1). O armazenamento local continua disponível enquanto isso.</p>':'')+
  '<p class="ax-cloud-note">Permissão solicitada: apenas a pasta privada da Aurenix no seu Google Drive. Não lemos seus outros documentos.</p></div>';
 if(actions){
  actions.hidden=!connected;
  actions.innerHTML=connected?'<div class="ax-cloud-actions"><button data-cloud="sync">↑ Sincronizar meus arquivos</button><button data-cloud="refresh">⟳ Atualizar Drive</button><button data-cloud="restoreAll">↓ Recuperar todos como cópia</button></div>'+
  '<label class="ax-cloud-check"><input id="axCloudAuto" type="checkbox" '+(autoEnabled()?'checked':'')+'> Backup automático ao salvar (enquanto conectado e com internet)</label>'+
  '<p class="ax-cloud-note">O backup automático só envia novas alterações; não sobrescreve projetos que foram modificados em outro dispositivo.</p>':'';
 }
 if(cloud){
  cloud.hidden=!connected;
  if(connected){
   const rows=remote.filter(f=>parseType(f.name)).sort((a,b)=>String(b.modifiedTime).localeCompare(String(a.modifiedTime)));
   cloud.innerHTML='<h3>Arquivos no Google Drive <small>('+rows.length+')</small></h3>'+
   '<p class="ax-cloud-note">Esta pasta é privada para a Aurenix. Para recuperar um projeto, toque em Restaurar ou Cópia.</p>'+
   (rows.length?rows.map(x=>{
    const type=parseType(x.name),id=x.name.slice(('aurenix-'+type+'-').length,-5);
    const conflict=conflicts.has(type+':'+id),localFound=!!localItem(type,id);
    return '<article class="ax-cloud-file'+(conflict?' conflict':'')+'"><div><strong>'+typeLabel[type]+' · '+esc(labelOf(x))+'</strong><small>Atualizado: '+(x.modifiedTime?new Date(x.modifiedTime).toLocaleString('pt-BR'):'—')+'</small><small>'+(localFound?'Já existe neste aparelho':'Não existe neste aparelho')+'</small></div>'+
      '<div class="ax-cloud-buttons"><button data-cloud="pull" data-remote="'+esc(x.id)+'">↓ Restaurar</button>'+
      (localFound?'<button data-cloud="copy" data-remote="'+esc(x.id)+'">▣ Cópia</button>':'')+
      (conflict?'<button data-cloud="force" data-type="'+type+'" data-item="'+esc(id)+'">↑ Usar versão local</button>':'')+'</div></article>';
   }).join(''):'<p class="ax-cloud-empty">Nenhum backup encontrado. Salve um projeto e toque em Sincronizar.</p>')+
   '<div class="ax-cloud-actions"><button data-cloud="settingsUp">↑ Backup de temas e prefabs</button><button data-cloud="settingsDown">↓ Restaurar temas e prefabs</button></div>';
  }
 }
 if(status){status.textContent=operationMessage;status.classList.toggle('error',!!errorMessage);}
 if(root)root.querySelectorAll('button[data-cloud]').forEach(x=>x.disabled=busy||x.dataset.cloud==='connect'&&!A().state().configured);
}
async function settingsUp(){
 if(!opts.getSettings)throw Error('Configurações não disponíveis');
 const data=await opts.getSettings(),r=await push('settings',data);
 if(r.action==='conflict')setStatus('Configurações da nuvem são diferentes. Escolha a versão que deseja manter.',true);
 await refreshCloud();
}
async function settingsDown(){
 const item=remote.find(x=>x.name==='aurenix-settings-settings.json');
 if(!item)throw Error('Nenhum backup de configurações encontrado');
 return receive('settings',item,{mode:'replace'});
}
async function onClick(e){
 if(e.target===root){close();return;}
 const btn=e.target.closest('button[data-cloud]');if(!btn||busy)return;
 const action=btn.dataset.cloud;
 if(action==='close'){close();return;}
 try{
  busy=true;render();
  if(action==='connect')await connect();
  else if(action==='disconnect')await disconnect();
  else if(action==='refresh')await refreshCloud();
  else if(action==='sync'){busy=false;await syncAll();}
  else if(action==='restoreAll'){busy=false;await restoreAll();}
  else if(action==='settingsUp')await settingsUp();
  else if(action==='settingsDown')await settingsDown();
  else if(action==='pull'||action==='copy'){
   const item=remote.find(x=>x.id===btn.dataset.remote);
   if(!item)throw Error('Arquivo não encontrado');
   await receive(parseType(item.name),item,{mode:action==='copy'?'copy':'replace'});
  }else if(action==='force'){
   const type=btn.dataset.type,data=localItem(type,btn.dataset.item);
   if(!data)throw Error('Arquivo local não encontrado');
   if(!confirm('Substituir a versão da nuvem por este arquivo local? Outros dispositivos receberão esta nova versão.'))return;
   await push(type,data,{force:true});await refreshCloud();
  }
 }catch(err){setStatus(err.message,true);}
 finally{busy=false;render();}
}
function init(options){opts=options||{};refreshLocal().catch(()=>{});}
function open(){
 if(!root){
  root=document.createElement('div');root.id='axCloudOverlay';root.className='ax-cloud-overlay hidden';
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Aurenix Cloud Google Drive');
  root.innerHTML='<section class="ax-cloud-shell"><header><div><small>AURENIX CLOUD • GOOGLE DRIVE</small><h2>☁ Meus projetos na nuvem</h2><p>Seus jogos em qualquer Android e no futuro PC</p></div><button data-cloud="close" aria-label="Fechar Aurenix Cloud">✕</button></header>'+
  '<div class="ax-cloud-body"><section id="axCloudAccount"></section><section id="axCloudActions"></section><section id="axCloudFiles"></section><div id="axCloudStatus" class="ax-cloud-status" role="status"></div></div></section>';
  document.body.appendChild(root);
  root.addEventListener('click',onClick);
  root.addEventListener('change',e=>{
   if(e.target.id==='axCloudAuto'){
    const wanted=e.target.checked;
    if(wanted&&!confirm('Ativar backup automático de projetos salvos nesta sessão? Alterações de outros dispositivos não serão substituídas sem sua autorização.')){e.target.checked=false;return;}
    try{localStorage.setItem(autoKey(),String(wanted));}catch{}
    setStatus(wanted?'Backup automático ativado.':'Backup automático desativado.');
   }
  });
 }
 render();root.classList.remove('hidden');
 if(canSync())refreshCloud().catch(e=>setStatus(e.message,true));
}
function close(){root?.classList.add('hidden');}
function isOpen(){return !!root&&!root.classList.contains('hidden');}
global.AurenixCloud={init,open,close,isOpen,onLocalSave,refreshCloud,restoreAll,syncAll,
 _test:{receive,push,render,parseType,autoEnabled,localItem,refreshLocal,manager:()=>manager}
};
})(window);