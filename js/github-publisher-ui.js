/* Aurenix Engine — publicação GitHub com UI mobile e sem salvar credenciais. */
(function(global){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const G=()=>global.AurenixGithubAccount,B=()=>global.AurenixGithubBuild;
let dialog=null,options={},busy=false,pollTimer=0;
function status(text){const target=$('axGhStatus');if(target)target.textContent=String(text||'');}
function state(){return G().state();}
function repoRadio(){return document.querySelector('input[name="axGhMode"]:checked')?.value||'new';}
function updateRepoMode(){
 const newBox=$('axGhNewRepo'),oldBox=$('axGhOldRepo');
 if(newBox)newBox.hidden=repoRadio()!=='new';
 if(oldBox)oldBox.hidden=repoRadio()!=='old';
}
function buildAccount(){
 const s=state(),box=$('axGhAccount');if(!box)return;
 if(s.connected){
  box.innerHTML='<div class="ax-gh-row"><div><b>✓ @'+esc(s.user.login)+'</b><small>GitHub conectado nesta sessão</small></div><button data-gh="disconnect">Desconectar</button></div>';
 }else{
  const id=String(global.AURENIX_GITHUB_CLIENT_ID||'').trim();
  box.innerHTML='<h3>🔐 Conectar GitHub</h3><p>Autorize a engine a publicar apenas os jogos que você escolher. Nunca informe sua senha GitHub aqui.</p>'+
  '<button data-gh="oauth" '+(!id?'disabled title="Aguardando OAuth App oficial da Aurenix"':'')+'>🐙 Entrar com GitHub'+(!id?' (configuração pendente)':'')+'</button>'+
  '<div id="axGhDevice" class="ax-gh-code" hidden></div>'+
  '<p class="ax-gh-muted">Conexão disponível agora: token de acesso GitHub. O login automático será liberado quando houver um Client ID OAuth registrado para a engine.</p>'+
  '<label>Token GitHub <input id="axGhToken" type="password" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="github_pat_… ou ghp_…"></label>'+
  '<button class="ax-gh-primary" data-gh="connect">Conectar conta</button>'+
  '<p class="ax-gh-muted">Crie um token no <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener">GitHub → Tokens ↗</a>. Para enviar e criar jogos: Conteúdo (escrita), Workflows (escrita), Actions (leitura), Criação de repositórios (escrita). Token clássico: escopos <b>repo</b> e <b>workflow</b>. Por segurança, a engine não guarda o token após o aplicativo ser fechado.</p>';
 }
}
function buildRepository(){
 const box=$('axGhRepository'),s=state();if(!box)return;
 if(!s.connected){box.hidden=true;return;}box.hidden=false;
 const defaultName=B().slug(options.getProject?.()?.name||'meu-jogo');
 box.innerHTML='<h3>① Repositório do jogo</h3><p>Crie um novo ou use um repositório da sua conta.</p>'+
 '<label class="ax-gh-radio"><input name="axGhMode" value="new" type="radio" checked> Criar repositório automaticamente</label>'+
 '<label class="ax-gh-radio"><input name="axGhMode" value="old" type="radio"> Usar repositório existente</label>'+
 '<div id="axGhNewRepo"><label>Nome do repositório <input id="axGhRepoName" maxlength="70" value="'+esc(defaultName)+'"></label>'+
 '<label class="ax-gh-checkbox"><input id="axGhPrivate" type="checkbox" checked> Privado (recomendado)</label></div>'+
 '<div id="axGhOldRepo" hidden><label>Repositório <select id="axGhRepo">'+
 s.repos.map(r=>'<option value="'+esc(r.full_name)+'">'+esc(r.name)+(r.private?' 🔒':' 🌐')+'</option>').join('')+
 '</select></label><button data-gh="refresh">↻ Atualizar repositórios</button><p class="ax-gh-muted">Se escolher um repositório existente, a engine atualizará os arquivos do jogo em <b>www/</b> e as configurações da exportação. Prefira um repositório dedicado.</p></div>';
}
function buildConfig(){
 const box=$('axGhConfig'),s=state();if(!box)return;
 if(!s.connected){box.hidden=true;return;}box.hidden=false;
 const p=options.getProject?.()||{},icons=(p.assets||[]).filter(a=>/^image\/(png|jpeg|webp)$/.test(a.type||''));
 box.innerHTML='<h3>② Configurar aplicativo</h3>'+
 '<label>Nome no Android <input id="axGhAppName" maxlength="55" value="'+esc(p.name||'Meu jogo')+'"></label>'+
 '<div class="ax-gh-cols"><label>Versão <input id="axGhVersion" value="1.0.0" inputmode="decimal" placeholder="1.0.0"></label>'+
 '<label>Orientação da tela <select id="axGhOrientation"><option value="auto">Automática</option><option value="landscape">Horizontal</option><option value="portrait">Vertical</option></select></label></div>'+
 '<label>Ícone do APK <select id="axGhIcon"><option value="">Ícone padrão</option>'+
 icons.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('')+'</select></label>'+
 '<p class="ax-gh-muted">O GitHub Actions compila um APK de teste. Ele pode ser disponibilizado em Releases como arquivo .apk direto ou na aba Actions como ZIP. A compilação depende dos limites gratuitos e das permissões da conta GitHub.</p>'+
 '<label class="ax-gh-checkbox"><input id="axGhConsent" type="checkbox"> Autorizo enviar os arquivos do jogo e executar o GitHub Actions</label>'+
 '<button data-gh="publish" class="ax-gh-primary">🚀 Publicar e gerar APK</button>';
}
function buildResult(){
 const box=$('axGhResult'),s=state();if(!box)return;
 if(!s.connected||!s.lastBuild){box.hidden=true;return;}box.hidden=false;
 const b=s.lastBuild,root='https://github.com/'+encodeURIComponent(b.owner)+'/'+encodeURIComponent(b.repo);
 const label={queued:'Projeto publicado',waiting:'Aguardando GitHub Actions',queued_workflow:'Aguardando compilação',in_progress:'Compilando APK…',completed:'Compilação encerrada',success:'✓ APK pronto para baixar',failure:'❌ Compilação falhou',cancelled:'Compilação cancelada'}[b.status]||b.status;
 box.innerHTML='<h3>③ Seu APK</h3><strong class="ax-gh-buildstatus">'+esc(label)+'</strong>'+
 '<p>'+esc(b.owner+'/'+b.repo)+'</p><button data-gh="check">⟳ Verificar compilação</button><div id="axGhLinks" class="ax-gh-links"></div>'+
 '<p class="ax-gh-muted">Se ainda estiver compilando, acompanhe em Actions e verifique novamente. Caso a publicação em Releases seja bloqueada, baixe o ZIP do artefato pela página de execução.</p>';
 const links=$('axGhLinks');
 const append=(url,text)=>{
  const a=document.createElement('a');a.href=url;a.textContent=text;a.target='_blank';a.rel='noopener noreferrer';links.appendChild(a);
 };
 append(root+'/actions','⚙ Abrir Actions');
 if(b.runId)append(root+'/actions/runs/'+b.runId,'📋 Ver execução');
 if(b.releaseUrl)append(b.releaseUrl,'⬇ Baixar APK diretamente');
 if(b.artifactId)append(root+'/actions/runs/'+b.runId+'/artifacts/'+b.artifactId,'📦 Baixar APK ZIP');
}
function render(){if(!dialog)return;buildAccount();buildRepository();buildConfig();buildResult();}
function setBusy(value){
 busy=!!value;if(dialog)for(const el of dialog.querySelectorAll('[data-gh]'))el.disabled=value;
}
async function imageToIcon(asset){
 if(!asset)return null;
 const image=new Image();image.src=asset.data;
 await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Não consegui carregar a imagem do ícone'));});
 if(!image.width||!image.height)throw Error('Imagem do ícone vazia');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#172638';ctx.fillRect(0,0,1024,1024);
 const scale=Math.min(760/image.width,760/image.height),w=image.width*scale,h=image.height*scale;
 ctx.drawImage(image,(1024-w)/2,(1024-h)/2,w,h);
 const binary=atob(canvas.toDataURL('image/png').split(',')[1]);
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function publish(){
 if(!$('axGhConsent')?.checked)throw Error('Marque a autorização para publicar o jogo.');
 const newRepo=repoRadio()==='new',repoName=$('axGhRepoName')?.value||'',repoFullName=$('axGhRepo')?.value;
 if(!newRepo&&!repoFullName)throw Error('Selecione um repositório existente.');
 const project=options.getProject?.();
 if(!project)throw Error('Abra um projeto da engine antes de publicar.');
 const repoLabel=newRepo?('Criar repositório '+B().slug(repoName)):'Atualizar arquivos Aurenix em '+repoFullName;
 if(!global.confirm(repoLabel+'\n\nO projeto será enviado ao GitHub. Um workflow gratuito será executado para compilar o APK. Confirmar?'))return;
 const iconAsset=(project.assets||[]).find(a=>a.id===$('axGhIcon')?.value);
 status('Preparando jogo e ícone…');const icon=await imageToIcon(iconAsset);
 const repoSlug=newRepo?repoName:repoFullName?.split('/').pop();
 const plan=B().plan({gameFiles:options.getFiles(),gameName:$('axGhAppName').value,repoName:repoSlug,ownerName:state().user.login,version:$('axGhVersion').value,orientation:$('axGhOrientation').value,icon});
 const result=await G().sendPlan({repoFullName,createNew:newRepo,newRepoName:repoName,privateRepo:$('axGhPrivate')?.checked,plan,onProgress:p=>{
  status(p.message||('Enviando '+p.current+'/'+p.total+': '+p.path));
 }});
 buildRepository();buildResult();
 status('Jogo enviado! Acesse Actions ou toque em Verificar compilação.');
 return result;
}
async function doClick(event){
 const btn=event.target.closest('[data-gh]');if(!btn||busy)return;
 const action=btn.dataset.gh;
 if(action==='close'){close();return;}
 if(action==='disconnect'){G().forget();render();status('Conta desconectada');return;}
 if(action==='check'){
  try{setBusy(true);status('Consultando GitHub Actions…');await G().checkBuild();buildResult();status('Status atualizado.');}
  catch(e){status(e.message);}finally{setBusy(false);}return;
 }
 if(action==='refresh'){
  try{setBusy(true);await G().listRepos();buildRepository();status('Repositórios atualizados.');}
  catch(e){status(e.message);}finally{setBusy(false);}return;
 }
 if(action==='connect'){
  const pasted=$('axGhToken')?.value||'';
  if($('axGhToken'))$('axGhToken').value='';
  try{setBusy(true);status('Conectando ao GitHub…');await G().connect(pasted);render();status('Conta GitHub conectada!');}
  catch(e){status(e.message);}finally{setBusy(false);}return;
 }
 if(action==='oauth'){
  try{
   setBusy(true);status('Solicitando código GitHub…');
   const device=await G().startDevice(),box=$('axGhDevice');
   box.hidden=false;box.replaceChildren();
   box.appendChild(document.createTextNode('Código: '+device.user_code+' '));
   const a=document.createElement('a');a.href=device.verification_uri||'https://github.com/login/device';a.textContent='Abrir autenticação GitHub ↗';a.target='_blank';a.rel='noopener noreferrer';box.appendChild(a);
   setBusy(false);
   status('Abra o link, digite o código e autorize a Aurenix.');
   const result=await G().finishDevice(device,status);
   if(result){render();status('Conta conectada: @'+result.user.login);}
  }catch(e){status(e.message);}finally{setBusy(false);}return;
 }
 if(action==='publish'){
  try{setBusy(true);await publish();}
  catch(e){status('Publicação interrompida: '+e.message);}
  finally{setBusy(false);}
 }
}
function init(optionsArg){options=optionsArg||{};}
function open(){
 if(!dialog){
  dialog=document.createElement('div');dialog.id='axGhOverlay';dialog.className='ax-gh-overlay hidden';
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Publicador GitHub e APK');
  dialog.innerHTML='<div class="ax-gh-shell"><header><div><small>EXPORTAÇÃO ANDROID • GITHUB ACTIONS</small><h2>🐙 GitHub → APK</h2><p>Da engine ao instalador do jogo, usando sua própria conta.</p></div><button data-gh="close" aria-label="Fechar">✕</button></header>'+
  '<div class="ax-gh-scroll"><section id="axGhAccount" class="ax-gh-card"></section><section id="axGhRepository" class="ax-gh-card"></section><section id="axGhConfig" class="ax-gh-card"></section><section id="axGhResult" class="ax-gh-card"></section><div id="axGhStatus" role="status" class="ax-gh-status"></div></div></div>';
  document.body.appendChild(dialog);
  dialog.addEventListener('click',doClick);
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  dialog.addEventListener('change',e=>{if(e.target.name==='axGhMode')updateRepoMode();});
 }
 render();dialog.classList.remove('hidden');
}
function close(){G()?.cancelDevice();dialog?.classList.add('hidden');}
const isOpen=()=>!!dialog&&!dialog.classList.contains('hidden');
global.AurenixGithubUI={init,open,close,isOpen,imageToIcon};
})(window);
