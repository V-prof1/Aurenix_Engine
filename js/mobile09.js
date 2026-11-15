/* Aurenix 0.9 — estabilidade em Android/WebView e telas pequenas.
 * Nenhum plugin pago. Adapta-se ao teclado, gestos interrompidos e rotação.
 */
(function(global){
'use strict';
const root=document.documentElement;
let frame=0,keyboardOpen=false;
function refresh(){
 frame=0;
 const visual=global.visualViewport;
 const inner=Math.max(280,global.innerHeight||document.documentElement.clientHeight||700);
 const available=Math.max(250,Math.round(visual?.height||inner));
 const focused=document.activeElement;
 const editing=!!focused?.matches?.('input,textarea,select,[contenteditable="true"]');
 const hiddenByKeyboard=inner-available;
 keyboardOpen=editing&&hiddenByKeyboard>125;
 root.classList.toggle('ax09-keyboard-open',keyboardOpen);
 root.classList.toggle('ax09-landscape',global.innerWidth>global.innerHeight);
 root.style.setProperty('--ax09-visible-height',available+'px');
 root.style.setProperty('--ax09-keyboard-height',Math.max(0,hiddenByKeyboard)+'px');
}
function schedule(){
 if(frame)return;
 frame=global.requestAnimationFrame?global.requestAnimationFrame(refresh):setTimeout(refresh,40);
}
function focusIntoView(e){
 const target=e.target;
 if(!target?.matches?.('input,textarea,select,[contenteditable="true"]'))return;
 schedule();
 // A mudança do viewport após abrir o teclado leva alguns quadros no Android.
 setTimeout(()=>{
  if(document.activeElement!==target)return;
  const pane=target.closest('.tab-body,.inspector-scroll,.ax-theme-modal,.ax-toolbox-list,.modal-content');
  if(!pane)return;
  try{target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}catch{}
 },280);
}
function onHide(){
 if(document.visibilityState==='hidden'){
  // Evita preview de animação e ponteiros presos após trocar de app.
  global.AurenixStudio07?.stopPreview?.();
 }else schedule();
}
function close(){
 global.visualViewport?.removeEventListener?.('resize',schedule);
 global.visualViewport?.removeEventListener?.('scroll',schedule);
 global.removeEventListener('resize',schedule);
 global.removeEventListener('orientationchange',schedule);
 document.removeEventListener('focusin',focusIntoView);
 document.removeEventListener('focusout',schedule);
 document.removeEventListener('visibilitychange',onHide);
}
global.visualViewport?.addEventListener?.('resize',schedule,{passive:true});
global.visualViewport?.addEventListener?.('scroll',schedule,{passive:true});
global.addEventListener('resize',schedule,{passive:true});
global.addEventListener('orientationchange',schedule,{passive:true});
document.addEventListener('focusin',focusIntoView);
document.addEventListener('focusout',schedule);
document.addEventListener('visibilitychange',onHide);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
global.AurenixMobile09={refresh,schedule,close,isKeyboardOpen:()=>keyboardOpen};
})(window);
