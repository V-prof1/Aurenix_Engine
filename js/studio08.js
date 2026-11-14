/* Aurenix Engine 0.8 — Componentes, HUD e ponte com o Pixel Studio.
 * Não executa scripts importados: componentes são dados estruturados.
 */
(function(global){
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number(x)||0));
const clone=x=>JSON.parse(JSON.stringify(x));
const definitions={
 spin:{title:'↻ Girar continuamente',desc:'Rotação automática (2D ou eixo Y no 3D)',values:{speed:90},fields:[['speed','Velocidade (graus/s)',-720,720]]},
 bob:{title:'〰 Flutuar',desc:'Sobe e desce suavemente, sem física',values:{amplitude:16,frequency:1},fields:[['amplitude','Altura máxima',0,400],['frequency','Frequência (Hz)',.1,12]]},
 patrol:{title:'⇄ Patrulha',desc:'Movimento automático de um lado ao outro',values:{distance:130,speed:65},fields:[['distance','Distância',1,2500],['speed','Velocidade',1,2000]]},
 follow:{title:'◎ Perseguir jogador',desc:'Segue o jogador sem atravessar por teleporte',values:{speed:80,stopDistance:45},fields:[['speed','Velocidade',0,1000],['stopDistance','Parar a distância',0,1500]]},
 collectible:{title:'✦ Coletável',desc:'Some ao tocar no jogador e aumenta a pontuação',values:{score:1,respawn:0},fields:[['score','Pontos ao coletar',0,10000],['respawn','Respawn (segundos; 0 nunca)',0,300]]},
 hazard:{title:'⚠ Causa dano',desc:'Tira vida do jogador durante o contato',values:{damage:10,cooldown:1},fields:[['damage','Dano por contato',0,1000],['cooldown','Intervalo de dano (s)',.1,30]]},
 portal:{title:'◈ Portal entre cenas',desc:'Ao encostar no jogador, abre outra cena',values:{sceneName:''},fields:[['sceneName','Nome da cena de destino','text']]},
 impulse:{title:'↥ Impulso',desc:'Impulsiona o jogador ao encostar (2D/3D)',values:{strength:430},fields:[['strength','Força do impulso',1,2000]]},
 particles:{title:'✧ Partículas 2D',desc:'Emissão contínua de partículas coloridas',values:{rate:14,speed:75,life:1,size:4},fields:[['rate','Quantidade por segundo',0,120],['speed','Velocidade',1,600],['life','Duração das partículas (s)',.1,8],['size','Tamanho',1,35]]},
 checkpoint:{title:'⚑ Checkpoint',desc:'Registra onde o jogador reaparece ao morrer',values:{},fields:[]}
};
const KEY='aurenix08-guide';
let cfg={},artDb=null,artList=[],selectedArt=null;
const get=()=>cfg.getProject?.();
const obj=()=>cfg.getSelected?.();
const changed=()=>cfg.changed?.();
const history=()=>cfg.history?.();
const message=s=>cfg.toast?.(s);
function ensure(o){if(!o)return [];if(!Array.isArray(o.components))o.components=[];return o.components;}
function add(o,type){
 if(!definitions[type])throw Error('Componente inválido');
 const list=ensure(o);
 if(list.some(x=>x.type===type))return false;
 list.push({type,enabled:true,...clone(definitions[type].values)});
 return true;
}
function remove(o,type){
 const list=ensure(o),len=list.length;
 o.components=list.filter(c=>c.type!==type);return o.components.length!==len;
}
function options(){
 return Object.entries(definitions).map(([value,d])=>'<option value="'+value+'">'+esc(d.title)+'</option>').join('');
}
function renderComponents(){
 const box=$('axComponents');if(!box)return;
 const target=obj();
 if(!target){box.innerHTML='<h3>⚡ Componentes</h3><p class="ax08-note">Selecione um objeto na cena ou em Objetos para adicionar comportamentos sem escrever código.</p>';return;}
 const list=ensure(target);
 box.innerHTML='<div class="ax08-title"><h3>⚡ Componentes</h3><p>Objeto: <b>'+esc(target.name)+'</b></p><p>Funcionam em projetos de Blocos e Scripts. Não alteram o modo de programação.</p></div>'+
 '<div class="ax08-add"><select id="ax08NewComponent" aria-label="Escolher componente">'+options()+'</select><button data-ax08="add">＋ Adicionar</button></div>'+
 (list.length?list.map(c=>{
  const info=definitions[c.type];
  if(!info)return '';
  return '<article class="ax08-component"><div class="ax08-component-head"><label><input type="checkbox" data-component="'+c.type+'" data-field="enabled" '+(c.enabled!==false?'checked':'')+'> <b>'+esc(info.title)+'</b></label><button data-ax08-remove="'+c.type+'" title="Remover componente">✕</button></div><p>'+esc(info.desc)+'</p>'+
  '<div class="ax08-fields">'+info.fields.map(([key,title,min,max])=>'<label>'+esc(title)+'<input data-component="'+c.type+'" data-field="'+key+'" type="'+(min==='text'?'text':'number')+'" '+(min==='text'?'maxlength="70"':('step="any" min="'+min+'" max="'+max+'"'))+' value="'+esc(c[key]??info.values[key]??'')+'"></label>').join('')+'</div></article>';
 }).join(''):'<p class="ax08-note">Nenhum componente ainda. Experimente Girar, Flutuar ou Coletável.</p>')+
 '<div class="ax08-note"><b>Dica:</b> Objetos ancorados não sofrem gravidade, mas componentes visuais ainda podem animá-los. Use um Portal para mudar de fase sem programar.</div>';
}
function loadDefaults(p){
 p.gameSettings??={};const s=p.gameSettings;
 s.hud??=true;s.showHealth??=true;s.showScore??=true;s.joystickSize??=122;s.actionSize??=78;s.controlOpacity??=.8;s.cameraZoom??=1;s.cameraSmoothing??=.09;s.parallax??=0;s.maxParticles??=220;s.pixelPerfect??=p.mode==='pixel';s.showGameTips??=true;
 return s;
}
function renderGameSettings(){
 const box=$('axGameSettings'),p=get();if(!box||!p)return;const s=loadDefaults(p);
 const num=(key,label,min,max,step=1)=>'<label class="ax08-setting">'+label+'<input data-setting="'+key+'" type="number" step="'+step+'" min="'+min+'" max="'+max+'" value="'+s[key]+'"></label>';
 const check=(key,label)=>'<label class="ax08-setting ax08-check"><input data-setting="'+key+'" type="checkbox" '+(s[key]?'checked':'')+'> '+label+'</label>';
 box.innerHTML='<div class="ax08-title"><h3>🎮 Configurações do jogo</h3><p>Defina o HUD, o tamanho dos controles, a câmera e a qualidade da renderização. Essas configurações vão junto no jogo exportado.</p></div>'+
 '<div class="ax08-section"><h4>Informações na tela</h4>'+check('hud','Ativar HUD do jogo')+check('showHealth','Mostrar barra de vida')+check('showScore','Mostrar pontuação')+check('showGameTips','Instruções de controle no início')+'</div>'+
 '<div class="ax08-section"><h4>Controles mobile</h4>'+num('joystickSize','Tamanho do analógico (px)',70,210)+num('actionSize','Tamanho dos botões (px)',45,150)+num('controlOpacity','Opacidade dos controles (0 a 1)',.2,1,.05)+'</div>'+
 '<div class="ax08-section"><h4>Câmera e desempenho</h4>'+num('cameraZoom','Zoom inicial',.35,3,.05)+num('cameraSmoothing','Suavidade da câmera (0 a 1)',0,1,.01)+num('maxParticles','Máximo de partículas em cena',10,800)+check('pixelPerfect','Pixels nítidos (sem suavização)')+'</div>'+
 '<p class="ax08-note">O FPS exibido no teste é uma medição aproximada do jogo na tela atual. O desempenho final depende do aparelho.</p>';
}
function previewArt(art,frame=0){
 const s=Number(art.size);if(![8,16,24,32,48,64,96,128].includes(s))throw Error('Tamanho de arte incompatível');
 const f=art.frames?.[frame];if(!f)return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=s;const ctx=canvas.getContext('2d');if(!ctx)return null;
 for(const layer of f.layers||[]){
  if(!layer.visible)continue;
  ctx.globalAlpha=clamp(layer.opacity??1,0,1);
  for(let i=0;i<Math.min(s*s,layer.cells?.length||0);i++){
   const color=layer.cells[i];
   if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))continue;
   ctx.fillStyle=color;ctx.fillRect(i%s,Math.floor(i/s),1,1);
  }
 }
 ctx.globalAlpha=1;return canvas.toDataURL('image/png');
}
function fetchArtworks(){
 return new Promise((resolve,reject)=>{
  if(!global.indexedDB){reject(Error('Armazenamento local indisponível'));return;}
  const req=indexedDB.open('aurenix-pixelstudio-v1',1);
  req.onerror=()=>reject(req.error);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('artworks'))req.result.createObjectStore('artworks',{keyPath:'id'});};
  req.onsuccess=()=>{
   const db=req.result,tx=db.transaction('artworks','readonly'),list=tx.objectStore('artworks').getAll();
   list.onsuccess=()=>{resolve(list.result||[]);db.close();};
   list.onerror=()=>{reject(list.error);db.close();};
  };
 });
}
async function loadArt(){
 const box=$('axPixelBridge');if(!box)return;
 box.innerHTML='<p class="ax08-note">Procurando desenhos salvos no Pixel Studio...</p>';
 try{artList=await fetchArtworks();artList.sort((a,b)=>(b.updated||0)-(a.updated||0));renderArt();}
 catch(e){box.innerHTML='<p class="ax08-note">Não consegui abrir os desenhos locais: '+esc(e.message)+'</p>';}
}
function renderArt(){
 const box=$('axPixelBridge');if(!box)return;
 box.innerHTML='<div class="ax08-title"><h3>🎨 Importar do Pixel Studio</h3><p>Transforme seu pixel art salvo em sprite no jogo atual, sem precisar sair da engine.</p></div><button data-ax08="reloadArt">⟳ Atualizar lista</button>'+
 (artList.length?artList.map((art,i)=>'<div class="ax08-artrow"><span>▦</span><div><b>'+esc(art.name)+'</b><small>'+Number(art.size)+' × '+Number(art.size)+' · '+(art.frames?.length||1)+' quadro(s)</small></div><button data-ax08-import="'+i+'">＋ Sprite</button></div>').join(''):'<p class="ax08-note">Nenhum desenho salvo nesta instalação do Pixel Studio. Abra Pixel Studio pela tela inicial, desenhe algo e toque em Salvar no app.</p>')+
 '<p class="ax08-note">O novo sprite será adicionado aos Arquivos e você poderá usá-lo na cena 2D.</p>';
}
function scriptDiagnostics(){
 const box=$('ax08Check');if(!box)return;
 const p=get();if(!p)return;
 if(p.programming==='blocks'){box.innerHTML='<p class="ax08-note">Projeto de Blocos: o JavaScript é compilado automaticamente. Use a aba Código para editar seus eventos visuais.</p>';return;}
 const source=$('scriptEditor')?.value||'',file=p.mode==='html5';
 if(file){box.innerHTML='<p class="ax08-note">Projetos HTML5 podem ter scripts em arquivos separados. O validador abaixo é exclusivo dos scripts de comportamento de objetos e cenas.</p>';return;}
 try{new Function('self','scene','api','dt',"'use strict';\n"+source);
 box.innerHTML='<div class="ax08-valid">✓ Sintaxe JavaScript válida ('+source.length+' caracteres). O comportamento ainda precisa ser testado durante a partida.</div>';
 }catch(e){
 box.innerHTML='<div class="ax08-invalid">⚠ Erro de sintaxe: '+esc(e.message)+'</div>';
 }
}
function init(config){cfg=config;for(const id of ['tabComponents','tabGameSettings','tabPixelBridge'])if(!$(id))console.warn('Aurenix08: container missing',id);
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-ax08], [data-ax08-remove], [data-ax08-import]');if(!b)return;
  const o=obj(),p=get();
  try{
   if(b.dataset.ax08==='add'){if(!o)return;history();if(!add(o,$('ax08NewComponent').value))message('Este componente já existe no objeto');changed();renderComponents();return;}
   if(b.dataset.ax08==='reloadArt'){loadArt();return;}
   if(b.dataset.ax08Remove){if(!o)return;history();remove(o,b.dataset.ax08Remove);changed();renderComponents();return;}
   if(b.dataset.ax08Import!==undefined){
    const art=artList[Number(b.dataset.ax08Import)];if(!art||!p)return;
    const data=previewArt(art);if(!data)return;
    history();const asset={id:cfg.uid?.()||('img'+Date.now()),name:(art.name||'Pixel Art')+'.png',type:'image/png',data};
    p.assets.push(asset);changed();cfg.onAsset?.(asset);
    message('Sprite importado! Abra Arquivos para colocá-lo na cena.');return;
   }
  }catch(ex){message(ex.message);console.error(ex);}
 });
 document.addEventListener('change',e=>{
  const el=e.target,p=get();if(!p)return;
  if(el.dataset.setting){history();const s=loadDefaults(p),key=el.dataset.setting;const opts={
   joystickSize:[70,210],actionSize:[45,150],controlOpacity:[.2,1],cameraZoom:[.35,3],cameraSmoothing:[0,1],maxParticles:[10,800]
  };s[key]=el.type==='checkbox'?el.checked:clamp(el.value,...(opts[key]||[0,1000]));changed();renderGameSettings();return;}
  if(el.dataset.component){const o=obj();if(!o)return;const c=ensure(o).find(x=>x.type===el.dataset.component);if(!c)return;
   history();const key=el.dataset.field,field=definitions[c.type]?.fields?.find(x=>x[0]===key);
   c[key]=el.type==='checkbox'?el.checked:el.type==='number'?clamp(el.value,field?.[2]??0,field?.[3]??1000):el.value.slice(0,70);
   changed();renderComponents();
  }
 });
 $('scriptEditor')?.addEventListener('input',()=>{clearTimeout(global.__ax08DiagnosticsDelay);global.__ax08DiagnosticsDelay=setTimeout(scriptDiagnostics,350);});
 renderAll();
}
function renderAll(){renderComponents();renderGameSettings();renderArt();scriptDiagnostics();}
global.Aurenix08={definitions,ensure,add,remove,loadDefaults,previewArt,init,renderAll,renderComponents,renderGameSettings,loadArt,scriptDiagnostics};
})(window);