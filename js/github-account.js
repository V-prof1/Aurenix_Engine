/* Aurenix GitHub connection 0.10 — token in memory only, never in a game. */
(function(global){
'use strict';
const API='https://api.github.com',WORKFLOW='aurenix-apk.yml';
let token='',profile=null,repos=[],lastBuild=null,cancelled=false;
const safe=x=>String(x??'').slice(0,240);
function state(){return {connected:!!token&&!!profile,user:profile?{login:profile.login,avatar_url:profile.avatar_url}:null,repos:repos.map(r=>({name:r.name,full_name:r.full_name,private:r.private,default_branch:r.default_branch})),lastBuild};}
function forget(){token='';profile=null;repos=[];cancelled=true;return state();}
const errorMessage=(status,msg)=>{
 if(status===401)return 'Conexão revogada ou token inválido. Conecte novamente.';
 if(status===403)return 'Permissão negada. Confira Conteúdo (gravação), Workflows (gravação), Actions (leitura) e criação de repositórios. '+safe(msg);
 if(status===404)return 'Repositório ou recurso não encontrado, ou sem permissão de acesso.';
 return safe(msg||('Erro GitHub '+status));
};
async function api(path,{method='GET',body,authenticated=true}={}){
 const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(authenticated){if(!token)throw Error('Conecte sua conta GitHub antes de publicar');headers.Authorization='Bearer '+token;}
 if(body!==undefined)headers['Content-Type']='application/json';
 let response;
 try{
  response=await fetch(API+path,{method,headers,cache:'no-store',body:body===undefined?undefined:JSON.stringify(body)});
 }catch(e){
  const Http=global.Capacitor?.isNativePlatform?.()&&global.Capacitor?.Plugins?.CapacitorHttp;
  if(!Http?.request)throw Error('Falha de rede ao acessar o GitHub. Confira a conexão do celular.');
  const r=await Http.request({url:API+path,method,headers,data:body});
  if(r.status<200||r.status>=300)throw Error(errorMessage(r.status,r.data?.message));
  return r.data||null;
 }
 const text=response.status===204?'':await response.text();
 let result;try{result=text?JSON.parse(text):null;}catch{result={message:text.slice(0,180)};}
 if(!response.ok)throw Error(errorMessage(response.status,result?.message));
 return result;
}
async function connect(pasted){
 const next=String(pasted||'').trim();
 if(!/^(ghp_|github_pat_|gho_|ghu_|ghs_)[A-Za-z0-9_]{12,}$/.test(next))throw Error('Token GitHub inválido. Cole um token pessoal ou autorize pelo login GitHub.');
 const old=token;token=next;
 try{
  const me=await api('/user');if(!me?.login)throw Error('GitHub não reconheceu a conta.');
  profile=me;await listRepos();return state();
 }catch(e){token=old;profile=null;throw e;}
}
async function listRepos(){
 if(!token)throw Error('Conecte sua conta');
 const list=[];
 for(let page=1;page<=3;page++){
  const data=await api('/user/repos?affiliation=owner&sort=updated&direction=desc&per_page=100&page='+page);
  const rows=Array.isArray(data)?data:[];
  list.push(...rows.filter(r=>r.owner?.login===profile?.login&&r.permissions?.push!==false));
  if(rows.length<100)break;
 }
 repos=list;
 return state();
}
async function createRepo(name,privateRepo){
 if(!profile)throw Error('Conecte sua conta');
 const clean=global.AurenixGithubBuild.slug(name);
 if(clean.length<2)throw Error('Nome do repositório precisa de dois caracteres ou mais');
 const result=await api('/user/repos',{method:'POST',body:{name:clean,private:privateRepo!==false,auto_init:true,description:'Jogo criado no celular com Aurenix Engine',has_issues:false}});
 await listRepos();
 return result;
}
async function sendPlan({repoFullName,createNew=false,newRepoName='',privateRepo=true,plan,onProgress}){
 if(!token||!profile)throw Error('Conecte sua conta');
 if(!plan?.files?.length)throw Error('Não existem arquivos para publicar');
 let repo;
 if(createNew)repo=await createRepo(newRepoName,privateRepo);
 else{
  repo=repos.find(r=>r.full_name===repoFullName);
  if(!repo)throw Error('Selecione um repositório seu, com permissão de escrita');
 }
 const root='/repos/'+encodeURIComponent(repo.owner.login)+'/'+encodeURIComponent(repo.name);
 const branch=repo.default_branch||'main',refPart=branch.split('/').map(encodeURIComponent).join('/');
 const ref=await api(root+'/git/ref/heads/'+refPart);
 const base=await api(root+'/git/commits/'+ref.object.sha);
 const tree=[];
 for(let i=0;i<plan.files.length;i++){
  const file=plan.files[i],kind=typeof file.data==='string'?'utf-8':'base64';
  const content=kind==='utf-8'?file.data:global.AurenixGithubBuild.base64(file.data);
  onProgress?.({current:i+1,total:plan.files.length,path:file.path});
  const blob=await api(root+'/git/blobs',{method:'POST',body:{content,encoding:kind}});
  tree.push({path:file.path,mode:'100644',type:'blob',sha:blob.sha});
 }
 onProgress?.({message:'Criando commit e iniciando o GitHub Actions…'});
 const nextTree=await api(root+'/git/trees',{method:'POST',body:{base_tree:base.tree.sha,tree}});
 const commit=await api(root+'/git/commits',{method:'POST',body:{message:'Aurenix: publicar APK '+plan.name+' v'+plan.version,tree:nextTree.sha,parents:[ref.object.sha]}});
 await api(root+'/git/refs/heads/'+refPart,{method:'PATCH',body:{sha:commit.sha,force:false}});
 lastBuild={owner:repo.owner.login,repo:repo.name,branch,sha:commit.sha,runId:null,runNumber:null,status:'queued',releaseUrl:null,artifactId:null};
 saveMetadata();return state();
}
function saveMetadata(){
 try{if(lastBuild)localStorage.setItem('aurenix.github.last-build',JSON.stringify(lastBuild));}catch{}
}
function restoreMetadata(){
 try{
  const item=JSON.parse(localStorage.getItem('aurenix.github.last-build')||'null');
  if(item&&/^[A-Za-z0-9-]+$/.test(item.owner)&&/^[A-Za-z0-9._-]+$/.test(item.repo)&&/^[a-f0-9]{40}$/.test(item.sha))lastBuild=item;
 }catch{}
}
async function checkBuild(){
 if(!token)throw Error('Reconecte sua conta GitHub para acompanhar');
 if(!lastBuild)throw Error('Publique um jogo primeiro');
 const info=lastBuild,root='/repos/'+encodeURIComponent(info.owner)+'/'+encodeURIComponent(info.repo);
 const list=await api(root+'/actions/runs?head_sha='+encodeURIComponent(info.sha)+'&per_page=30');
 const runs=list.workflow_runs||[],run=runs.find(r=>r.path?.endsWith('/'+WORKFLOW)||r.name==='Aurenix APK do Jogo');
 if(!run){info.status='waiting';saveMetadata();return state();}
 info.runId=run.id;info.runNumber=run.run_number;
 info.status=run.status==='completed'?run.conclusion:run.status;
 if(info.status==='success'){
  const a=await api(root+'/actions/runs/'+run.id+'/artifacts');
  info.artifactId=(a.artifacts||[]).find(x=>x.name==='jogo-aurenix-apk'&&!x.expired)?.id||null;
  const release=await api(root+'/releases/tags/aurenix-'+run.run_number).catch(()=>null);
  info.releaseUrl=release?.assets?.find(x=>x.name==='Aurenix-Jogo.apk')?.browser_download_url||null;
 }
 saveMetadata();return state();
}
async function deviceRequest(endpoint,values){
 const cid=String(global.AURENIX_GITHUB_CLIENT_ID||'').trim();
 if(!cid)throw Error('O login rápido precisa do Client ID de um OAuth App GitHub registrado pelo desenvolvedor da Aurenix.');
 const native=global.Capacitor?.isNativePlatform?.();
 const Http=native&&global.Capacitor?.Plugins?.CapacitorHttp;
 if(!Http?.request)throw Error('Login por navegador disponível apenas no APK com ponte HTTP. No HTML5 use o token de acesso.');
 const response=await Http.request({url:'https://github.com/login/'+endpoint,method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},data:new URLSearchParams(values).toString()});
 const val=typeof response.data==='string'?JSON.parse(response.data):response.data;
 if(response.status>=400)throw Error(val?.error_description||val?.message||'GitHub não autorizou a conexão');
 return val;
}
async function startDevice(){
 cancelled=false;
 const cid=String(global.AURENIX_GITHUB_CLIENT_ID||'').trim();
 const device=await deviceRequest('device/code',{client_id:cid,scope:'repo workflow read:user'});
 if(!device?.user_code)throw Error('Não recebi código do GitHub');
 return device;
}
async function finishDevice(device,onStatus){
 const cid=String(global.AURENIX_GITHUB_CLIENT_ID||'').trim();
 const deadline=Date.now()+Math.min(900000,(Number(device.expires_in)||900)*1000);
 let interval=Math.max(6,Number(device.interval)||6);
 while(Date.now()<deadline&&!cancelled){
  await new Promise(resolve=>setTimeout(resolve,interval*1000));
  if(cancelled)return null;
  const out=await deviceRequest('oauth/access_token',{client_id:cid,device_code:device.device_code,grant_type:'urn:ietf:params:oauth:grant-type:device_code'});
  if(out.access_token)return await connect(out.access_token);
  if(out.error==='authorization_pending'){onStatus?.('Aguardando autorização no GitHub…');continue;}
  if(out.error==='slow_down'){interval=Math.max(interval+5,10);continue;}
  if(out.error)throw Error(out.error_description||out.error);
 }
 if(!cancelled)throw Error('O código expirou. Inicie o login novamente.');
 return null;
}
function cancelDevice(){cancelled=true;}
restoreMetadata();
global.AurenixGithubAccount={state,connect,forget,listRepos,createRepo,sendPlan,checkBuild,startDevice,finishDevice,cancelDevice,api};
})(window);
