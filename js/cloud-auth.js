/* Aurenix Cloud 0.11 — Sign in with Google, Android native / web GIS.
 * Access tokens are ephemeral and never written to localStorage, project files or GitHub.
 */
(function(global){
'use strict';
const SCOPE='https://www.googleapis.com/auth/drive.appdata';
const ID='openid email profile';
let accessToken='',user=null,expiresAt=0,client=null,loginPromise=null,initialized=false,nativeUsed=false;
const config=()=>{
 let fallback='';try{fallback=localStorage.getItem('aurenix.cloud.oauth.clientId')||'';}catch{}
 return String(global.AURENIX_GOOGLE_WEB_CLIENT_ID||fallback).trim();
};
const isNative=()=>global.Capacitor?.isNativePlatform?.()===true;
const nativePlugin=()=>global.Capacitor?.Plugins?.GoogleSignIn;
function requireId(){
 const id=config();
 if(!/^[\d]+-[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(id))throw Error('O login Google da Aurenix ainda precisa do Client ID OAuth oficial. Configure a API Drive e o Client ID no projeto Google Cloud.');
 return id;
}
async function fetchUser(token){
 const res=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{
  headers:{Authorization:'Bearer '+token},cache:'no-store'
 });
 if(!res.ok)throw Error('Não consegui obter os dados da conta Google ('+res.status+'). Reconecte.');
 const info=await res.json();
 if(!info?.sub)throw Error('Conta Google sem identificador válido');
 return {id:String(info.sub),name:String(info.name||info.email||'Conta Google').slice(0,100),
  email:String(info.email||'').slice(0,180),picture:String(info.picture||'')};
}
function connected(){return !!accessToken&&!!user&&Date.now()<expiresAt-15000;}
function state(){return {connected:connected(),user:connected()?{...user}:null,native:isNative(),configured:!!config(),expiresAt:connected()?expiresAt:0};}
function loadGIS(){
 if(global.google?.accounts?.oauth2)return Promise.resolve(global.google);
 return new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-aurenix-google]');
  let script=existing;
  if(!script){
   script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';
   script.async=true;script.defer=true;script.dataset.aurenixGoogle='1';
   document.head.appendChild(script);
  }
  const timeout=setTimeout(()=>{cleanup();reject(Error('Não consegui carregar o login Google. Verifique sua internet.'));},15000);
  const loaded=()=>{cleanup();global.google?.accounts?.oauth2?resolve(global.google):reject(Error('Google Identity Services indisponível.'));};
  const failed=()=>{cleanup();reject(Error('Não foi possível acessar o serviço de login Google'));};
  function cleanup(){clearTimeout(timeout);script.removeEventListener('load',loaded);script.removeEventListener('error',failed);}
  script.addEventListener('load',loaded,{once:true});script.addEventListener('error',failed,{once:true});
  if(global.google?.accounts?.oauth2)loaded();
 });
}
async function init(){
 const id=config();if(!id)return false;
 if(isNative()){
  const plug=nativePlugin();
  if(!plug?.initialize)return false;
  if(!initialized){
   await plug.initialize({clientId:requireId(),scopes:[SCOPE]});
   initialized=true;
  }
  return true;
 }
 await loadGIS();initialized=true;return true;
}
async function signIn(){
 if(loginPromise)return loginPromise;
 loginPromise=(async()=>{
  requireId();
  if(isNative()){
   const plugin=nativePlugin();
   if(!plugin?.initialize||!plugin?.signIn)throw Error('O APK não contém o plugin de login nativo Google. Atualize a Aurenix.');
   await init();
   let response;try{response=await plugin.signIn();}
   catch(e){throw Error('Login Google não autorizado. Verifique o cliente OAuth Android, o ID do pacote e a impressão SHA-1 de assinatura. '+String(e?.message||e).slice(0,140));}
   if(!response?.accessToken)throw Error('O Google não liberou acesso ao Drive. Confirme a permissão solicitada.');
   accessToken=response.accessToken;
   user={id:String(response.userId||''),name:String(response.displayName||response.email||'Google'),
    email:String(response.email||''),picture:String(response.imageUrl||'')};
   if(!user.id)user=await fetchUser(accessToken);
   expiresAt=Date.now()+50*60*1000;nativeUsed=true;
   return state();
  }
  await init();
  const google=global.google;
  return new Promise((resolve,reject)=>{
   let finished=false;
   const done=(error,response)=>{
    if(finished)return;finished=true;clearTimeout(timer);
    if(error){reject(error);return;}
    if(!response?.access_token){reject(Error('Google não retornou autorização para o Drive'));return;}
    const scopes=String(response.scope||'').split(' ');
    if(!scopes.includes(SCOPE)){reject(Error('Acesso à pasta privada do Drive não foi autorizado'));return;}
    accessToken=response.access_token;expiresAt=Date.now()+Math.min(3500,Math.max(60,Number(response.expires_in)||3500))*1000;
    fetchUser(accessToken).then(info=>{user=info;resolve(state());},error=>{accessToken='';user=null;reject(error);});
   };
   let oauth;
   try{
    oauth=google.accounts.oauth2.initTokenClient({
     client_id:requireId(),scope:SCOPE+' '+ID,callback:r=>done(r.error?Error(String(r.error_description||r.error)):null,r),
     error_callback:e=>done(Error('Janela Google não abriu: '+String(e.type||'erro de login')))
    });
   }catch(e){reject(e);return;}
   const timer=setTimeout(()=>done(Error('Autorização Google não concluída. Tente novamente.')),120000);
   try{oauth.requestAccessToken({prompt:'select_account'});}catch(e){done(e);}
  });
 })();
 try{return await loginPromise;}finally{loginPromise=null;}
}
async function signOut(){
 const old=accessToken;
 accessToken='';user=null;expiresAt=0;loginPromise=null;
 if(nativeUsed){try{await nativePlugin()?.signOut?.();}catch{}nativeUsed=false;}
 if(!isNative()&&old&&global.google?.accounts?.oauth2?.revoke){
  try{global.google.accounts.oauth2.revoke(old,()=>{});}catch{}
 }
 return state();
}
function getToken(){return connected()?accessToken:'';}
function getUser(){return connected()?user:null;}
function setTestClientId(clientId){
 const id=String(clientId||'').trim();
 if(!/^[\d]+-[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(id))throw Error('Client ID OAuth inválido');
 try{localStorage.setItem('aurenix.cloud.oauth.clientId',id);}catch{throw Error('Não consegui salvar o Client ID público');}
 return true;
}
global.AurenixGoogleAuth={init,signIn,signOut,state,getToken,getUser,connected,loadGIS,setTestClientId,_test:{setSession:(token,profile,ttl=3600)=>{accessToken=token;user=profile;expiresAt=Date.now()+ttl*1000;}}};
})(window);