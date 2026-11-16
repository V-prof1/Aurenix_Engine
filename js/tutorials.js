/* Aurenix Academy — desafios contextuais, 100% opcionais.
 * Avanço apenas após uma ação real no alvo; nunca força o primeiro acesso.
 */
(function(w){
'use strict';
const $=sel=>document.querySelector(sel);
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const lessons=w.AurenixCourses||[];
const page=location.pathname.endsWith('pixelstudio.html')?'pixel':location.pathname.endsWith('modelstudio.html')?'model':'editor';
const groups=['Todas','Primeiros passos','Jogo 2D','Jogo 3D','Pixel Art','Animação 2D','Animação 3D','Modelagem 3D','Publicar'];
let hub=null,card=null,current=null,index=0,done=false,activeTarget=null,activeOriginal=null,filter='Todas',search='',timer=0,entering=false,beforeAction=null;
const key=id=>'aurenix-academy-complete-'+id;
function bridge(){return page==='editor'?w.AurenixTutorialBridge:page==='model'?w.AurenixModelTutorialBridge:w.AurenixPixelTutorialBridge;}
function visible(el){return !!(el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');}
function lessonById(id){return lessons.find(x=>x.id===id);}
function completed(id){try{return localStorage.getItem(key(id))==='1';}catch(_){return false;}}
function markComplete(id){try{localStorage.setItem(key(id),'1');}catch(_){}}
function ensureUI(){
 if(hub)return;
 hub=document.createElement('div');hub.id='axAcademyHub';hub.className='ax-academy-hub ax-guide-hidden';hub.setAttribute('role','dialog');hub.setAttribute('aria-modal','true');hub.setAttribute('aria-label','Centro de tutoriais Aurenix');
 hub.innerHTML='<div class="ax-academy-window"><header><div><small>APRENDA FAZENDO • SEM PRESSÃO</small><h2>🎓 Tutoriais Aurenix</h2><p>Escolha uma aula e faça os passos diretamente nas ferramentas de verdade. Seus jogos pessoais ficam separados dos laboratórios.</p></div><button id="axAcademyDismiss" aria-label="Fechar tutoriais">✕</button></header><input id="axAcademySearch" type="search" placeholder="Pesquisar: olhos, pixel, 3D, programação…" aria-label="Pesquisar tutoriais"><div class="ax-academy-filters" id="axAcademyFilters"></div><p class="ax-academy-total" id="axAcademyTotal"></p><div id="axAcademyList" class="ax-academy-list"></div><footer><span>Os tutoriais são opcionais. Durante uma aula, siga o elemento iluminado para liberar o próximo passo.</span><button id="axAcademyCloseBottom">Voltar ao editor</button></footer></div>';
 document.body.appendChild(hub);
 card=document.createElement('section');card.id='axAcademyGuide';card.className='ax-academy-guide ax-guide-hidden';card.setAttribute('role','region');card.setAttribute('aria-label','Passos do tutorial');
 card.innerHTML='<div class="ax-guide-line"><span id="axGuideKicker"></span><button id="axGuideExit" title="Sair do tutorial">✕ Sair</button></div><div class="ax-guide-progress"><div id="axGuideFill"></div></div><h3 id="axGuideTitle"></h3><p id="axGuideHelp"></p><div id="axGuideHint" class="ax-guide-hint"></div><div class="ax-guide-actions"><button id="axGuidePrev">↶ Anterior</button><button id="axGuideNext" disabled>Próximo →</button></div>';
 document.body.appendChild(card);
 hub.querySelector('#axAcademyDismiss').addEventListener('click',closeHub);
 hub.querySelector('#axAcademyCloseBottom').addEventListener('click',closeHub);
 hub.querySelector('#axAcademySearch').addEventListener('input',e=>{search=e.target.value.toLocaleLowerCase();renderHub();});
 hub.querySelector('#axAcademyFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;renderHub();});
 hub.querySelector('#axAcademyList').addEventListener('click',e=>{const b=e.target.closest('[data-course]');if(b)launch(b.dataset.course);});
 card.querySelector('#axGuideExit').addEventListener('click',exitLesson);
 card.querySelector('#axGuidePrev').addEventListener('click',()=>{if(index>0){index--;done=false;renderStep();}});
 card.querySelector('#axGuideNext').addEventListener('click',async()=>{if(!done)return;if(index+1<current.steps.length){index++;done=false;renderStep();return;}await finishLesson();});
 document.addEventListener('click',gate,true);
 document.addEventListener('click',action,false);
 document.addEventListener('change',action,false);
 document.addEventListener('input',action,false);
 document.addEventListener('pointerup',action,false);
 w.addEventListener('resize',()=>{if(current&&!done)position();});
}
function renderHub(){
 const total=lessons.length,finished=lessons.filter(c=>completed(c.id)).length;
 $('#axAcademyFilters').innerHTML=groups.map(g=>'<button type="button" data-filter="'+esc(g)+'" class="'+(g===filter?'active':'')+'">'+esc(g)+'</button>').join('');
 const found=lessons.filter(c=>(filter==='Todas'||filter===c.group)&&(!search||(c.title+' '+c.desc+' '+c.group).toLocaleLowerCase().includes(search)));
 $('#axAcademyTotal').textContent=total+' aulas práticas • '+finished+' concluídas • '+found.length+' exibidas';
 $('#axAcademyList').innerHTML=found.map(c=>{
  const ok=completed(c.id);
  const icon=c.track==='model'?'🎭':c.track==='pixel'?'🎨':c.track==='3d'?'⬡':c.group==='Publicar'?'📦':'◇';
  return '<article class="ax-academy-item"><span class="ax-course-icon">'+icon+'</span><div><small>'+esc(c.group)+' · '+c.steps.length+' passos</small><strong>'+esc(c.title)+'</strong><p>'+esc(c.desc||'Aprenda fazendo, diretamente no editor.')+'</p></div><button data-course="'+esc(c.id)+'">'+(ok?'✓ Refazer':'▶ Começar')+'</button></article>';
 }).join('')||'<p>Nenhuma aula encontrada para esta pesquisa.</p>';
}
function openHub(){
 ensureUI();if(current)exitLesson(false);$('#axAcademyHub').classList.remove('ax-guide-hidden');$('#axAcademySearch').value='';filter='Todas';search='';renderHub();
}
function closeHub(){hub?.classList.add('ax-guide-hidden');}
function launch(id){
 const c=lessonById(id);if(!c)return;
 closeHub();
 const toPage=c.track==='model'?'model':c.track==='pixel'?'pixel':'editor';
 if(toPage!==page){location.href=(toPage==='model'?'modelstudio.html':toPage==='pixel'?'pixelstudio.html':'index.html')+'?ax-tutorial='+encodeURIComponent(id);return;}
 start(c).catch(error=>{console.error('[Aurenix tutoriais]',error);alert('Não foi possível iniciar este tutorial: '+error.message);openHub();});
}
async function start(course){
 if(entering)return;entering=true;
 try{
  ensureUI();
  const b=bridge();
  if(!b)throw new Error('A interface do editor ainda está carregando.');
  if(page==='editor'){
    if(course.id==='primeiro-projeto'){await b.prepareManualProject();}
    else await b.openProject(course.track,course);
  }else await b.openProject();
  current=course;index=0;done=false;beforeAction=null;
  card.classList.remove('ax-guide-hidden');
  renderStep();
 }finally{entering=false;}
}
function findTarget(selector){
 if(!selector)return null;
 if(page==='model'&&selector==='#openParts'&&!visible($('#openParts')))return $('#leftPanel h2');
 if(page==='model'&&selector==='#openProps'&&!visible($('#openProps')))return $('#rightPanel h2');
 if((current?.id==='jogador3d'||current?.id==='personagem2d')&&selector==='#objectList [data-id]'){
  return Array.from(document.querySelectorAll(selector)).find(e=>/player2d|player3d/i.test(e.textContent))||$(selector);
 }
 if(selector==='#axComponents [data-ax08="add"]')return $('[data-ax08="add"]');
 return $(selector);
}
function prepare(step){
 const b=bridge();
 if(page==='editor'){
  if(step.tab) b?.goTo?.(step.tab);
  if(step.target.includes('[data-prop=')||step.tab==='inspector')b?.goTo?.('inspector');
 }else if(page==='model'){
  const needsLeft=/#tree|data-expression|data-auto|data-kit|#addFace|#preset|#newPreset|#addPart|#mirrorPart/.test(step.target);
  const needsRight=/#inspector|#faceStrength/.test(step.target);
  if(needsLeft)b?.drawer?.('left');
  if(needsRight)b?.drawer?.('right');
 }
}
function clearSpot(){
 if(activeTarget){activeTarget.classList.remove('ax-academy-spot');activeTarget.style.removeProperty('--ax-spot-z');}
 activeTarget=null;activeOriginal=null;clearTimeout(timer);
}
function showSpot(){
 if(!current||done)return;
 const step=current.steps[index];
 prepare(step);
 clearSpot();
 const el=findTarget(step.target);
 activeOriginal=step.target;
 if(!visible(el)){
  $('#axGuideHint').textContent='🔎 Procurando esta ferramenta. Abra o painel indicado, selecione um objeto ou conclua a etapa anterior.';
  timer=setTimeout(showSpot,800);
  return;
 }
 activeTarget=el;el.classList.add('ax-academy-spot');
 try{el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});}catch(_){el.scrollIntoView({block:'center',inline:'nearest'});}
 $('#axGuideHint').textContent='👆 Execute a ação no controle iluminado para liberar o próximo passo.';
 position();
}
function position(){
 if(!current||!card)return;
 const rect=activeTarget?.getBoundingClientRect();
 const preferBottom=rect && rect.top<Math.min(250,innerHeight*.36) && innerHeight>520;
 card.classList.toggle('ax-guide-at-bottom',!!preferBottom);
}
function renderStep(){
 if(!current)return;
 done=false;
 $('#axGuideKicker').textContent=current.group.toLocaleUpperCase()+' · ETAPA '+(index+1)+'/'+current.steps.length;
 $('#axGuideTitle').textContent=current.title;
 $('#axGuideHelp').textContent=current.steps[index].help;
 $('#axGuideFill').style.width=((index+1)/current.steps.length*100)+'%';
 $('#axGuidePrev').disabled=index===0;
 $('#axGuideNext').disabled=true;$('#axGuideNext').textContent=index+1===current.steps.length?'Concluir ✓':'Próximo →';
 $('#axGuideHint').textContent='Localizando ferramenta…';
 showSpot();
}
function gate(e){
 if(!current||done||hub&&!hub.classList.contains('ax-guide-hidden'))return;
 if(e.target.closest('#axAcademyGuide'))return;
 const target=activeTarget;
 if(!target||!(e.target===target||target.contains(e.target))){
  // A etapa é orientada: outros botões ficam bloqueados, mas a página pode rolar.
  if(e.target.closest('button,input,select,textarea,a,[role="button"]')){e.preventDefault();e.stopImmediatePropagation();$('#axGuideHint').textContent='🔒 Primeiro complete a ação destacada. Use Sair para abandonar o tutorial.';}
 }
}
function action(e){
 if(!current||done||!activeTarget)return;
 const step=current.steps[index];
 if(e.type!==step.event)return;
 if(!(e.target===activeTarget||activeTarget.contains(e.target)))return;
 // Aguarde o handler original atualizar o estado do projeto antes de validar.
 setTimeout(()=>{
  if(!current||done||current.steps[index]!==step)return;
  if(step.verify&&!validStep(step.verify))return;
  done=true;clearSpot();
  $('#axGuideHint').textContent='✅ Muito bem! Etapa concluída. Pode avançar.';
  $('#axGuideNext').disabled=false;
 },60);
}
function validStep(v){
 const state=bridge()?.state?.()||{};
 if(v==='objectAdded')return (state.objects||0)>(beforeAction?.objects||0);
 if(v==='clip')return (state.clips||0)>0;
 return true;
}
async function finishLesson(){
 const course=current;if(!course)return;
 if(page==='editor'){
  if(course.id==='primeiro-projeto')await bridge()?.adoptProject?.('2d');
  else await bridge()?.save?.();
 }else await bridge()?.save?.();
 markComplete(course.id);
 exitLesson(false);
 if(page!=='editor'){location.href='index.html#tutorials';return;}
 openHub();
}
function exitLesson(openCatalog=false){
 clearSpot();current=null;done=false;
 card?.classList.add('ax-guide-hidden');
 if(openCatalog){if(page==='editor')openHub();else location.href='index.html#tutorials';}
}
function attachButtons(){
 if(page==='editor'){
  if(!$('#axAcademyButton')){
   const home=document.querySelector('.ax-homeactions');
   if(home){const b=document.createElement('button');b.id='axAcademyButton';b.type='button';b.className='ax-academy-homebutton';b.textContent='🎓 Tutoriais práticos';home.appendChild(b);b.onclick=openHub;}
  }
  const top=$('#menuPopover');if(top&&!$('#axAcademyMenu')){const b=document.createElement('button');b.id='axAcademyMenu';b.textContent='🎓 Tutoriais práticos';top.prepend(b);b.onclick=()=>{top.classList.add('hidden');openHub();};}
 }else {
  const header=document.querySelector('header');if(header&&!$('#axAcademyButton')){const b=document.createElement('button');b.id='axAcademyButton';b.textContent='🎓 Tutoriais';b.onclick=()=>location.href='index.html#tutorials';header.appendChild(b);}
 }
}
function boot(){
 ensureUI();attachButtons();
 const params=new URLSearchParams(location.search),id=params.get('ax-tutorial');
 if(id&&lessonById(id)){
  history.replaceState(null,'',location.pathname+location.hash);
  const tryStart=async(n=0)=>{
   if(!bridge()||(page==='editor'&&!w.AurenixHome?.isOpen?.())){
    if(n<50)setTimeout(()=>tryStart(n+1),150);
    return;
   }
   launch(id);
  };
  tryStart();
 }
 if(page==='editor'&&location.hash==='#tutorials'){history.replaceState(null,'',location.pathname+location.search);setTimeout(openHub,350);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
w.AurenixTutorials={open:openHub,lessons,launch,completed};
})(window);