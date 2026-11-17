/* Aurenix Engine — Início mobile, biblioteca de projetos e ações rápidas. */
(function(global){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let api=null,root=null,visible=false;
function create(){
root=document.createElement('section');root.id='axHome';root.className='ax-home hidden';root.setAttribute('aria-label','Início Aurenix Engine');
root.innerHTML='<div class="ax-homewrap">'+
 '<header class="ax-homeheader"><div class="ax-homebrand"><span class="ax-homeglyph">A✦</span><div><b>AURENIX <em>ENGINE</em></b><small>CRIAR · EXPLORAR · JOGAR</small></div></div><span class="ax-alpha">ALPHA 0.16</span><button data-home="continue" class="ax-continue">↩ Voltar ao editor</button></header>'+
 '<div class="ax-homehero"><div class="ax-eyebrow">SEU ESTÚDIO DE JOGOS, NO CELULAR</div><h1>O que vamos criar hoje?</h1><p>Comece do zero, continue seu jogo ou desenhe sprites. Conta Google opcional para backups, sem assinatura.</p><div class="ax-homeactions"><button class="ax-primary" data-home="create">＋ Novo jogo</button><button data-home="pixel">▦ Pixel Studio</button><button class="ax-academy-homebutton" data-home="tutorials">🎓 Tutoriais práticos</button><button data-home="model">🎭 Model Studio 3D</button><button data-home="import">⇧ Importar projeto</button><button data-home="audio">♫ Áudio</button><button data-home="settings">🎨 17 temas</button><button class="ax-cloud-home" data-home="cloud">☁ Aurenix Cloud</button></div></div>'+
 '<div class="ax-homestats"><span><b id="axHomeCount">0</b><small>Projetos no aparelho</small></span><span><b>2D + 3D</b><small>Jogos e cenas</small></span><span><b>Blocos / JS</b><small>Programação</small></span></div>'+
 '<div class="ax-homeheading"><div><span class="ax-eyebrow">BIBLIOTECA</span><h2>Seus projetos</h2></div><button data-home="refresh">⟳ Atualizar</button></div>'+
 '<div class="ax-homefilters"><input id="axHomeSearch" aria-label="Buscar projetos" placeholder="Buscar pelo nome do jogo..."><select id="axHomeFilter" aria-label="Filtrar tipo"><option value="all">Todos os modos</option><option value="2d">2D</option><option value="pixel">Pixel</option><option value="3d">3D</option><option value="html5">HTML5</option></select></div>'+
 '<div id="axHomeGrid" class="ax-homegrid" aria-live="polite"></div>'+
 '<footer class="ax-homefooter"><span>Projetos salvos neste aparelho. Use ☁ Aurenix Cloud para criar backups no seu Google Drive.</span><button data-home="help">? Ajuda</button></footer></div>';
document.body.appendChild(root);
root.addEventListener('click',async e=>{
 const b=e.target.closest('button[data-home],button[data-open],button[data-delete],button[data-rename],button[data-copy],button[data-backup]');
 if(!b)return;
 try{
 const op=b.dataset.home;
 if(op==='continue'){close();return;}
 if(op==='refresh'){await refresh();return;}
 if(op==='tutorials'){window.AurenixTutorials?.open();return;}
 if(op==='create'){api?.create?.();return;}
 if(op==='import'){api?.import?.();return;}
 if(op==='pixel'){api?.pixel?.();return;}if(op==='model'){api?.model?.();return;}
 if(op==='help'){api?.help?.();return;}
 if(op==='audio'){api?.audio?.();return;}
 if(op==='settings'){api?.settings?.();return;}if(op==='cloud'){api?.cloud?.();return;}
 if(b.dataset.open){await api.open?.(b.dataset.open);close();return;}
 if(b.dataset.copy){await api.copy?.(b.dataset.copy);await refresh();return;}
 if(b.dataset.rename){const p=(await api.list())?.find(p=>p.id===b.dataset.rename);if(!p)return;const name=prompt('Novo nome do projeto:',p.name||'Projeto');if(name&&name.trim()){await api.rename?.(p.id,name.trim().slice(0,70));await refresh();}return;}
 if(b.dataset.backup){await api.backup?.(b.dataset.backup);return;}
 if(b.dataset.delete){if(!confirm('Excluir permanentemente este projeto salvo do aparelho?'))return;await api.remove?.(b.dataset.delete);await refresh();}
 }catch(ex){console.error(ex);alert('Não foi possível executar essa ação: '+ex.message);}
});
root.querySelector('#axHomeSearch').addEventListener('input',refresh);
root.querySelector('#axHomeFilter').addEventListener('change',refresh);
}
async function refresh(){
 if(!root)return;
 const out=root.querySelector('#axHomeGrid'),filter=root.querySelector('#axHomeFilter').value,search=root.querySelector('#axHomeSearch').value.trim().toLocaleLowerCase();
 let projects=[];
 try{projects=await api.list?.()||[];}catch(e){out.innerHTML='<p class="ax-homeempty">Armazenamento indisponível. Use backups JSON para conservar projetos.</p>';return;}
 projects.sort((a,b)=>(b.updated||0)-(a.updated||0));
 root.querySelector('#axHomeCount').textContent=projects.length;
 const arr=projects.filter(p=>(filter==='all'||p.mode===filter)&&String(p.name||'').toLocaleLowerCase().includes(search));
 out.innerHTML=arr.length?arr.map(p=>{
 const color=p.mode==='3d'?'#a69cfa':p.mode==='pixel'?'#e8b96b':p.mode==='html5'?'#7cb7ff':'#69dfcf',ico=p.mode==='3d'?'⬡':p.mode==='pixel'?'▦':p.mode==='html5'?'⌘':'◇';
 const date=new Date(p.updated||Date.now()).toLocaleDateString('pt-BR');
 return '<article class="ax-projectcard"><div class="ax-cover" style="--cover:'+color+'">'+ico+'<span>'+esc((p.mode||'2d').toUpperCase())+'</span></div><div class="ax-projectbody"><h3>'+esc(p.name||'Novo jogo')+'</h3><p>'+esc(p.programming==='blocks'?'🧱 Blocos':'⌘ Scripts')+' · '+esc(String(p.objects?.length||0))+' objetos · '+esc(date)+'</p><button class="ax-open" data-open="'+esc(p.id)+'">▶ Abrir editor</button><div class="ax-cardtools"><button title="Renomear" data-rename="'+esc(p.id)+'">✎ Nome</button><button title="Duplicar" data-copy="'+esc(p.id)+'">▣ Copiar</button><button title="Exportar backup" data-backup="'+esc(p.id)+'">⇩ Backup</button><button class="ax-delete" title="Excluir" data-delete="'+esc(p.id)+'">✕</button></div></div></article>';
 }).join(''):'<div class="ax-homeempty"><div class="ax-emptysymbol">◇</div><b>Nenhum projeto encontrado</b><p>Toque em Novo jogo para criar sua primeira cena.</p><button class="ax-primary" data-home="create">＋ Criar projeto</button></div>';
}
function open(){if(!root)create();visible=true;root.classList.remove('hidden');document.body.classList.add('ax-home-active');refresh();}
function close(){if(!root)return;visible=false;root.classList.add('hidden');document.body.classList.remove('ax-home-active');}
function init(options){api=options;if(!root)create();}
global.AurenixHome={init,open,close,refresh,isOpen:()=>visible};
})(window);