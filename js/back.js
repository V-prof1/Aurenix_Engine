/* Navegação Android inteligente: Voltar sai do teste, não do aplicativo. */
(function(global){
'use strict';
let nativeBound=false,lastBack=0;
const shown=el=>!!el&&!el.classList.contains('hidden')&&!el.classList.contains('ax-theme-hide');
function toast(msg){
 let box=document.getElementById('axBackToast');
 if(!box){box=document.createElement('div');box.id='axBackToast';box.style.cssText='position:fixed;z-index:1000;left:50%;bottom:calc(30px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);padding:11px 19px;border-radius:18px;background:#213850f5;color:#effbff;box-shadow:0 8px 25px #0008;font:13px system-ui;pointer-events:none;';document.body.appendChild(box);}
 box.textContent=msg;box.hidden=false;clearTimeout(box._t);box._t=setTimeout(()=>box.hidden=true,2300);
}
async function back(){
 try{
  if(global.AurenixToolbox?.isOpen?.()){global.AurenixToolbox.close();return 'toolbox';}
  if(global.AurenixTheme?.isOpen?.()){global.AurenixTheme.close();return 'theme';}
  const play=document.getElementById('playOverlay');
  if(shown(play)){
    if(document.fullscreenElement)try{await document.exitFullscreen();}catch{}
    document.getElementById('stopBtn')?.click();
    return 'game';
  }
  if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}return 'fullscreen';}
  if(shown(document.getElementById('modalLayer'))){document.getElementById('modalClose')?.click();return 'modal';}
  const menu=document.getElementById('menuPopover');if(shown(menu)){menu.classList.add('hidden');return 'menu';}
  if(document.getElementById('pixelStudioApp')||location.pathname.endsWith('/pixelstudio.html')){
    const playBtn=document.getElementById('play');if(playBtn?.textContent?.includes('■')){playBtn.click();return 'animation';}
    document.getElementById('back')?.click();return 'pixel-home';
  }
  if(document.querySelector('.sidebar.open')){document.getElementById('dimLayer')?.click();return 'panel';}
  if(global.AurenixHome?.isOpen?.()){
    if(Date.now()-lastBack<2000){
      lastBack=0;
      const app=global.Capacitor?.Plugins?.App;
      if(app?.minimizeApp)await app.minimizeApp();else toast('Você já está na tela inicial.');
      return 'minimize';
    }
    lastBack=Date.now();toast('Toque em Voltar novamente para minimizar');return 'confirm-minimize';
  }
  const save=document.getElementById('saveBtn');
  if(save&&document.getElementById('saveStatus')?.textContent?.includes('não salva'))save.click();
  global.AurenixAudio?.stop?.();
  const home=document.getElementById('homeBtn');
  if(home){home.click();return 'home';}
  return 'none';
 }catch(err){console.warn('Aurenix - falha ao navegar:',err);toast('Não foi possível voltar: '+err.message);return 'error';}
}
function init(){
 if(nativeBound)return;
 const app=global.Capacitor?.Plugins?.App;
 if(global.Capacitor?.isNativePlatform?.()&&app?.addListener){
  nativeBound=true;
  app.addListener('backButton',()=>{back();}).catch?.(e=>{nativeBound=false;console.warn('Listener Back falhou:',e)});
 }
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'&&e.key!=='BrowserBack')return;
  if(e.target.matches('input,textarea,select'))return;
  e.preventDefault();back();
 });
}
init();global.AurenixBack={back,init};
})(window);