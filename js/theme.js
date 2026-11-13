/* Aurenix Theme Studio • 17 pares de cores, ajustes offline, sem APIs pagas. */
(function(global){
'use strict';
const PALETTES=[
 ['Aurora','#5de0d4','#9384fa'],['Oceano','#53c6ed','#4278f5'],['Pôr do sol','#ffab70','#ff6c8a'],
 ['Esmeralda','#4ee3a3','#3bafc3'],['Rubi','#fb687b','#bd72c9'],['Lavanda','#c6a6ff','#829cff'],
 ['Dourado','#ffd16e','#ff985b'],['Cyberpunk','#ff72ce','#49ddef'],['Floresta','#a9db70','#5ec6a9'],
 ['Gelo','#a1eaff','#79b3f1'],['Vulcão','#ff805f','#d65d52'],['Neon','#bbfa5e','#51d0df'],
 ['Índigo','#8f9bff','#b57dec'],['Rosa','#ffa7d6','#a695fa'],['Bronze','#d4ac83','#78b8b3'],
 ['Monocromático','#e4eaf1','#98b4c9'],['Tropical','#5fe1cf','#fdbd67']
];
const KEY='aurenix.theme.v1';
const parse=()=>{
 try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return {id:Number.isInteger(v.id)&&v.id>=0&&v.id<PALETTES.length?v.id:0,primary:v.primary,secondary:v.secondary,size:['compact','comfortable','large'].includes(v.size)?v.size:'comfortable'};}
 catch{return {id:0,size:'comfortable'};}
};
const valid=x=>/^#[0-9a-f]{6}$/i.test(x||'');
let state=parse(),overlay=null;
function apply(){
 const base=PALETTES[state.id]||PALETTES[0],p=valid(state.primary)?state.primary:base[1],s=valid(state.secondary)?state.secondary:base[2];
 const root=document.documentElement.style;
 for(const [key,value] of Object.entries({'--accent':p,'--purple':s,'--blue':s,'--ax-primary':p,'--ax-secondary':s,'--ax-strong':p,'--ax-theme-bg':'color-mix(in srgb,'+p+' 11%,#152234)','--ax-touch':state.size==='large'?'56px':state.size==='compact'?'42px':'48px'}))root.setProperty(key,value);
 document.documentElement.dataset.axTouch=state.size;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#0e1424');
 try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
 window.dispatchEvent(new CustomEvent('aurenix-theme-change',{detail:{...state,primary:p,secondary:s}}));
}
function choose(i){if(i<0||i>=PALETTES.length)return;state.id=i;state.primary=PALETTES[i][1];state.secondary=PALETTES[i][2];apply();render();}
function render(){
 if(!overlay)return;
 const p=valid(state.primary)?state.primary:PALETTES[state.id][1],s=valid(state.secondary)?state.secondary:PALETTES[state.id][2];
 const grid=overlay.querySelector('#axThemes');
 grid.innerHTML=PALETTES.map(([name,one,two],index)=>'<button type="button" class="ax-theme-card '+(index===state.id?'selected':'')+'" data-theme="'+index+'" aria-pressed="'+(index===state.id)+'"><span class="ax-theme-preview" style="--one:'+one+';--two:'+two+'"><i></i><i></i></span><span>'+name+'</span></button>').join('');
 overlay.querySelector('#axColorPrimary').value=p;
 overlay.querySelector('#axColorSecondary').value=s;
 overlay.querySelector('#axTouchSize').value=state.size;
 overlay.querySelector('#axCurrentMode').textContent=PALETTES[state.id][0];
}
function build(){
 if(overlay)return;
 overlay=document.createElement('div');overlay.id='axThemeOverlay';overlay.className='ax-theme-overlay ax-theme-hide';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Aparência da Aurenix');
 overlay.innerHTML='<div class="ax-theme-modal"><header><div><small>PERSONALIZAR AURENIX</small><h2>🎨 Cores e interface</h2><p>Escolha um dos 17 estilos ou personalize as duas cores.</p></div><button type="button" data-action="close" aria-label="Fechar">✕</button></header>'+
 '<div class="ax-theme-layout"><section><h3>17 temas prontos</h3><div class="ax-theme-grid" id="axThemes"></div></section>'+
 '<section class="ax-theme-options"><h3>Ajustes rápidos</h3><p>Tema: <b id="axCurrentMode"></b></p>'+
 '<label>Cor primária <input type="color" id="axColorPrimary"></label><label>Cor secundária <input type="color" id="axColorSecondary"></label>'+
 '<label>Tamanho dos controles <select id="axTouchSize"><option value="compact">Compacto</option><option value="comfortable">Confortável (recomendado)</option><option value="large">Grande — toque facilitado</option></select></label>'+
 '<button type="button" data-action="reset">↺ Restaurar aparência</button><p class="ax-theme-note">Sua escolha fica salva neste aparelho e vale para a tela inicial, editor, Pixel Studio e áudio.</p></section></div>'+
 '<footer><button type="button" data-action="close" class="ax-theme-done">✓ Concluído</button></footer></div>';
 document.body.appendChild(overlay);
 overlay.addEventListener('click',e=>{
  const card=e.target.closest('[data-theme]');if(card){choose(Number(card.dataset.theme));return;}
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='close'||e.target===overlay)close();
  if(action==='reset'){state={id:0,size:'comfortable'};apply();render();}
 });
 overlay.querySelector('#axColorPrimary').addEventListener('input',e=>{state.primary=e.target.value;apply();});
 overlay.querySelector('#axColorSecondary').addEventListener('input',e=>{state.secondary=e.target.value;apply();});
 overlay.querySelector('#axTouchSize').addEventListener('change',e=>{state.size=e.target.value;apply();});
}
function open(){build();render();overlay.classList.remove('ax-theme-hide');overlay.querySelector('[data-action=close]')?.focus();}
function close(){overlay?.classList.add('ax-theme-hide');}
function isOpen(){return !!overlay&&!overlay.classList.contains('ax-theme-hide');}
function reset(){state={id:0,size:'comfortable'};apply();render();}
apply();
global.AurenixTheme={open,close,isOpen,apply,choose,reset,palettes:PALETTES,get:()=>({...state})};
})(window);