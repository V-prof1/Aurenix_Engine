/* Aurenix 0.8 — Central de ferramentas mobile com busca e atalhos.
   Evita depender de encontrar uma aba numa barra extensa em telas pequenas. */
(function(window){
'use strict';
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const links=[
 ['objects','☰','Objetos','Criar, selecionar, bloquear e mover objetos'],
 ['scenes','🎬','Cenas','Criar e gerenciar fases do jogo'],
 ['components','⚡','Componentes','Comportamentos sem código'],
 ['inspector','⚙','Inspetor','Posição, tamanho, colisões, saúde e aparência'],
 ['code','⌘','Programação','JavaScript ou blocos, conforme o projeto'],
 ['animation','🎞','Animações','Keyframes, poses e reprodução'],
 ['tiles','▦','Mapa 2D','Pintar tiles e configurar colisões'],
 ['audio','♫','Áudio','Músicas, efeitos e volumes'],
 ['assets','◈','Arquivos','Importar imagens, sons e modelos OBJ'],
 ['pixel','▧','Pixel integrado','Desenho rápido dentro do projeto'],
 ['pixelBridge','🎨','Sprites salvos','Trazer desenhos do Pixel Studio'],
 ['prefabs','▣','Prefabs','Salvar e reutilizar objetos'],
 ['gameSettings','🎮','Configurar jogo','HUD, controles e câmera'],
 ['theme','🌈','17 temas','Personalizar as cores da engine'],
 ['pixelStudio','✎','Pixel Studio completo','Desenhar sprites, quadros e camadas'],
 ['play','▶','Testar jogo','Executar a cena atual'],
 ['save','▣','Salvar projeto','Guardar no aplicativo'],
 ['export','⬇','Exportar jogo','HTML5 e template para APK']
];
let overlay=null,search=null,handler=()=>{};
function render(query=''){
 const result=links.filter(([,icon,name,description])=>(name+' '+description).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const box=overlay?.querySelector('#axToolboxList');if(!box)return;
 box.innerHTML=result.map(([id,icon,name,description])=>'<button type="button" data-toolbox="'+id+'"><span class="ax-toolbox-ico">'+icon+'</span><span><strong>'+escape(name)+'</strong><small>'+escape(description)+'</small></span><b>›</b></button>').join('')||'<p class="ax-toolbox-empty">Nenhuma ferramenta encontrada.</p>';
}
function ensure(){
 if(overlay)return;
 overlay=document.createElement('div');overlay.className='ax-toolbox-overlay hidden';overlay.id='axToolboxOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Central de ferramentas Aurenix');overlay.setAttribute('aria-modal','true');
 overlay.innerHTML='<section class="ax-toolbox-shell"><header><div><small>ENCONTRE QUALQUER FUNÇÃO</small><h2>🧰 Central de ferramentas</h2><p>Toque na função desejada. Não precisa procurar em várias abas.</p></div><button id="axToolboxClose" aria-label="Fechar ferramentas">✕</button></header><input id="axToolboxSearch" placeholder="🔎 Ex.: animações, 3D, música..." autocomplete="off" aria-label="Buscar ferramentas"><div id="axToolboxList" class="ax-toolbox-list"></div></section>';
 document.body.appendChild(overlay);
 search=overlay.querySelector('#axToolboxSearch');
 search.addEventListener('input',()=>render(search.value));
 overlay.addEventListener('click',e=>{
  if(e.target===overlay||e.target.closest('#axToolboxClose')){close();return;}
  const b=e.target.closest('[data-toolbox]');if(!b)return;
  const id=b.dataset.toolbox;close();handler(id);
 });
 render();
}
function open(){ensure();overlay.classList.remove('hidden');search.value='';render();setTimeout(()=>search.focus({preventScroll:true}),30);}
function close(){overlay?.classList.add('hidden');}
function isOpen(){return !!overlay&&!overlay.classList.contains('hidden');}
function init(fn){handler=fn;}
window.AurenixToolbox={open,close,isOpen,init,links};
})(window);