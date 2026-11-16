/* Aurenix Cloud 0.11 — Drive appDataFolder, offline-first, cross-device data.
 * No identity tokens in projects, backups, disk, or service worker.
 */
(function(global){
'use strict';
const SCOPE='https://www.googleapis.com/auth/drive.appdata';
const BASE='https://www.googleapis.com/drive/v3';
const UPLOAD='https://www.googleapis.com/upload/drive/v3';
const LIMIT=24*1024*1024;
const types=['project','pixel','settings'];
const clone=x=>JSON.parse(JSON.stringify(x));
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=90&&/^[a-zA-Z0-9_-]+$/.test(id);
const keyOf=(type,id)=>{
 if(!types.includes(type)||!validId(id))throw Error('Identificador de arquivo inválido');
 return 'aurenix-'+type+'-'+id+'.json';
};
const safeNumber=v=>Number.isFinite(Number(v))?Number(v):0;
const byteLength=text=>new TextEncoder().encode(text).byteLength;
const looksLikeObject=x=>x&&typeof x==='object'&&!Array.isArray(x);
function validate(type,data){
 if(!types.includes(type))throw Error('Tipo de backup inválido');
 if(!looksLikeObject(data)||!validId(data.id))throw Error('Arquivo inválido: ID obrigatório');
 if(type==='project'){
  if(!['2d','3d','pixel','html5'].includes(data.mode))throw Error('Projeto incompatível: modo desconhecido');
  if(!Array.isArray(data.objects)||!Array.isArray(data.assets))throw Error('Projeto incompleto: objetos ou arquivos ausentes');
  if(data.objects.length>40000||data.assets.length>2000)throw Error('Projeto ultrapassa limites de segurança');
 }else if(type==='pixel'){
  if(!Array.isArray(data.frames)||data.frames.length>600||!Number.isInteger(data.size)||data.size<8||data.size>256)throw Error('Pixel Art inválido');
 }else if(type==='settings'){
  if(data.id!=='settings'||!Array.isArray(data.prefabs)||!looksLikeObject(data.theme))throw Error('Configurações incompatíveis');
 }
 return true;
}
function packageData(type,data){
 validate(type,data);
 const wrapped={format:'aurenix-cloud',schema:1,kind:type,id:data.id,
  title:String(data.name||'Sem nome').slice(0,90),savedAt:new Date().toISOString(),data:clone(data)};
 const text=JSON.stringify(wrapped);
 if(byteLength(text)>LIMIT)throw Error('Arquivo acima de 24 MB. Exporte um backup local ou reduza recursos grandes.');
 return text;
}
function unpack(type,text){
 if(byteLength(text)>LIMIT+1000)throw Error('Backup do Drive maior que 24 MB');
 let obj;try{obj=JSON.parse(text);}catch{throw Error('Backup do Drive está corrompido');}
 if(obj?.format!=='aurenix-cloud'||obj?.schema!==1||obj.kind!==type||obj.data?.id!==obj.id)throw Error('Formato de nuvem não reconhecido');
 validate(type,obj.data);return obj.data;
}
async function digest(text){
 const input=new TextEncoder().encode(text);
 if(global.crypto?.subtle?.digest){
  const hash=await global.crypto.subtle.digest('SHA-256',input);
  return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
 }
 // Browser without SubtleCrypto: compare content manually, never treat weak hash as security.
 let hash=2166136261;for(const x of input){hash^=x;hash=Math.imul(hash,16777619);}
 return 'fnv32-'+(hash>>>0).toString(16);
}
const normalizeRemote=x=>({
 id:x.id,name:String(x.name||''),version:String(x.version||'0'),
 modifiedTime:x.modifiedTime||'',size:Number(x.size)||0,description:x.description||'',md5Checksum:x.md5Checksum||''
});
function errFromResponse(status,data){
 let message=data?.error?.message||data?.message||'Falha no Google Drive';
 if(status===401)return Error('Sessão Google expirada. Reconecte a conta.');
 if(status===403)return Error('Google Drive negou permissão. Verifique se a API está ativada e se autorizou o escopo drive.appdata.');
 if(status===404)return Error('Arquivo não encontrado no Google Drive.');
 if(status===429||status>=500)return Error('Google Drive temporariamente indisponível. Seus arquivos locais continuam intactos.');
 return Error(String(message).slice(0,260));
}
function client({getToken,fetchImpl}={}){
 const request=fetchImpl||global.fetch?.bind(global);
 if(!request)throw Error('Rede indisponível');
 async function call(url,{method='GET',body,headers={}}={}){
  const token=getToken?.();
  if(!token)throw Error('Conecte a conta Google para acessar o Drive');
  const all={'Authorization':'Bearer '+token,...headers};
  let res;try{res=await request(url,{method,headers:all,body,cache:'no-store'});}
  catch(e){throw Error('Sem conexão com Google Drive: '+String(e.message||e));}
  if(!res.ok){
   let info={};try{info=await res.json();}catch{}
   throw errFromResponse(res.status,info);
  }
  return res;
 }
 async function listAll(){
  const all=[];let page='';
  do{
   const qs=new URLSearchParams({spaces:'appDataFolder',pageSize:'100',
    fields:'nextPageToken,files(id,name,mimeType,modifiedTime,size,version,description,md5Checksum)',q:'trashed=false'});
   if(page)qs.set('pageToken',page);
   const result=await (await call(BASE+'/files?'+qs)).json();
   for(const f of result.files||[]){
    if(/^aurenix-(project|pixel|settings)-[a-zA-Z0-9_-]+\.json$/.test(f.name||''))all.push(normalizeRemote(f));
   }
   page=result.nextPageToken||'';
   if(all.length>2000)throw Error('Limite de 2 mil arquivos sincronizados atingido');
  }while(page);
  return all;
 }
 async function download(file){
  if(!file?.id||String(file.id).length>140)throw Error('ID remoto inválido');
  const r=await call(BASE+'/files/'+encodeURIComponent(file.id)+'?alt=media');
  const text=await r.text();
  if(byteLength(text)>LIMIT+1000)throw Error('Backup maior que 24 MB');
  return text;
 }
 async function upload(type,id,text,remote=null){
  if(byteLength(text)>LIMIT)throw Error('Backup maior que 24 MB');
  const name=keyOf(type,id);
  const metadata={name,mimeType:'application/json',description:'Aurenix Cloud · '+type+' · '+String(id).slice(0,80)};
  const contentType='application/json; charset=UTF-8';
  let res;
  if(remote?.id){
   if(byteLength(text)<=5*1024*1024){
    res=await call(UPLOAD+'/files/'+encodeURIComponent(remote.id)+'?uploadType=media&fields=id,name,version,modifiedTime,size',{
     method:'PATCH',headers:{'Content-Type':contentType},body:text
    });
   }else{
    const init=await call(UPLOAD+'/files/'+encodeURIComponent(remote.id)+'?uploadType=resumable&fields=id,name,version,modifiedTime,size',{
     method:'PATCH',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':'application/json'},
     body:JSON.stringify(metadata)
    });
    const location=init.headers.get('location');
    if(!location?.startsWith('https://'))throw Error('Google não retornou endereço seguro para upload resumível');
    res=await call(location,{method:'PUT',headers:{'Content-Type':contentType},body:text});
   }
  }else if(byteLength(text)<=5*1024*1024){
   const boundary='aurenix_'+Math.random().toString(16).slice(2);
   const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({...metadata,parents:['appDataFolder']})+
    '\r\n--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+text+'\r\n--'+boundary+'--';
   res=await call(UPLOAD+'/files?uploadType=multipart&fields=id,name,version,modifiedTime,size',{
    method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body
   });
  }else{
   const init=await call(UPLOAD+'/files?uploadType=resumable&fields=id,name,version,modifiedTime,size',{
    method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':'application/json'},
    body:JSON.stringify({...metadata,parents:['appDataFolder']})
   });
   const location=init.headers.get('location');
   if(!location?.startsWith('https://'))throw Error('Google não retornou endereço seguro para upload resumível');
   res=await call(location,{method:'PUT',headers:{'Content-Type':contentType},body:text});
  }
  const result=await res.json();
  if(!result.id)throw Error('Google Drive não confirmou o upload');
  return normalizeRemote(result);
 }
 return {listAll,download,upload};
}
function syncCache({storage,userId}){
 if(!validId(String(userId||'')))throw Error('Conta Google inválida');
 const prefix='aurenix.cloud.011.'+userId+'.';
 return {
  get:(type,id)=>{try{return JSON.parse(storage.getItem(prefix+keyOf(type,id))||'null');}catch{return null;}},
  set:(type,id,value)=>{try{storage.setItem(prefix+keyOf(type,id),JSON.stringify(value));}catch{}},
  clear:(type,id)=>{try{storage.removeItem(prefix+keyOf(type,id));}catch{}}
 };
}
function manager({api,getToken,getUser,storage,onStatus}={}){
 const cacheMap=new Map();let running=false;
 const storageApi=storage||global.localStorage;
 const status=x=>onStatus?.(x);
 const drive=api||client({getToken});
 function accountCache(){
  const id=String(getUser?.()?.id||'');
  return syncCache({storage:storageApi,userId:id});
 }
 async function find(type,id){
  const list=await drive.listAll(),name=keyOf(type,id);
  return list.find(f=>f.name===name)||null;
 }
 async function planPush(type,data){
  validate(type,data);
  const remote=await find(type,data.id);
  const text=packageData(type,data),localHash=await digest(JSON.stringify(data));
  const meta=accountCache().get(type,data.id);
  if(!remote)return {action:'create',type,id:data.id,remote:null,text,localHash};
  if(meta?.remoteId===remote.id&&meta?.remoteVersion===remote.version){
   if(meta.localHash===localHash)return {action:'same',type,id:data.id,remote,localHash};
   return {action:'update',type,id:data.id,remote,text,localHash};
  }
  const current=await drive.download(remote);
  const cloud=unpack(type,current);
  const remoteHash=await digest(JSON.stringify(cloud));
  if(remoteHash===localHash){
   accountCache().set(type,data.id,{remoteId:remote.id,remoteVersion:remote.version,localHash,at:Date.now()});
   return {action:'same',type,id:data.id,remote,localHash};
  }
  return {action:'conflict',type,id:data.id,remote,cloud,local:data,localHash,remoteHash,
   reason:meta?.remoteId===remote.id?'cloud-changed':'untracked-existing'};
 }
 async function push(type,data,{force=false}={}){
  if(running)throw Error('Sincronização já em andamento');
  running=true;
  try{
   const p=await planPush(type,data);
   if(p.action==='conflict'&&!force)return p;
   if(p.action==='same')return p;
   status('Enviando '+String(data.name||data.id)+'…');
   const result=await drive.upload(type,data.id,p.text,p.remote);
   const localHash=p.localHash;
   accountCache().set(type,data.id,{remoteId:result.id,remoteVersion:result.version,localHash,at:Date.now()});
   return {action:p.action==='create'?'created':'updated',remote:result,type,id:data.id};
  }finally{running=false;}
 }
 async function forceUpload(type,data){
  if(running)throw Error('Sincronização em andamento');
  running=true;
  try{
   const remote=await find(type,data.id),text=packageData(type,data);
   const result=await drive.upload(type,data.id,text,remote);
   accountCache().set(type,data.id,{remoteId:result.id,remoteVersion:result.version,
    localHash:await digest(JSON.stringify(data)),at:Date.now()});
   return {action:'updated',remote:result,type,id:data.id};
  }finally{running=false;}
 }
 async function pull(type,file){
  if(!file?.name?.startsWith('aurenix-'+type+'-'))throw Error('Tipo de arquivo remoto incompatível');
  return unpack(type,await drive.download(file));
 }
 async function markPulled(type,data,file){
  validate(type,data);
  const hash=await digest(JSON.stringify(data));
  accountCache().set(type,data.id,{remoteId:file.id,remoteVersion:file.version,localHash:hash,at:Date.now()});
 }
 async function list(){return drive.listAll();}
 const needsPush=async(type,data)=>{
  const meta=accountCache().get(type,data.id);
  return !meta||meta.localHash!==(await digest(JSON.stringify(data)));
 };
 return {list,push,forceUpload,pull,markPulled,planPush,needsPush,find,digest,cache:accountCache};
}
global.AurenixCloudCore={SCOPE,client,manager,validate,packageData,unpack,keyOf,digest,syncCache,LIMIT};
})(window);