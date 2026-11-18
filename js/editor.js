/* Aurenix Engine — Editor gratuito, mobile-first. © projeto original disponibilizado para edição. */
(function(){'use strict';
const R=window.AurenixRuntime,Z=window.AurenixZip,S=window.AurenixStudio07,E=window.Aurenix08,T=window.AurenixToolbox,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let project=R.makeTemplate('platformer'),selectedId='',activeTab='objects',tool='select',showGrid=true,snap=true,history=[],future=[],images={},webgl=null,projectDirty=true,db=null,toastTimer=null,externalHash='',pointerMap=new Map(),drag=null,lastSave=0;
let camera2={x:0,y:50,zoom:1},camera3={target:[0,0,0],yaw:.7,pitch:.63,distance:17};
const sceneCanvas=$('sceneCanvas'),scene3dCanvas=$('scene3dCanvas'),externalView=$('externalView'),viewport=$('viewport');
const icons={rect:'▰',circle:'●',text:'T',sprite:'▧',player2d:'♟',cube:'⬡',sphere:'◉',cylinder:'⬢',plane:'▰',player3d:'♟',pyramid:'◆',model3d:'⬟',character3d:'♟',cone:'▲',torus:'◎',capsule:'⬟'};
const selected=()=>project.objects.find(o=>o.id===selectedId)||null;
const isSceneLocked=o=>!!o?.editorLocked;
const axis3d=window.AurenixAxis3D?.create($('axisCanvas'),({axis,yaw,pitch})=>{
 camera3.yaw=yaw;
 camera3.pitch=pitch;
 toast('Câmera alinhada ao eixo '+axis);
});

const gizmo3d=window.AurenixGizmo?.create({
 viewport,scene3dCanvas,getProject:()=>project,getSelected:selected,getRenderer:()=>webgl,getCamera:()=>camera3,
 onStart:historyPush,onChange:markDirty,onEnd:()=>{renderInspector();renderObjects();S?.renderAnimations();},getSnap:()=>snap,getTool:()=>tool
});
const validColor=s=>/^#[a-f\d]{6}$/i.test(s||'')?s:'#6fcddd';
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('shown');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('shown'),2900);}
function markDirty(){projectDirty=true;project.updated=Date.now();$('saveStatus').textContent='● Alterações não salvas';}
function historyPush(){history.push(JSON.stringify(project));if(history.length>35)history.shift();future=[];}
function undo(){gizmo3d?.cancel?.();S?.stopPreview?.();if(!history.length)return;future.push(JSON.stringify(project));project=JSON.parse(history.pop());syncAll();markDirty();}
function redo(){gizmo3d?.cancel?.();S?.stopPreview?.();if(!future.length)return;history.push(JSON.stringify(project));project=JSON.parse(future.pop());syncAll();markDirty();}
function touchProject(){markDirty();renderObjects();renderInspector();renderSummary();S?.renderAnimations();S?.renderPrefabs();E?.renderComponents();}
function setProject(p){gizmo3d?.cancel?.();pointerMap.clear();drag=null;S?.stopPreview();project=p;tool='select';document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool==='select'));window.AurenixHome?.close();project.programming=project.programming==='blocks'?'blocks':'script';if(project.programming==='blocks')window.AurenixBlocks?.compileAll(project);project.id||=R.uid();project.assets||=[];project.objects||=[];project.mode||='2d';project.background||='#101c31';project.grid||=32;project.gravity??=1100;project.genre||='platformer';E?.loadDefaults(project);S?.ensureScenes(project);selectedId=project.objects.find(o=>o.type==='player2d'||o.type==='player3d')?.id||project.objects[0]?.id||'';history=[];future=[];camera2=initialCamera2(project);camera3={target:[0,0,0],yaw:.7,pitch:.63,distance:17};externalHash='';ensurePixel();syncAll();markDirty();}
function initialCamera2(p){const player=p.objects?.find(o=>o.type==='player2d');if(window.innerWidth<=650&&player)return {x:player.x+50,y:player.y-100,zoom:1};return {x:0,y:50,zoom:1};}
function syncAll(){window.AurenixAdvancedEditor17?.render?.();$('projectName').value=project.name||'Projeto';images=R.imgMap(project);renderObjects();renderAssets();renderInspector();renderSummary();renderProjects();syncMode();updateScriptUI();window.AurenixAudio?.render();S?.renderAll();E?.renderAll();window.AurenixModelBridge?.refresh?.();window.AurenixAdvancedEditor17?.render?.();}
function syncMode(){const is3d=project.mode==='3d',isHTML=project.mode==='html5';document.body.classList.toggle('ax-mode-3d',is3d);sceneCanvas.classList.toggle('hidden',is3d||isHTML);scene3dCanvas.classList.toggle('hidden',!is3d);externalView.classList.toggle('hidden',!isHTML);document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===project.mode));$('viewTag').innerHTML=(is3d?'⬡ EDITOR 3D':isHTML?'⌘ PROJETO HTML5':project.mode==='pixel'?'▦ PIXEL ART':'◇ EDITOR 2D')+' <span>• '+esc((project.scenes||[]).find(x=>x.id===project.activeSceneId)?.name||'Cena 1')+'</span>';$('viewHint').textContent=is3d?'Selecione e use Mover XYZ, Girar ou Escalar • 2 dedos para zoom':isHTML?'Prévia HTML5 isolada • Edite o HTML na aba Código':'Toque para selecionar • Arraste para mover • Pinça para zoom';$('axisGizmo').style.display=is3d?'flex':'none';if(isHTML)refreshExternal();}
function renderObjects(){const list=$('objectList');const query=($('objectSearch')?.value||'').trim().toLocaleLowerCase();if(project.mode==='html5'){list.innerHTML='<div class="section-description">Este projeto HTML5 usa arquivos próprios. Abra a aba <b>Código</b> para editar index.html ou teste o projeto.</div>';return;}list.innerHTML=(project.objects||[]).filter(o=>!query||[o.name,o.type,o.tags].some(x=>String(x||'').toLocaleLowerCase().includes(query))).slice().sort((a,b)=>(b.layer||0)-(a.layer||0)).map(o=>`<div class="object-row ${o.id===selectedId?'selected':''}" data-id="${esc(o.id)}"><span class="object-ico">${icons[o.type]||'◇'}</span><div class="name">${esc(o.name)}<small>${esc(o.type)} · ${esc(o.id)}</small></div><button class="ax-obj-lock" data-togglelock="${esc(o.id)}" title="${o.editorLocked?'Desbloquear na cena':'Bloquear seleção na cena'}">${o.editorLocked?'🔒':'🔓'}</button><button class="visibility" data-visible="${esc(o.id)}" title="Visibilidade">${o.visible?'◉':'○'}</button></div>`).join('')||'<div class="section-description">Cena vazia. Toque em <b>Adicionar</b> para criar objetos.</div>';}
function renderSummary(){$('sceneSummary').innerHTML=`Tipo: <strong>${esc(project.mode.toUpperCase())}</strong><br>Objetos: <strong>${project.objects?.length||0}</strong><br>Arquivos: <strong>${project.assets?.length||0}</strong><br>Gênero: <strong>${esc(project.genre||'custom')}</strong>`;$('statusObjects').textContent=`${project.objects?.length||0} objetos • ${project.assets?.length||0} arquivos`;}
function characterAssetButton(a){return a.type==='application/x-aurenix-character+json'?'<button data-placecharacter="'+esc(a.id)+'" title="Adicionar personagem animado">🎭</button>':'';}
function renderAssets(){const query=($('assetSearch')?.value||'').trim().toLocaleLowerCase();$('assetList').innerHTML=(project.assets||[]).filter(a=>!query||String(a.name||'').toLocaleLowerCase().includes(query)||String(a.type||'').toLocaleLowerCase().includes(query)).map(a=>`<div class="asset-row">${a.type.startsWith('image/')?`<img src="${a.data}" alt="">`:'<span class="object-ico">'+(a.gltf?'⬡':'♫')+'</span>'}<div class="info"><strong>${esc(a.name)}</strong><small>${esc(a.type)}${a.gltf?' • '+a.gltf.joints+' ossos • '+a.gltf.clips.length+' animações':''}</small></div>${a.type.startsWith('image/')?`<button data-placeasset="${esc(a.id)}" title="Criar sprite">＋</button>`:''}${/\\.obj$/i.test(a.name||'')?`<button data-placemodel="${esc(a.id)}" title="Criar modelo 3D">⬟</button>`:''}${characterAssetButton(a)}<button data-renasset="${esc(a.id)}" title="Renomear">✎</button><button data-exportasset="${esc(a.id)}" title="Exportar">⇩</button><button data-removeasset="${esc(a.id)}" title="Remover">✕</button></div>`).join('')||'<div class="section-description">Nenhum arquivo ainda. Importe uma imagem ou desenhe na aba Pixel.</div>';}
function fld(name,key,value,type='number',opts={}){return `<div class="field"><label>${name}</label><input data-prop="${key}" ${type==='number'?`type="number" step="${opts.step||'any'}"`:type==='color'?'type="color"':'type="text"'} value="${esc(value)}"></div>`;}
function checkbox(name,key,value){return `<label class="field-check">${name}<input type="checkbox" data-prop="${key}" ${value?'checked':''}></label>`;}
function renderInspector(){const o=selected();if(project.mode==='html5'){$('inspector').innerHTML=`<div class="inspector-top"><span class="big-ico">⌘</span><div><strong>Projeto HTML5</strong><small>${esc(project.external?.entry||'index.html')}</small></div></div><div class="inspector-group"><h4>ARQUIVOS INCLUÍDOS</h4><div class="section-description">${Object.keys(project.external?.files||{}).map(s=>`• ${esc(s)}`).join('<br>')}</div><button id="openCodeHtml" class="btn primary wide">Editar HTML</button></div><div class="section-description">Projetos importados preservam seus arquivos na exportação ZIP e no modelo para APK. O editor de objetos não interpreta HTML/CSS como objetos da cena.</div>`;return;}
 if(!o){$('inspector').innerHTML=`<div class="empty-inspector"><span class="illustration">⬡</span><strong>Nenhum objeto selecionado</strong><p>Toque em um objeto na cena ou na hierarquia para editar posição, tamanho, aparência e comportamento.</p><button id="emptyAdd" class="btn primary">＋ Adicionar objeto</button></div>`;return;}
 const is3d=project.mode==='3d';let html=`<div class="inspector-top"><span class="big-ico">${icons[o.type]||'◇'}</span><div><strong>${esc(o.name)}</strong><small>${esc(o.type)} · ${esc(o.id)}</small></div></div><div class="inspector-group"><h4>IDENTIDADE</h4>${fld('Nome','name',o.name,'text')}${fld('Tags (separadas por vírgula)','tags',o.tags||'','text')}${checkbox('Visível','visible',o.visible)}${checkbox('⚓ Ancorado — sem física nem gravidade','anchored',!!o.anchored)}${checkbox('🔒 Bloqueado na cena — só selecionar em Objetos','editorLocked',!!o.editorLocked)}</div><div class="inspector-group"><h4>TRANSFORMAÇÃO</h4>${is3d?`<p class="ax-inspector-hint">↔ Arraste os 6 pontos coloridos no objeto para ajustar largura, altura e profundidade. Os campos numéricos são opcionais.</p>`:``}<div class="field-row ${is3d?'tri':''}">${fld('Posição X','x',round(o.x))}${fld('Posição Y','y',round(o.y))}${is3d?fld('Posição Z','z',round(o.z)):''}</div><div class="field-row ${is3d?'tri':''}">${fld('Largura','w',round(o.w))}${fld('Altura','h',round(o.h))}${is3d?fld('Profundidade','d',round(o.d)):''}</div>${is3d?`<div class="field-row tri">${fld('Rot. X','rx',round(o.rx))}${fld('Rot. Y','ry',round(o.ry))}${fld('Rot. Z','rz',round(o.rz))}</div>`:fld('Rotação (°)','rotation',round(o.rotation))}</div><div class="inspector-group"><h4>APARÊNCIA</h4>${fld('Cor','color',validColor(o.color),'color')}${fld('Opacidade (0 a 1)','opacity',o.opacity??1)}${!is3d?fld('Camada','layer',o.layer):''}${!is3d&&o.type==='text'?`${fld('Texto','text',o.text,'text')}${fld('Fonte (px)','fontSize',o.fontSize)}`:''}${o.type==='model3d'?`<div class="field"><label>Modelo 3D</label><select data-prop="assetId">${project.assets.filter(a=>/\\.obj$/i.test(a.name||'')).map(a=>`<option value="${esc(a.id)}" ${a.id===o.assetId?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>`:''}${o.type==='sprite'?`<div class="field"><label>Imagem</label><select data-prop="assetId">${project.assets.filter(a=>a.type.startsWith('image/')).map(a=>`<option value="${esc(a.id)}" ${a.id===o.assetId?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>`:''}</div><div class="inspector-group"><h4>JOGABILIDADE</h4>${checkbox('Colisão sólida','solid',o.solid)}${o.type.startsWith('player')?`${fld('Vida máxima','maxHealth',o.maxHealth??100)}${fld('Vida inicial','health',o.health??100)}`:''}${!is3d?checkbox('Gravidade (física)','physics',o.physics):''}${o.type.startsWith('player')?`${fld('Velocidade','speed',o.speed)}${fld('Força do pulo','jump',o.jump)}`:''}</div><div class="inspector-group"><h4>COMPORTAMENTO</h4><button id="editSelectedBehavior" class="btn ghost wide">⚡ Abrir componentes sem código</button><button id="editSelectedCode" class="btn ghost wide">${project.programming==='blocks'?'🧱 Programar por blocos':'⌘ Editar script JS'}</button><div class="section-description tiny">Scripts rodam somente durante o teste.</div></div><div class="inspector-actions"><button id="duplicateBtn" class="btn ghost">▣ Duplicar</button><button id="deleteBtn" class="btn danger">✕ Excluir</button></div>`;
 if(o.type==='character3d'){
  const a=project.assets.find(x=>x.id===o.assetId),doc=R.characterAsset(a);
  const assetOptions=project.assets.filter(x=>x.type==='application/x-aurenix-character+json').map(x=>'<option value="'+esc(x.id)+'" '+(x.id===o.assetId?'selected':'')+'>'+esc(x.name)+'</option>').join('');
  const clipOptions=(doc?.animations||[]).map(c=>'<option value="'+esc(c.id)+'" '+(c.id===o.rigClip?'selected':'')+'>'+esc(c.name)+'</option>').join('');
  html+='<div class="inspector-group"><h4>🎭 PERSONAGEM ARTICULADO</h4><p class="ax-inspector-hint">Modelo low-poly com animações reais de juntas. O tamanho físico de colisão continua nos campos superiores.</p>'+
   '<div class="field"><label>Modelo 3D</label><select data-prop="assetId">'+assetOptions+'</select></div>'+
   '<div class="field"><label>Animação</label><select data-prop="rigClip"><option value="">Pose original</option>'+clipOptions+'</select></div>'+
   fld('Escala visual','modelScale',o.modelScale??1)+checkbox('Reproduzir movimento','rigPlaying',o.rigPlaying!==false)+
   '<button id="openCharacterModeler" class="btn ghost wide">🎭 Model Studio 3D</button>'+
   '<p class="section-description tiny">Para atualizar um personagem no projeto, reimporte sua versão salva na biblioteca 3D.</p></div>';
 }
 $('inspector').innerHTML=html;}
function round(x){return Math.round((Number(x)||0)*100)/100;}
function updateScriptUI(){const o=selected(),isHtml=project.mode==='html5';if(window.AurenixBlocks){const blockMode=project.programming==='blocks'&&!isHtml;window.AurenixBlocks.toggle(blockMode,{project,target:o,onChange:()=>{markDirty();renderSummary();}});if(blockMode){$('codeTarget').textContent=o?'🧱 '+o.name+' • BLOCOS':'🧱 Cena • BLOCOS';$('externalFileBar').classList.add('hidden');return;}}const bar=$('externalFileBar');bar.classList.toggle('hidden',!isHtml);if(isHtml){const files=Object.keys(project.external?.files||{}).filter(n=>/\.(html?|js|mjs|css|json|txt|md|svg|xml|glsl|wgsl|ts)$/i.test(n));const target=project.external?.selectedFile||project.external?.entry||'index.html';$('externalFileSelect').innerHTML=files.map(f=>`<option value="${esc(f)}" ${f===target?'selected':''}>${esc(f)}</option>`).join('');$('codeTarget').textContent='HTML5 • '+target;const data=project.external?.files?.[target];$('scriptEditor').value=data?new TextDecoder().decode(dataURLBytes(data)):'';}else{$('codeTarget').textContent=o?`${o.name} (${o.type})`:'Script global da cena';$('scriptEditor').value=(o?o.script:project.script)||'';}$('scriptEditor').placeholder=isHtml?'<!-- Edite o arquivo selecionado -->':'// Exemplo:\n// self.rotation += dt * 30;';}

function selectObj(id){if(selectedId!==id)S?.stopPreview();selectedId=id;renderObjects();renderInspector();updateScriptUI();S?.renderAnimations();E?.renderComponents();E?.scriptDiagnostics();}
function createObj(type,assetId=''){if(type==='character3d'){const asset=project.assets.find(a=>a.id===assetId)||project.assets.find(a=>a.type==='application/x-aurenix-character+json');if(!asset){toast('Crie ou importe um personagem em Personagens 3D');closeModal();selectTab('models');openPanel('left');return;}window.AurenixModelBridge?.place(asset);closeModal();return;}historyPush();const is3d=project.mode==='3d';const center=is3d?{x:camera3.target[0],y:1,z:camera3.target[2]}:{x:camera2.x,y:camera2.y};let props={...center};if(is3d){props.w=1.3;props.h=1.3;props.d=1.3;if(type==='model3d')props.assetId=assetId;if(type==='plane'){props.w=5;props.h=.35;props.d=5;props.y=-.1;props.solid=true;}}else{props.w=type==='circle'?64:96;props.h=type==='circle'?64:64;if(type==='text'){props.text='Novo texto';props.w=130;props.h=35;}if(type==='player2d'){props.w=35;props.h=51;}if(type==='sprite'){props.assetId=assetId;props.w=64;props.h=64;}}const o=R.makeObj(type,props);project.objects.push(o);selectObj(o.id);touchProject();closeModal();closePanels();toast(`${o.name} criado`);}
function showAddModal(){if(project.mode==='html5'){toast('Importe recursos HTML5 na aba Código');return;}const is3d=project.mode==='3d',items=is3d?[['cube','⬡','Cubo','Caixa ou obstáculo'],['sphere','◉','Esfera','Bola / orbe'],['cylinder','⬢','Cilindro','Pilar'],['pyramid','◆','Pirâmide','Estrutura triangular'],['cone','▲','Cone','Obstáculo pontiagudo'],['torus','◎','Toro','Anel 3D'],['capsule','⬟','Cápsula','Corpo arredondado'],['model3d','▣','Modelo OBJ','Importe um OBJ antes e escolha o arquivo no inspetor'],['character3d','🎭','Personagem animado','Crie no Model Studio e insira com animações'],['plane','▰','Plataforma','Solo / superfície'],['player3d','♟','Jogador 3D','Personagem controlável']]:[['rect','▰','Retângulo','Parede / chão / plataforma'],['circle','●','Círculo','Item / decoração'],['text','T','Texto','Legenda e interface'],['sprite','▧','Sprite','Imagem do projeto'],['player2d','♟','Jogador 2D','Personagem controlável']];openModal('Adicionar objeto',`<div class="modal-grid">${items.map(([type,icon,name,desc])=>`<button class="add-card" data-newobject="${type}"><span class="template-icon">${icon}</span><b>${name}</b><small>${desc}</small></button>`).join('')}</div>`);}
function newProjectModal(){openModal('Criar novo projeto','<p>Escolha um modelo inicial. Seus projetos salvos continuam disponíveis na aba Projetos.</p><div class="modal-grid">'+[['platformer','◇','Plataforma 2D','Física, jogador e plataformas'],['topdown','▦','RPG pixel / top-down','Mapa e movimento em quatro direções'],['3d','⬡','Aventura 3D','WebGL, câmera, chão e obstáculos'],['empty2d','□','2D em branco','Comece do zero'],['empty3d','⬢','3D em branco','Uma plataforma inicial']].map(([kind,icon,name,desc])=>`<button class="template-card" data-template="${kind}"><span class="template-icon">${icon}</span><b>${name}</b><small>${desc}</small></button>`).join('')+'</div>');}
function switchMode(mode){if(mode===project.mode)return;
 // Alternar 2D ↔ Pixel mantém os mesmos objetos e cenas, pois são ambos 2D.
 if(['2d','pixel'].includes(project.mode)&&['2d','pixel'].includes(mode)){
  historyPush();project.mode=mode;project.genre=mode==='pixel'?'topdown':project.genre==='topdown'?'platformer':project.genre;
  for(const scene of project.scenes||[])scene.mode=mode;
  syncAll();touchProject();toast('Modo alterado sem apagar os objetos');return;
 }if((project.scenes?.length||0)>1){toast('Este projeto contém várias cenas. Crie outro projeto para mudar entre 2D e 3D.');return;}if(mode==='html5'){if(project.external){historyPush();project.mode='html5';syncAll();touchProject();}else toast('Importe um projeto HTML5 primeiro (menu ⋮ → Importar).');return;}if(project.mode==='html5'&&mode!=='html5'){toast('Este projeto é HTML5. Crie um novo projeto visual para 2D/3D.');return;}
 if(mode==='3d'&&project.mode!=='3d'){if(project.objects.length&& !confirm('Trocar de 2D para 3D criará uma cena 3D vazia neste projeto. Deseja continuar?'))return;historyPush();project.objects=R.makeTemplate('empty3d').objects;selectedId=project.objects[0]?.id||'';project.genre='adventure3d';}
 else if(project.mode==='3d'&&mode!=='3d'){if(project.objects.length&& !confirm('Trocar de 3D para 2D criará uma cena 2D vazia neste projeto. Deseja continuar?'))return;historyPush();project.objects=[];selectedId='';project.genre=mode==='pixel'?'topdown':'platformer';}else historyPush();project.mode=mode;project.tilemap={size:project.mode==='pixel'?16:32,cells:{}};project.scenes=[];project.activeSceneId='';S?.ensureScenes(project);setTool('select');syncAll();touchProject();}
function selectTab(tab){if(activeTab==='animation'&&tab!=='animation')S?.stopPreview?.();activeTab=tab;if(tab==='audio')window.AurenixAudio?.render();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.tab-body').forEach(b=>b.classList.toggle('active',b.id===`tab${tab[0].toUpperCase()+tab.slice(1)}`));document.querySelectorAll('[data-mobile]').forEach(b=>b.classList.toggle('active',b.dataset.mobile===tab));if(tab==='pixel')renderPixel();if(tab==='code')updateScriptUI();if(tab==='audio')window.AurenixAudio?.render();
 if(tab==='scenes')S?.renderScenes();if(tab==='tiles')S?.renderTiles();
 if(tab==='animation')S?.renderAnimations();if(tab==='prefabs')S?.renderPrefabs();if(tab==='components')E?.renderComponents();if(tab==='gameSettings')E?.renderGameSettings();if(tab==='pixelBridge')E?.loadArt();if(tab==='models')window.AurenixModelBridge?.refresh?.();if(tab==='advanced17')window.AurenixAdvancedEditor17?.render?.();if(tab==='code')E?.scriptDiagnostics();}
function openPanel(which){closePanels();$(which==='right'?'rightPanel':'leftPanel').classList.add('open');$('dimLayer').classList.add('open');}
function closePanels(){$('leftPanel').classList.remove('open');$('rightPanel').classList.remove('open');$('dimLayer').classList.remove('open');}
function openModal(title,html,foot=''){$('modalTitle').textContent=title;$('modalContent').innerHTML=html;$('modalFoot').innerHTML=foot;$('modalLayer').classList.remove('hidden');}
function closeModal(){$('modalLayer').classList.add('hidden');}
function openSceneSettings(){openModal('Configurações da cena',`<div class="field"> <label>Nome do projeto</label><input id="sceneName" type="text" value="${esc(project.name)}"></div><div class="field-row"><div class="field"><label>Cor do fundo</label><input id="sceneBg" type="color" value="${validColor(project.background)}"></div><div class="field"><label>Tamanho da grade (2D)</label><input id="sceneGrid" type="number" min="4" max="256" value="${project.grid||32}"></div></div><div class="field-row"><div class="field"><label>Gravidade 2D (px/s²)</label><input id="sceneGravity" type="number" value="${project.gravity||1100}"></div><div class="field"><label>Gravidade 3D (m/s²)</label><input id="sceneGravity3d" type="number" value="${project.gravity3d||18}"></div></div><div class="field"><label>Script global (JavaScript)</label><textarea id="globalScript" rows="5" style="padding:10px;font-family:monospace;width:100%">${esc(project.script||'')}</textarea></div>`,`<button class="btn primary" id="applySceneSettings">Salvar configurações</button>`);}
// IndexedDB: objetos do jogo e assets em base64, sem limites pequenos do localStorage.
function openDB(){return new Promise((resolve,reject)=>{if(!indexedDB)return reject(Error('IndexedDB indisponível'));const request=indexedDB.open('aurenix-engine-projects',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
function store(mode='readonly'){return db.transaction('projects',mode).objectStore('projects');}
function requestPromise(req){return new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});}
function prepareProject(){S?.stopPreview?.();S?.ensureScenes(project);window.AurenixBlocks?.compileAll(project);S?.syncScene(project);}
async function saveProject(){prepareProject();try{if(!db)db=await openDB();project.updated=Date.now();await requestPromise(store('readwrite').put(JSON.parse(JSON.stringify(project))));projectDirty=false;lastSave=Date.now();$('saveStatus').textContent='✓ Salvo neste aparelho';renderProjects();window.AurenixCloud?.onLocalSave(project,'project');toast('Projeto salvo localmente');}catch(e){toast('Erro ao salvar: '+e.message);}}
async function renderProjects(){if(!db)return;try{const arr=await requestPromise(store().getAll());arr.sort((a,b)=>(b.updated||0)-(a.updated||0));$('savedProjects').innerHTML=arr.map(p=>`<div class="saved-project"><div class="info"><strong>${esc(p.name||'Projeto')}</strong><small>${esc(p.mode)} • ${p.programming==='blocks'?'Blocos':'Scripts'} • ${new Date(p.updated||Date.now()).toLocaleDateString('pt-BR')}</small></div><button data-loadproject="${esc(p.id)}">Abrir</button><button data-deleteproject="${esc(p.id)}" title="Apagar">✕</button></div>`).join('')||'<div class="section-description">Nenhum projeto salvo ainda.</div>';}catch(e){console.warn(e);}}
async function loadProject(id){if(!db)db=await openDB();const p=await requestPromise(store().get(id));if(p){setProject(p);closePanels();toast('Projeto carregado');}}
async function deleteProject(id){if(!confirm('Apagar este projeto salvo? Faça antes um backup se for importante.'))return;await requestPromise(store('readwrite').delete(id));renderProjects();toast('Projeto excluído do armazenamento');}
function download(blob,name){if(window.AurenixFiles){window.AurenixFiles.save(blob,name).then(result=>{if(result?.method==='documents')toast('✓ Arquivo salvo em '+result.path);else if(result?.method==='share')toast('Escolha onde salvar o arquivo');}).catch(e=>toast('Falha ao exportar: '+e.message));return;}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
const slug=(s)=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/--+/g,'-').replace(/^-|-$/g,'').slice(0,35)||'meu-jogo';
function exportProject(){prepareProject();download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${slug(project.name)}.aurenix.json`);toast('Backup do projeto exportado');}
function runtimeBase(){return new URL('./',location.href).href;}
function gameFiles(){prepareProject();if(project.mode==='html5'){const map=project.external?.files||{};if(!Object.keys(map).length)throw Error('Sem arquivos HTML5 importados');return Object.entries(map).map(([name,data])=>({name:name.replace(/^\/+/,''),data:dataURLBytes(data)}));}const index=R.gameHTML(project);return [{name:'index.html',data:index},{name:'js/runtime.js',data:characterSrc+'\n'+faceSrc+'\n'+motionSrc+'\n'+tracksSrc+'\n'+symmetrySrc+'\n'+advancedSrc+'\n'+runtimeSrc}];}
let runtimeSrc='',characterSrc='',faceSrc='',motionSrc='',tracksSrc='',symmetrySrc='',advancedSrc='';
async function loadRuntimeSource(){
 try{
  const source=await fetch('js/character3d.js');if(source.ok)characterSrc=await source.text();
  const face=await fetch('js/character-face13.js');if(face.ok)faceSrc=await face.text();
  const motion=await fetch('js/character-motion14.js');if(motion.ok)motionSrc=await motion.text();
   const tracks=await fetch('js/character-tracks16.js');if(tracks.ok)tracksSrc=await tracks.text();
   const symmetry=await fetch('js/character-symmetry16.js');if(symmetry.ok)symmetrySrc=await symmetry.text();
   const advanced=await fetch('js/advanced17-core.js');if(advanced.ok)advancedSrc=await advanced.text();
 }catch(e){console.warn('Não foi possível carregar o sistema de personagem 3D e expressões',e);}if(window.__AURENIX_RUNTIME_SOURCE__){runtimeSrc=window.__AURENIX_RUNTIME_SOURCE__;return;}try{const res=await fetch('js/runtime.js');if(!res.ok)throw Error('HTTP '+res.status);runtimeSrc=await res.text();}catch(e){console.warn('Falha ao carregar fonte de runtime por fetch:',e);runtimeSrc='';}}
function requireRuntime(){if(project.mode!=='html5'&&!runtimeSrc)throw Error('Para exportar, abra o editor por um servidor HTTP/HTTPS (GitHub Pages ou localhost), não diretamente por file://.');}
function exportGame(){try{requireRuntime();download(Z.pack(gameFiles()),`${slug(project.name)}-html5.zip`);toast('Jogo HTML5 exportado! Extraia o ZIP para jogar.');}catch(e){toast(e.message);}}
function dataURLBytes(data){if(!data?.startsWith('data:'))return new TextEncoder().encode(data||'');const base64=data.split(',')[1]||'';const b=atob(base64),out=new Uint8Array(b.length);for(let i=0;i<b.length;i++)out[i]=b.charCodeAt(i);return out;}
const templateCapPackage=(name,appId)=>JSON.stringify({name:'aurenix-export',private:true,version:'1.0.0',type:'module',scripts:{'android:add':'cap add android','android:sync':'cap sync android','android:build':'cd android && ./gradlew assembleDebug'},dependencies:{'@capacitor/core':'8.6.2','@capacitor/android':'8.6.2'},devDependencies:{'@capacitor/cli':'8.6.2'}},null,2);
const capConfig=(name,appId)=>JSON.stringify({appId,appName:name,webDir:'www',server:{androidScheme:'https'}},null,2);
const gameWorkflow=`name: Gerar APK do jogo
on:
  workflow_dispatch:
jobs:
  apk:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Obter arquivos
        uses: actions/checkout@v4
      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Configurar Java 21
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - name: Configurar Android SDK
        run: |
          SDK_BIN="$(find /usr/local/lib/android/sdk/cmdline-tools -name sdkmanager -type f | head -n 1)"
          test -n "$SDK_BIN"
          "$SDK_BIN" "platforms;android-36" "build-tools;36.0.0"
      - name: Instalar dependências gratuitas
        run: npm install --no-audit --no-fund
      - name: Criar projeto Android
        run: npx cap add android
      - name: Sincronizar arquivos web
        run: npx cap sync android
      - name: Gerar APK debug
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon
      - name: Disponibilizar APK
        uses: actions/upload-artifact@v4
        with:
          name: jogo-aurenix-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
`;
function exportAPK(){try{requireRuntime();const name=project.name||'Meu jogo',appId='com.aurenix.'+slug(name).replace(/-/g,'').slice(0,35);const files=gameFiles().map(f=>({...f,name:'www/'+f.name}));files.push({name:'package.json',data:templateCapPackage(name,appId)},{name:'capacitor.config.json',data:capConfig(name,appId)},{name:'.github/workflows/gerar-apk.yml',data:gameWorkflow},{name:'README-APK.txt',data:'COMO GERAR O APK GRATUITAMENTE\n\n1. Crie um repositório GitHub e envie TODOS os arquivos deste ZIP, inclusive a pasta .github.\n2. No GitHub, abra Actions > Gerar APK do jogo > Run workflow.\n3. Ao final, baixe o artifact jogo-aurenix-apk e extraia app-debug.apk.\n4. Instale o APK no Android, autorizando instalação de aplicativos externos se necessário.\n\nEste é um APK de TESTE (debug), não está assinado com sua chave de distribuição para a Play Store.\nVersões de Capacitor são open source; o build baixa dependências gratuitas.\nPara publicação, gere um APK/AAB release assinado e mantenha sua chave privada fora do GitHub.\n\nOBS: alguns jogos HTML5 importados dependem de HTTPS, servidor ou cabeçalhos especiais; nesse caso exigem adaptação.\n'});download(Z.pack(files),`${slug(name)}-template-apk.zip`);toast('Template de APK com GitHub Actions exportado');}catch(e){toast(e.message);}}
function play(){prepareProject();if(project.mode==='html5'&&!project.external){toast('Não há projeto HTML5');return;}let html=project.mode==='html5'?bundleExternal():R.gameHTML(JSON.parse(JSON.stringify(project)),{inlineRuntime:characterSrc+'\n'+faceSrc+'\n'+motionSrc+'\n'+tracksSrc+'\n'+symmetrySrc+'\n'+advancedSrc+'\n'+runtimeSrc,baseHref:runtimeSrc?'':runtimeBase()});const axExit=`<button onclick="parent.postMessage({type:'AURENIX_EXIT_PLAY'},'*')" style="position:fixed;top:calc(8px + env(safe-area-inset-top,0px));right:calc(8px + env(safe-area-inset-right,0px));z-index:2147483647;border:2px solid #89d6d0;border-radius:12px;background:#112d3fe8;color:white;padding:10px 14px;font:700 14px system-ui;min-height:46px;touch-action:manipulation">✕ Sair do teste</button>`;html=html.includes('</body>')?html.replace('</body>',axExit+'</body>'):html+axExit;$('playTitle').textContent=project.name+' • '+project.mode.toUpperCase();$('playFrame').srcdoc=html;$('playOverlay').classList.remove('hidden');closePanels();}
function stop(){$('playFrame').srcdoc='<!doctype html><title>Parado</title>';$('playOverlay').classList.add('hidden');}
async function importFiles(files){
 const arr=Array.from(files||[]),Importer=window.AurenixImport17;
 if(!arr.length)return;
 let imported=0;historyPush();
 const addAsset=(asset)=>{project.assets.push({id:R.uid(),...asset});imported++;};
 async function importOne(f,packageFiles={}){
  const name=f.name||'arquivo',isObj=/\.obj$/i.test(name),isGLTF=/\.(glb|gltf)$/i.test(name);
  if(f.size>(isGLTF?26:16)*1024*1024)throw Error('Arquivo acima do limite de 16/26 MB');
  if(/\.aurenix3d$/i.test(name)){await window.AurenixModelBridge.importFile(f);return;}
  if(isGLTF){
   const result=await Importer.parseFile(f,packageFiles),obj=result.geometry.obj;
   if(obj.length>2900000)throw Error('Malha excedeu o limite do renderizador OBJ. Reduza a quantidade de triângulos.');
   const objName=name.replace(/\.(glb|gltf)$/i,'')+' (GLTF).obj';
   addAsset({name:objName,type:'model/obj',data:Z.asDataURL(new TextEncoder().encode(obj),'model/obj'),
    gltf:{source:name,triangles:result.geometry.triangles,nodes:result.geometry.nodes,joints:result.skins.reduce((s,x)=>s+x.joints.length,0),
     clips:result.clips.map(clip=>({name:clip.name,duration:clip.duration,channels:clip.channels.length})),textures:result.textures}});
   if(f.size<=6*1024*1024)addAsset({name:name,type:Z.mime(name),data:await readAsDataURL(f)});
   return;
  }
  if(!f.type.startsWith('image/')&&!f.type.startsWith('audio/')&&!isObj&&!/\.bin$/i.test(name))throw Error('Tipo não suportado: '+name);
  addAsset({name,type:isObj?'model/obj':f.type||Z.mime(name),data:await readAsDataURL(f)});
 }
 for(const f of arr){
  try{
   if(/\.zip$/i.test(f.name)){
    if(f.size>65*1024*1024)throw Error('ZIP acima de 65 MB');
    const pack=await Importer.fromZip(f,Z);let size=0;
    for(const data of Object.values(pack.contents)){size+=data.length;if(size>95*1024*1024)throw Error('Pacote descompactado excede 95 MB');}
    for(const name of pack.entries){
     try{const f2=new File([pack.contents[name]],name,{type:Z.mime(name)});await importOne(f2,pack.contents);}
     catch(err){console.warn(name,err);toast('Falha em '+name+': '+err.message);}
    }
   }else await importOne(f);
  }catch(error){console.error(error);toast('Erro ao importar '+f.name+': '+error.message);}
 }
 images=R.imgMap(project);renderAssets();renderSummary();markDirty();
 window.AurenixAudio?.render();window.AurenixAdvancedEditor17?.render?.();
 toast(imported+' recurso(s) importado(s) e salvo(s) no projeto. GLTF usa malha OBJ convertida.');
}
function readAsDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(file);});}
function normalizeEntry(name){return name.replaceAll('\\','/').replace(/^\.\//,'').replace(/^\/+/, '');}
async function importProjectFile(file){if(file.size>90*1024*1024)throw Error('Arquivo acima de 90 MB');const ext=file.name.split('.').pop().toLowerCase();if(ext==='json'||ext==='aurenix'){const j=JSON.parse(await file.text());if(!j||!Array.isArray(j.objects))throw Error('JSON não é um projeto Aurenix');j.id=R.uid();setProject(j);toast('Projeto Aurenix importado');return;}if(ext==='html'||ext==='htm'){const b=new Uint8Array(await file.arrayBuffer());const entry='index.html';setProject({id:R.uid(),name:file.name.replace(/\.html?$/i,''),mode:'html5',genre:'web',background:'#121b2b',objects:[],assets:[],external:{entry,files:{[entry]:Z.asDataURL(b,'text/html')}}});toast('Arquivo HTML importado');return;}
 if(ext==='zip'){const unpacked=await Z.unpack(file),names=Object.keys(unpacked),sceneFile=names.find(n=>/^(scene\.json|aurenix-project\.json)$/i.test(n));if(sceneFile){try{const j=JSON.parse(Z.asText(unpacked[sceneFile]));if(j.objects){j.id=R.uid();setProject(j);toast('Projeto Aurenix restaurado');return;}}catch(e){}}
 const idx=names.find(n=>/^(index\.html?|www\/index\.html?)$/i.test(n))||names.find(n=>/\/index\.html?$/i.test(n))||names.find(n=>/\.html?$/i.test(n));if(!idx)throw Error('Este ZIP não contém um index.html. Exporte o jogo para HTML5 primeiro.');const prefix=idx.slice(0,idx.lastIndexOf('/')+1);const map={};for(const n of names){if(prefix&&!n.startsWith(prefix))continue;const local=normalizeEntry(n.slice(prefix.length));if(local&&!local.startsWith('.github/')&&!local.startsWith('node_modules/'))map[local]=Z.asDataURL(unpacked[n],Z.mime(n));}const entry=normalizeEntry(idx.slice(prefix.length));setProject({id:R.uid(),name:file.name.replace(/\.zip$/i,''),mode:'html5',genre:'web',background:'#101c31',objects:[],assets:[],external:{entry,files:map}});toast(`${Object.keys(map).length} arquivos HTML5 importados`);return;}throw Error('Formato não suportado: use JSON, HTML ou ZIP');}
function getExternalHtml(){const data=project.external?.files?.[project.external.entry];if(!data)return '';return new TextDecoder().decode(dataURLBytes(data));}
function bundleExternal(){const external=project.external;if(!external)return '<p>Sem arquivos</p>';const files=external.files,entry=external.entry;let html=getExternalHtml();const base=entry.includes('/')?entry.slice(0,entry.lastIndexOf('/')+1):'';
 const getFile=(path)=>{const clean=path.replace(/[?#].*$/,'');if(/^(data:|https?:|blob:|#|\/\/)/i.test(clean))return null;const normalized=normalizeEntry(base+clean).split('/').reduce((a,p)=>{if(p==='..')a.pop();else if(p!=='.'&&p!=='')a.push(p);return a;},[]).join('/');return files[normalized]||files[normalizeEntry(clean)]||null;};
 html=html.replace(/(<(?:script|img|audio|video|source|link)\b[^>]*?\b(?:src|href)\s*=\s*)(["'])([^"']+)\2/gi,(all,prefix,q,path)=>{const data=getFile(path);return data?prefix+q+data+q:all;});
 html=html.replace(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/gi,(all,q,path)=>{const data=getFile(path);return data?`url("${data}")`:all;});return html;}
function refreshExternal(){if(project.mode!=='html5')return;const hash=project.id+':'+project.updated;if(hash===externalHash)return;externalHash=hash;externalView.srcdoc=bundleExternal();}
// Pixel art com cores transparentes; interface compatível com toque.
const pixel={size:16,cells:Array(256).fill(null),color:'#7b8cff',tool:'pen',painting:false};
function ensurePixel(){if(project.pixelData?.cells?.length){pixel.size=project.pixelData.size;pixel.cells=project.pixelData.cells.slice();$('pixelSize').value=pixel.size;}else{pixel.size=16;pixel.cells=Array(256).fill(null);$('pixelSize').value='16';}}
const palette=['#0b1526','#ffffff','#ff5e75','#ffbb67','#ffe080','#67e28b','#63dce7','#648dff','#9a76f7','#ed73cb','#964b43','#cfd6e6','#47663e','#744aa0','#254d78','#995e38'];
function renderPixelPalette(){$('pixelPalette').innerHTML=palette.map(c=>`<button data-pixelcolor="${c}" style="background:${c}" class="${pixel.color===c?'active':''}" title="${c}"></button>`).join('');}
function renderPixel(){const canvas=$('pixelCanvas'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,size=pixel.size,unit=W/size;ctx.clearRect(0,0,W,H);for(let y=0;y<size;y++)for(let x=0;x<size;x++){ctx.fillStyle=(x+y)%2?'#e0e3eb':'#fbfbfe';ctx.fillRect(x*unit,y*unit,unit,unit);const col=pixel.cells[y*size+x];if(col){ctx.fillStyle=col;ctx.fillRect(x*unit,y*unit,unit,unit);}}
 ctx.lineWidth=size>=64?.4:1;ctx.strokeStyle='#3d435735';ctx.beginPath();for(let i=0;i<=size;i++){ctx.moveTo(i*unit,0);ctx.lineTo(i*unit,H);ctx.moveTo(0,i*unit);ctx.lineTo(W,i*unit);}ctx.stroke();renderPixelPalette();}
function drawPixelAt(e){const r=$('pixelCanvas').getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*pixel.size),y=Math.floor((e.clientY-r.top)/r.height*pixel.size);if(x<0||y<0||x>=pixel.size||y>=pixel.size)return;const i=y*pixel.size+x,old=pixel.cells[i],value=pixel.tool==='erase'?null:pixel.color;if(pixel.tool==='fill'){if(old===value)return;const stack=[i],seen=new Set();while(stack.length){const p=stack.pop();if(seen.has(p)||pixel.cells[p]!==old)continue;seen.add(p);pixel.cells[p]=value;const cx=p%pixel.size,cy=Math.floor(p/pixel.size);if(cx>0)stack.push(p-1);if(cx<pixel.size-1)stack.push(p+1);if(cy>0)stack.push(p-pixel.size);if(cy<pixel.size-1)stack.push(p+pixel.size);}}else pixel.cells[i]=value;project.pixelData={size:pixel.size,cells:pixel.cells.slice()};markDirty();renderPixel();}
function pixelPNG(){const c=document.createElement('canvas');c.width=c.height=pixel.size;const ctx=c.getContext('2d');for(let y=0;y<pixel.size;y++)for(let x=0;x<pixel.size;x++){const col=pixel.cells[y*pixel.size+x];if(col){ctx.fillStyle=col;ctx.fillRect(x,y,1,1);}}return c.toDataURL('image/png');}
function pixelAddAsset(){const data=pixelPNG(),name='pixel-'+Date.now()+'.png',asset={id:R.uid(),name,type:'image/png',data};historyPush();project.assets.push(asset);images=R.imgMap(project);renderAssets();markDirty();toast('Sprite criado! Disponível na aba Arquivos.');if(project.mode!=='3d'&&project.mode!=='html5')createObj('sprite',asset.id);}
function screenToWorld(e){const b=sceneCanvas.getBoundingClientRect();return {x:(e.clientX-b.left-b.width/2)/camera2.zoom+camera2.x,y:(e.clientY-b.top-b.height/2)/camera2.zoom+camera2.y};}
function detect2d(p){for(const o of project.objects.slice().sort((a,b)=>(b.layer||0)-(a.layer||0))){if(!o.visible||isSceneLocked(o))continue;const hw=(o.w||20)/2,hh=(o.h||20)/2;if(Math.abs(p.x-o.x)<=hw&&Math.abs(p.y-o.y)<=hh)return o;}return null;}
function detect3d(e){
 if(!webgl)return null;
 const b=scene3dCanvas.getBoundingClientRect(),px=e.clientX-b.left,py=e.clientY-b.top;
 const candidates=[];
 for(const o of project.objects){
  if(!o.visible||isSceneLocked(o))continue;
  const center=webgl.project([o.x||0,o.y||0,o.z||0]);if(!center)continue;
  const corners=[];
  for(const dx of [-.5,.5])for(const dy of [-.5,.5])for(const dz of [-.5,.5]){
   const p=webgl.project([(o.x||0)+dx*Math.max(.1,o.w||1),(o.y||0)+dy*Math.max(.1,o.h||1),(o.z||0)+dz*Math.max(.1,o.d||1)]);
   if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))corners.push(p);
  }
  if(!corners.length)continue;
  const x0=Math.min(...corners.map(p=>p.x)),x1=Math.max(...corners.map(p=>p.x));
  const y0=Math.min(...corners.map(p=>p.y)),y1=Math.max(...corners.map(p=>p.y));
  const hit=px>=x0-9&&px<=x1+9&&py>=y0-9&&py<=y1+9;
  if(hit){const area=Math.max(1,(x1-x0)*(y1-y0));candidates.push({o,score:Math.log(area)*12+Math.hypot(center.x-px,center.y-py)*.3});}
 }
 candidates.sort((a,b)=>a.score-b.score);
 return candidates[0]?.o||null;
}
function setTool(t){
 if(project.mode!=='3d'&&['translate','rotate'].includes(t))return;
 if(project.mode==='3d'&&t==='tile')return;
 gizmo3d?.cancel?.();tool=t;
 document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));
 if(t==='tile'){selectTab('tiles');if(window.matchMedia('(pointer:coarse)').matches)openPanel('left');}
 if(project.mode==='3d')$('viewHint').textContent={
  select:'Toque num objeto para selecionar • arraste as alças para escalar • 2 dedos para zoom',
  translate:'Puxe X/Y/Z para mover • quadrado XZ movimenta no chão • grade opcional',
  rotate:'Puxe X/Y/Z para girar • ativa encaixe de 5° quando a grade estiver ligada',
  resize:'Puxe os pontos + e − para escalar mantendo a face oposta fixa',
  pan:'Arraste para orbitar a câmera • 2 dedos para zoom'
 }[t]||'Puxe as alças para modificar o objeto';
}
function startPointer(e){
 if(project.mode==='html5')return;
 if(e.button===2)e.preventDefault();
 pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointerMap.size>=2){drag={kind:'pinch',...getPinchState(),zoom:project.mode==='3d'?camera3.distance:camera2.zoom,cam2:{...camera2},cam3:{...camera3,target:[...camera3.target]}};return;}
 viewport.setPointerCapture(e.pointerId);
 const p=project.mode==='3d'?null:screenToWorld(e),hit=project.mode==='3d'?detect3d(e):detect2d(p);
 const pan=tool==='pan'||e.button===1||e.button===2;
 const wasSelected=!!hit&&selectedId===hit.id;
 if(tool==='tile'&&p){
   historyPush();S?.paintPointer(p.x,p.y);
   drag={kind:'tile',pointer:e.pointerId};return;
 }
 if(hit&&!pan&&!wasSelected)selectObj(hit.id);
 const mode=pan?'pan':project.mode==='3d'&&['translate','rotate','resize'].includes(tool)?'hold':hit?'move':'pan';
 drag={kind:mode,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,
  orig:hit?{x:hit.x,y:hit.y,z:hit.z}:null,cam2:{...camera2},cam3:{...camera3,target:[...camera3.target]},
  hitId:hit?.id,wasSelected,changed:false};
}
function getPinchState(){const vals=[...pointerMap.values()];return vals.length<2?{dist:0,x:0,y:0}:{dist:Math.hypot(vals[0].x-vals[1].x,vals[0].y-vals[1].y),x:(vals[0].x+vals[1].x)/2,y:(vals[0].y+vals[1].y)/2};}
function movePointer(e){const old=pointerMap.get(e.pointerId);if(old)pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY});if(project.mode==='html5')return;const p=project.mode==='3d'?null:screenToWorld(e);if(p)$('statusCoords').textContent=`X: ${round(p.x)} • Y: ${round(p.y)}`;
 if(!drag)return;if(drag.kind==='pinch'){
 const state=getPinchState();if(!state.dist||!drag.dist)return;
 const ratio=state.dist/drag.dist,dx=state.x-drag.x,dy=state.y-drag.y;
 if(project.mode==='3d'){
  camera3.distance=R.clamp(drag.zoom/ratio,2,100);
  const yaw=drag.cam3.yaw,unit=drag.cam3.distance/Math.max(240,viewport.clientHeight)*1.65;
  camera3.target[0]=drag.cam3.target[0]-dx*unit*Math.cos(yaw)-dy*unit*Math.sin(yaw);
  camera3.target[2]=drag.cam3.target[2]+dx*unit*Math.sin(yaw)-dy*unit*Math.cos(yaw);
 }else{
  camera2.zoom=R.clamp(drag.zoom*ratio,.2,5);
  camera2.x=drag.cam2.x-dx/drag.cam2.zoom;
  camera2.y=drag.cam2.y-dy/drag.cam2.zoom;
 }
 return;
}if(e.pointerId!==drag.pointer)return;if(drag.kind==='tile'){if(p)S?.paintPointer(p.x,p.y);return;}if(drag.kind==='hold')return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
 if(drag.kind==='pan'||!drag.hitId){if(project.mode==='3d'){camera3.yaw=drag.cam3.yaw-dx*.008;camera3.pitch=R.clamp(drag.cam3.pitch+dy*.007,-.3,1.4);}else{camera2.x=drag.cam2.x-dx/camera2.zoom;camera2.y=drag.cam2.y-dy/camera2.zoom;}return;}
 const o=project.objects.find(o=>o.id===drag.hitId);if(!o)return;if(Math.hypot(dx,dy)<7)return;if(!drag.changed){historyPush();drag.changed=true;}if(project.mode==='3d'){const size=camera3.distance/viewport.clientHeight*1.7,tx=dx*size,ty=dy*size,yaw=camera3.yaw;o.x=drag.orig.x+tx*Math.cos(yaw)+ty*Math.sin(yaw);o.z=drag.orig.z-tx*Math.sin(yaw)+ty*Math.cos(yaw);if(snap){o.x=Math.round(o.x*4)/4;o.z=Math.round(o.z*4)/4;}}else{o.x=drag.orig.x+dx/camera2.zoom;o.y=drag.orig.y+dy/camera2.zoom;if(snap){const grid=project.mode==='pixel'?Math.min(16,project.grid||16):(project.grid||32);o.x=Math.round(o.x/grid)*grid;o.y=Math.round(o.y/grid)*grid;}}renderInspector();markDirty();}
function endPointer(e){
 pointerMap.delete(e.pointerId);
 if(pointerMap.size===0){
  if(drag?.kind==='tile')S?.renderTiles();
  if(drag?.changed)renderObjects();
  else if(drag?.hitId&&drag.wasSelected&&drag.kind==='move'&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<9){selectObj('');}
  drag=null;
 }else if(drag?.kind==='pinch'){drag=null;}
}
function zoom(sign){if(project.mode==='3d')camera3.distance=R.clamp(camera3.distance*(sign>0?.82:1.2),2,100);else camera2.zoom=R.clamp(camera2.zoom*(sign>0?1.2:.82),.2,5);}
function drawLoop(){requestAnimationFrame(drawLoop);if(project.mode==='html5'){refreshExternal();return;}if(project.mode==='3d'){if(!webgl||webgl.canvas!==scene3dCanvas){try{webgl=new R.Renderer3D(scene3dCanvas);}catch(e){console.error(e);return;}}if(webgl.error)return;webgl.render(project,camera3,{grid:showGrid,selectedId});gizmo3d?.draw();axis3d?.draw(camera3,true);if(selected()){const o=selected(),coords=`X: ${round(o.x||0)} • Y: ${round(o.y||0)} • Z: ${round(o.z||0)}`;if($('statusCoords').textContent!==coords)$('statusCoords').textContent=coords;}$('zoomLabel').textContent=Math.round(170/camera3.distance*100)/10+'×';}else{R.draw2D(sceneCanvas,project,camera2,{grid:showGrid,selectedId,images,showTileCollision:tool==='tile'});$('zoomLabel').textContent=Math.round(camera2.zoom*100)+'%';}}
async function handleFile(file){try{await importProjectFile(file);$('projectPicker').value='';closeModal();closePanels();}catch(e){console.error(e);toast('Erro ao importar: '+e.message);}}
function wireEvents(){
 $('toolboxNavBtn').onclick=()=>T?.open();$('homeBtn').onclick=()=>window.AurenixHome?.open();$('saveBtn').onclick=saveProject;$('topThemeBtn').onclick=()=>window.AurenixTheme?.open();$('topAudioBtn').onclick=()=>{selectTab('audio');openPanel('left');};$('undoBtn').onclick=undo;$('redoBtn').onclick=redo;$('playBtn').onclick=play;$('stopBtn').onclick=stop;$('playFullscreen').onclick=()=>($('playFrame').requestFullscreen?.()||toast('Use o modo tela cheia do navegador'));
 $('addObjectBtn').onclick=showAddModal;$('sceneSettingsBtn').onclick=openSceneSettings;$('newProjectBtn').onclick=newProjectModal;$('importBtn').onclick=()=>$('projectPicker').click();$('projectPicker').onchange=e=>{const f=e.target.files[0];if(f)handleFile(f);};
 $('assetPicker').onchange=e=>{importFiles(e.target.files).then(()=>window.AurenixAudio?.render());e.target.value='';};
 $('objectSearch').addEventListener('input',renderObjects);$('assetSearch').addEventListener('input',renderAssets);
 $('axQuickAdd').onclick=showAddModal;
 $('axQuickDuplicate').onclick=()=>{const o=selected();if(!o){toast('Selecione um objeto');return;}historyPush();const n=JSON.parse(JSON.stringify(o));n.id=R.uid();n.name+=' (cópia)';n.editorLocked=false;n.x=(n.x||0)+(project.mode==='3d'?1:30);project.objects.push(n);selectObj(n.id);touchProject();};
 $('axQuickFocus').onclick=()=>{const o=selected();if(!o){toast('Selecione um objeto');return;}if(project.mode==='3d'){camera3.target=[o.x||0,o.y||0,o.z||0];camera3.distance=Math.max(5,Math.hypot(o.w||1,o.h||1,o.d||1)*2.8);}else{camera2.x=o.x||0;camera2.y=o.y||0;camera2.zoom=Math.min(2.5,Math.max(.5,450/Math.max(o.w||1,o.h||1,60)));}toast('Câmera centralizada no objeto');};
 $('axQuickComponents').onclick=()=>{selectTab('components');openPanel('left');};
 T?.init(id=>{
  if(id==='inspector'){openPanel('right');return;}
  if(id==='theme'){window.AurenixTheme?.open();return;}
  if(id==='modelStudio'){if(projectDirty&&!confirm('Salve o projeto antes de abrir Model Studio. Continuar?'))return;location.href='modelstudio.html';return;}if(id==='pixelStudio'){if(projectDirty&&!confirm('Há mudanças não salvas. Salve seu projeto antes de sair. Continuar?'))return;location.href='pixelstudio.html';return;}
  if(id==='play'){play();return;}
  if(id==='save'){saveProject();return;}
  if(id==='export'){exportGame();return;}if(id==='githubAPK'){window.AurenixGithubUI?.open();return;}if(id==='cloud'){window.AurenixCloud?.open();return;}
  selectTab(id);openPanel('left');
 });
 $('axAssetPixel').onclick=()=>{selectTab('pixelBridge');openPanel('left');};
 $('axAssetAudio').onclick=()=>{selectTab('audio');openPanel('left');};$('axAssetModeler').onclick=()=>{selectTab('models');openPanel('left');};
 $('leftTabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)selectTab(b.dataset.tab);});
 $('mobileNav').addEventListener('click',e=>{const b=e.target.closest('[data-mobile]');if(!b)return;if(b.dataset.mobile==='inspector'){document.querySelectorAll('[data-mobile]').forEach(t=>t.classList.toggle('active',t===b));openPanel('right');}else{selectTab(b.dataset.mobile);openPanel('left');}});
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closePanels);$('dimLayer').onclick=closePanels;
 $('topMoreBtn').onclick=e=>{$('menuPopover').classList.toggle('hidden');e.stopPropagation();};
 const menus={
 'menuToolbox':()=>T?.open(),
 'menuComponents':()=>{selectTab('components');openPanel('left');},
 'menuGameSettings':()=>{selectTab('gameSettings');openPanel('left');},
 'menuPixelBridge':()=>{selectTab('pixelBridge');openPanel('left');},
 'menuModels':()=>{selectTab('models');openPanel('left');},
 'menuAdvanced17':()=>{selectTab('advanced17');openPanel('left');},
 'menuModelStudio':()=>{if(projectDirty&&!confirm('Salve seu projeto antes de ir ao Model Studio. Continuar?'))return;location.href='modelstudio.html';},

 'menuScenes':()=>{selectTab('scenes');openPanel('left');},
 'menuTiles':()=>{if(project.mode==='3d'){toast('Pintura de mapa exclusiva do 2D');return;}setTool('tile');selectTab('tiles');openPanel('left');},
 'menuAnimations':()=>{selectTab('animation');openPanel('left');},
 'menuPrefabs':()=>{selectTab('prefabs');openPanel('left');},
 'menuDebug':()=>{project.debugFps=!project.debugFps;markDirty();$('menuDebug').textContent=project.debugFps?'◉ FPS durante teste: ligado':'◉ FPS durante teste: desligado';toast('Exibição FPS '+(project.debugFps?'ativada':'desativada'));},
 'menuHome':()=>window.AurenixHome?.open(),'menuTheme':()=>window.AurenixTheme?.open(),'menuAudio':()=>{selectTab('audio');openPanel('left');},'menuPixelStudio':()=>location.href='pixelstudio.html','menuNew':newProjectModal,'menuImport':()=>$('projectPicker').click(),'menuExportJson':exportProject,'menuExportGame':exportGame,'menuExportApk':exportAPK,'menuGithubAPK':()=>window.AurenixGithubUI?.open(),'menuCloud':()=>window.AurenixCloud?.open(),'menuSettings':openSceneSettings,'menuDocs':showDocs};for(const [id,fn] of Object.entries(menus))$(id).onclick=()=>{$('menuPopover').classList.add('hidden');fn();};
 document.addEventListener('click',e=>{if(!e.target.closest('#menuPopover')&&!e.target.closest('#topMoreBtn'))$('menuPopover').classList.add('hidden');});
 $('modalClose').onclick=closeModal;$('modalLayer').addEventListener('click',e=>{if(e.target===$('modalLayer'))closeModal();});
 $('modalLayer').addEventListener('click',e=>{const add=e.target.closest('[data-newobject]'),tem=e.target.closest('[data-template]');if(add){createObj(add.dataset.newobject);return;}if(tem){const p=R.makeTemplate(tem.dataset.template);p.programming=$('newProgrammingChoice')?.value==='blocks'?'blocks':'script';if(p.programming==='blocks'){p.script='';for(const o of p.objects){o.script='';o.blocks=[];}window.AurenixBlocks?.compileAll(p);}setProject(p);ensurePixel();closeModal();toast('Cena criada');return;}if(e.target.id==='applySceneSettings'){historyPush();project.name=$('sceneName').value.trim()||'Meu jogo';project.background=$('sceneBg').value;project.grid=R.clamp(Number($('sceneGrid').value)||32,4,256);project.gravity=Number($('sceneGravity').value)||1100;project.gravity3d=Number($('sceneGravity3d').value)||18;project.script=$('globalScript').value;$('projectName').value=project.name;markDirty();renderSummary();closeModal();toast('Cena configurada');}});
 $('objectList').addEventListener('click',e=>{const l=e.target.closest('[data-togglelock]');if(l){const o=project.objects.find(o=>o.id===l.dataset.togglelock);if(o){historyPush();o.editorLocked=!o.editorLocked;touchProject();}return;}const v=e.target.closest('[data-visible]');if(v){const o=project.objects.find(o=>o.id===v.dataset.visible);if(o){historyPush();o.visible=!o.visible;touchProject();}return;}const row=e.target.closest('[data-id]');if(row)selectObj(row.dataset.id);});
 $('assetList').addEventListener('click',e=>{if(e.target.closest('[data-editaudio]')){selectTab('audio');openPanel('left');return;}const character=e.target.closest('[data-placecharacter]');if(character){const a=project.assets.find(a=>a.id===character.dataset.placecharacter);if(a)window.AurenixModelBridge?.place(a);return;}const model=e.target.closest('[data-placemodel]');if(model){if(project.mode!=='3d'){toast('Troque para um projeto 3D para usar OBJ');return;}createObj('model3d',model.dataset.placemodel);return;}const add=e.target.closest('[data-placeasset]');if(add){createObj('sprite',add.dataset.placeasset);return;}const rename=e.target.closest('[data-renasset]');if(rename){const a=project.assets.find(x=>x.id===rename.dataset.renasset),name=a&&prompt('Novo nome do arquivo',a.name);if(name?.trim()){historyPush();a.name=name.trim().slice(0,85);renderAssets();markDirty();}return;}
 const exp=e.target.closest('[data-exportasset]');if(exp){const a=project.assets.find(x=>x.id===exp.dataset.exportasset);if(a){const type=a.type||'application/octet-stream';const name=a.name||'asset';const bytes=dataURLBytes(a.data);download(new Blob([bytes],{type}),name);}return;}
 const del=e.target.closest('[data-removeasset]');if(del){if(confirm('Remover este arquivo? Objetos que usam esse arquivo ficarão sem imagem.')){historyPush();project.assets=project.assets.filter(a=>a.id!==del.dataset.removeasset);images=R.imgMap(project);touchProject();renderAssets();}return;}});
 $('savedProjects').addEventListener('click',e=>{const load=e.target.closest('[data-loadproject]'),del=e.target.closest('[data-deleteproject]');if(load)loadProject(load.dataset.loadproject);if(del)deleteProject(del.dataset.deleteproject);});
 $('inspector').addEventListener('change',e=>{const el=e.target.closest('[data-prop]'),o=selected();if(!el||!o)return;historyPush();const key=el.dataset.prop;let value=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;if(el.type==='number'&&!Number.isFinite(value))value=0;if(['w','h','d'].includes(key))value=Math.max(.01,value);if(key==='opacity')value=R.clamp(value,0,1);if(['health','maxHealth'].includes(key))value=Math.max(1,Math.round(value));if(key==='modelScale')value=R.clamp(value,.1,20);if(key==='rigClip')o.rigTime=0;if(key==='tags')value=String(value).slice(0,220);o[key]=value;touchProject();updateScriptUI();S?.renderAnimations();E?.scriptDiagnostics();});
 $('inspector').addEventListener('click',e=>{if(e.target.closest('#emptyAdd'))showAddModal();if(e.target.closest('#openCodeHtml')){selectTab('code');openPanel('left');}if(e.target.closest('#openCharacterModeler')){if(projectDirty&&!confirm('Salve o projeto antes de sair. Continuar?'))return;location.href='modelstudio.html';}if(e.target.closest('#editSelectedBehavior')){selectTab('components');openPanel('left');}if(e.target.closest('#editSelectedCode')){selectTab('code');openPanel('left');}if(e.target.closest('#duplicateBtn')){const o=selected();if(!o)return;historyPush();const n={...JSON.parse(JSON.stringify(o)),id:R.uid(),editorLocked:false,name:o.name+' (cópia)',x:o.x+(project.mode==='3d'?1:32)};project.objects.push(n);selectObj(n.id);touchProject();toast('Objeto duplicado');}if(e.target.closest('#deleteBtn')){const o=selected();if(!o)return;historyPush();project.objects=project.objects.filter(x=>x.id!==o.id);selectObj('');touchProject();toast('Objeto excluído');}});
 $('externalFileSelect').onchange=e=>{if(project.external){project.external.selectedFile=e.target.value;updateScriptUI();}};
 $('applyScriptBtn').onclick=()=>{historyPush();if(project.mode==='html5'){const s=$('scriptEditor').value;if(!project.external)return;const key=project.external.selectedFile||project.external.entry;project.external.files[key]=Z.asDataURL(new TextEncoder().encode(s),Z.mime(key));externalHash='';markDirty();refreshExternal();toast('Arquivo atualizado');}else{const o=selected();if(o)o.script=$('scriptEditor').value;else project.script=$('scriptEditor').value;markDirty();toast('JavaScript aplicado');E?.scriptDiagnostics();}};$('apiHelpBtn').onclick=showDocs;
 $('projectName').onchange=e=>{historyPush();project.name=e.target.value.trim()||'Meu jogo';markDirty();};
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>switchMode(b.dataset.mode));document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$('gridBtn').onclick=()=>{showGrid=!showGrid;$('gridBtn').classList.toggle('enabled',showGrid);};$('snapBtn').onclick=()=>{snap=!snap;$('snapBtn').classList.toggle('enabled',snap);};$('zoomOutBtn').onclick=()=>zoom(-1);$('zoomInBtn').onclick=()=>zoom(1);$('resetCameraBtn').onclick=()=>{camera2={x:0,y:50,zoom:1};camera3={target:[0,0,0],yaw:.7,pitch:.63,distance:17};};
 viewport.addEventListener('pointerdown',e=>{
  if(e.target!==sceneCanvas&&e.target!==scene3dCanvas)return;
  if(project.mode==='3d'&&gizmo3d?.isDragging?.())return;
  if(project.mode==='3d'&&tool!=='pan'&&pointerMap.size===0&&gizmo3d?.start(e)){
   try{viewport.setPointerCapture(e.pointerId);}catch{}return;
  }
  startPointer(e);
 });
 viewport.addEventListener('pointermove',e=>{if(gizmo3d?.move(e))return;movePointer(e);});
 viewport.addEventListener('pointerup',e=>{if(gizmo3d?.end(e))return;endPointer(e);});
 viewport.addEventListener('pointercancel',e=>{if(gizmo3d?.isDragging?.()){gizmo3d.cancel();return;}endPointer(e);});
 window.addEventListener('blur',()=>{pointerMap.clear();drag=null;gizmo3d?.cancel?.();});
 viewport.addEventListener('wheel',e=>{if(project.mode==='html5')return;e.preventDefault();zoom(e.deltaY<0?1:-1);},{passive:false});viewport.addEventListener('contextmenu',e=>e.preventDefault());
 const px=$('pixelCanvas');px.addEventListener('pointerdown',e=>{pixel.painting=true;px.setPointerCapture(e.pointerId);drawPixelAt(e);});px.addEventListener('pointermove',e=>{if(pixel.painting&&pixel.tool!=='fill')drawPixelAt(e);});px.addEventListener('pointerup',()=>pixel.painting=false);px.addEventListener('pointercancel',()=>pixel.painting=false);
 $('pixelSize').onchange=e=>{pixel.size=Number(e.target.value);pixel.cells=Array(pixel.size*pixel.size).fill(null);project.pixelData={size:pixel.size,cells:pixel.cells.slice()};markDirty();renderPixel();toast('Nova grade criada (o desenho anterior foi limpo)');};$('pixelColor').oninput=e=>{pixel.color=e.target.value;renderPixelPalette();};$('pixelPalette').onclick=e=>{const b=e.target.closest('[data-pixelcolor]');if(b){pixel.color=b.dataset.pixelcolor;$('pixelColor').value=pixel.color;renderPixelPalette();}};document.querySelectorAll('[data-pixeltool]').forEach(b=>b.onclick=()=>{pixel.tool=b.dataset.pixeltool;document.querySelectorAll('[data-pixeltool]').forEach(x=>x.classList.toggle('active',x===b));});$('pixelClearBtn').onclick=()=>{if(confirm('Apagar todos os pixels do desenho?')){pixel.cells.fill(null);project.pixelData={size:pixel.size,cells:pixel.cells.slice()};markDirty();renderPixel();}};$('pixelToAssetBtn').onclick=pixelAddAsset;$('pixelDownloadBtn').onclick=()=>{const a=document.createElement('a');a.href=pixelPNG();a.download='sprite-aurenix.png';a.click();};
 let drags=0;viewport.addEventListener('dragenter',e=>{e.preventDefault();drags++;$('dropOverlay').classList.add('shown');});viewport.addEventListener('dragover',e=>e.preventDefault());viewport.addEventListener('dragleave',e=>{e.preventDefault();drags--;if(drags<=0){drags=0;$('dropOverlay').classList.remove('shown');}});viewport.addEventListener('drop',e=>{e.preventDefault();drags=0;$('dropOverlay').classList.remove('shown');const files=Array.from(e.dataTransfer?.files||[]);if(files.length===1&&/\.(zip|html?|json|aurenix)$/i.test(files[0].name))handleFile(files[0]);else importFiles(files);});
 document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.ctrlKey||e.metaKey){if(e.key==='z'){e.preventDefault();undo();}if(e.key==='y'||e.shiftKey&&e.key==='Z'){e.preventDefault();redo();}if(e.key==='s'){e.preventDefault();saveProject();}}if(e.key==='Delete'&&selected()){historyPush();project.objects=project.objects.filter(o=>o.id!==selectedId);selectObj('');touchProject();}if(e.key==='Escape'){closePanels();closeModal();if(!$('playOverlay').classList.contains('hidden'))stop();}});
 window.addEventListener('beforeunload',e=>{if(projectDirty){e.preventDefault();e.returnValue='';}});
 window.addEventListener('message',e=>{if(e.source===$('playFrame')?.contentWindow&&e.data?.type==='AURENIX_EXIT_PLAY')stop();});
 window.setInterval(async()=>{if(projectDirty&&Date.now()-lastSave>120000&&db){try{prepareProject();await requestPromise(store('readwrite').put(JSON.parse(JSON.stringify(project))));projectDirty=false;lastSave=Date.now();$('saveStatus').textContent='✓ Autosalvo';window.AurenixCloud?.onLocalSave(project,'project');}catch(e){}}},30000);
}
function showDocs(){openModal('Aurenix Engine • Ajuda e API',`<p><b>Esta versão alpha</b> inclui edição de objetos 2D, pixel art, geometria 3D WebGL, inspector, scripts JavaScript, física básica, câmera, controle touch, exportação ZIP e projeto Android gratuito.</p><p><b>JavaScript de objeto:</b> a função recebe <code>self</code>, <code>scene</code>, <code>api</code> e <code>dt</code> (segundos desde o quadro anterior).</p><pre>// Movimento de um objeto (graus/segundo)\nself.rotation += dt * 90;\n\n// Buscar objetos\nconst heroi = api.get('Herói');\n\n// Criar e excluir\napi.spawn('circle', {x:100,y:50,w:20,h:20,color:'#ffd070'});\napi.remove('id-ou-nome');\n\n// Teclas, colisão e som\nif (api.isKeyDown('e')) api.sound(600,0.1);\nconst colidiu = api.collides(self,heroi);
// Componentes funcionam em projetos Blocos ou Scripts.
// API avançada:
api.addScore(10);
api.damage(15);
api.heal(5);
api.message('Você encontrou um baú!');
api.cameraShake(4);
api.getByTag('inimigo');
api.saveData('nivel',3); const nivel=api.loadData('nivel',1);\n\n// Outras cenas, animação e tiles\napi.loadScene('Cena 2');\napi.nextScene();\napi.playAnimation(self,'Correr');\napi.stopAnimation(self);\napi.setTile(3,2,'#45a968',true);</pre><p><b>HTML5:</b> use ⋮ → Importar para abrir <code>.html</code>, <code>.zip</code> ou um projeto Aurenix em <code>.json</code>. ZIPs com <code>index.html</code> são importados como projetos web. O arquivo original é preservado ao exportar; a prévia interna usa URLs incorporadas, então apps que fazem <code>fetch()</code>, <code>import</code> complexo ou exigem headers próprios podem precisar de um servidor.</p><p><b>Outras linguagens:</b> jogos compilados para JavaScript/WebAssembly (Rust, C/C++, Godot Web, etc.) podem ser importados como pacote HTML5, desde que sejam compatíveis com WebView Android. Python, C# e Lua não são interpretados nativamente aqui.</p><p><b>APK:</b> ⋮ → Exportar template de APK cria um ZIP com o jogo, Capacitor e workflow do GitHub Actions. Não é um APK imediato; envie os arquivos ao GitHub e execute o fluxo. APK debug é para testes.</p><p><b>Privacidade:</b> projetos permanecem no aparelho por padrão e são executados em iframe isolado durante os testes. O backup opcional ☁ Aurenix Cloud usa exclusivamente a pasta privada do aplicativo no seu Google Drive; login Google e acesso à internet são necessários para sincronizar.</p>`);}
function initializeHome(){
 window.AurenixHome?.init({
  list:async()=>db?await requestPromise(store().getAll()):[],
  open:loadProject,create:newProjectModal,import:()=>$('projectPicker').click(),help:showDocs,settings:()=>window.AurenixTheme?.open(),audio:()=>{window.AurenixHome?.close();selectTab('audio');openPanel('left');},cloud:()=>window.AurenixCloud?.open(),
  model:()=>{if(projectDirty&&!confirm('Salve seu projeto antes de ir ao Model Studio. Continuar?'))return;location.href='modelstudio.html';},
  pixel:()=>{if(projectDirty&&(history.length||lastSave)&&!confirm('Seu jogo tem mudanças não salvas. Salve antes de entrar no Pixel Studio. Continuar?'))return;projectDirty=false;location.href='pixelstudio.html';},
  copy:async id=>{const p=await requestPromise(store().get(id));if(!p)return;const n=JSON.parse(JSON.stringify(p));n.id=R.uid();n.name=(p.name||'Projeto')+' (cópia)';n.updated=Date.now();await requestPromise(store('readwrite').put(n));},
  rename:async(id,name)=>{const p=await requestPromise(store().get(id));if(!p)return;p.name=name;p.updated=Date.now();await requestPromise(store('readwrite').put(p));if(project.id===id){project.name=name;$('projectName').value=name;}},
  remove:async id=>{await requestPromise(store('readwrite').delete(id));renderProjects();},
  backup:async id=>{const p=await requestPromise(store().get(id));if(p)download(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),slug(p.name)+'.aurenix.json');}
 });
 window.AurenixHome?.open();
}
async function start(){
 window.AurenixCloud?.init({
  getProject:()=>project,
  beforeSync:async()=>{if(projectDirty)await saveProject();},
  listProjects:async()=>{
   if(!db)db=await openDB();
   return await requestPromise(store().getAll());
  },
  putProject:async incoming=>{
   if(!db)db=await openDB();
   await requestPromise(store('readwrite').put(JSON.parse(JSON.stringify(incoming))));
   if(project.id===incoming.id){setProject(incoming);projectDirty=false;}
   renderProjects();window.AurenixHome?.refresh?.();
  },
  listPixels:async()=>{
   const pixelDb=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('aurenix-pixelstudio-v1',1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('artworks'))req.result.createObjectStore('artworks',{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   try{
    return await new Promise((resolve,reject)=>{
     const req=pixelDb.transaction('artworks','readonly').objectStore('artworks').getAll();
     req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);
    });
   }finally{pixelDb.close();}
  },
  putPixel:async incoming=>{
   const pixelDb=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('aurenix-pixelstudio-v1',1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('artworks'))req.result.createObjectStore('artworks',{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   try{
    await new Promise((resolve,reject)=>{
     const req=pixelDb.transaction('artworks','readwrite').objectStore('artworks').put(JSON.parse(JSON.stringify(incoming)));
     req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);
    });
   }finally{pixelDb.close();}
  },
  getSettings:async()=>({
   id:'settings',name:'Temas e prefabs',
   theme:JSON.parse(localStorage.getItem('aurenix.theme.v1')||'{}'),
   prefabs:JSON.parse(localStorage.getItem('aurenix.studio.prefabs.07')||'[]')
  }),
  putSettings:async data=>{
   localStorage.setItem('aurenix.theme.v1',JSON.stringify(data.theme));
   localStorage.setItem('aurenix.studio.prefabs.07',JSON.stringify(data.prefabs));
  },
  onRestored:(type,data)=>{
   toast(type==='settings'?'Preferências recuperadas! Reinicie a engine para aplicar os temas.':(data.name||'Arquivo')+' recuperado da nuvem.');
   if(type==='project'){renderProjects();window.AurenixHome?.refresh?.();}
  }
 });
 window.AurenixGithubUI?.init({
   getProject:()=>project,
   getFiles:()=>{requireRuntime();return gameFiles();}
 });
 window.AurenixAdvancedEditor17?.init({getProject:()=>project,history:historyPush,changed:()=>{markDirty();renderSummary();},refresh:()=>{renderObjects();renderSummary();renderInspector();},toast,
  importFiles:()=>$('assetPicker').click(),applyCamera:settings=>{camera3.yaw=Number(settings.yaw)||.8;camera3.pitch=Number(settings.pitch)||.6;camera3.distance=Number(settings.distance)||16;}});
 E?.loadDefaults(project);
 E?.init({
  getProject:()=>project,getSelected:selected,history:historyPush,changed:()=>{markDirty();renderSummary();},toast,uid:R.uid,
  onAsset:()=>{renderAssets();renderSummary();},
 });
 S?.ensureScenes(project);
 S?.initialize({
  getProject:()=>project,getSelected:selected,
  onHistory:historyPush,onChange:markDirty,toast,
  selectObject:selectObj,
  exportJSON:(data,name)=>download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),name),
  onSceneChanged:()=>{selectedId=project.objects[0]?.id||'';camera2=initialCamera2(project);camera3={target:[0,0,0],yaw:.7,pitch:.63,distance:17};syncAll();}
 });
 window.AurenixModelBridge?.init({getProject:()=>project,getCamera:()=>camera3,history:historyPush,changed:touchProject,renderAssets,selectObject:selectObj,toast,refresh:()=>{renderAssets();renderInspector();},goModeler:()=>{if(projectDirty&&!confirm('Salve o projeto antes de abrir Model Studio. Continuar?'))return;location.href='modelstudio.html';}});
 window.AurenixAudio?.init({panelId:'audioPanel',getProject:()=>project,onChange:()=>{historyPush();markDirty();},importFiles,addAsset:asset=>{historyPush();project.assets.push(asset);markDirty();renderAssets();renderSummary();}});
 selectedId=project.objects.find(o=>o.type==='player2d')?.id||'';camera2=initialCamera2(project);wireEvents();ensurePixel();syncAll();renderPixel();try{db=await openDB();renderProjects();}catch(e){console.warn('IndexedDB não disponível:',e);toast('Salvamento local indisponível — use exportação JSON');}initializeHome();if(location.hash==='#cloud'){history.replaceState(null,'',location.pathname+location.search);window.AurenixCloud?.open();}await loadRuntimeSource();drawLoop();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(console.warn);}

const oldNewProjectModal = newProjectModal;
newProjectModal = function(){
  oldNewProjectModal();
  $('modalContent').insertAdjacentHTML('afterbegin',
    '<div class="ax-choice"><label for="newProgrammingChoice">COMO VOCÊ VAI PROGRAMAR?</label>'+
    '<select id="newProgrammingChoice" aria-label="Escolha a programação do projeto">'+
    '<option value="blocks">🧱 Blocos — visual, sem digitar código</option>'+
    '<option value="script">💻 Scripts — escrever JavaScript</option></select>'+
    '<small>Escolha definitiva para este projeto. Depois de criado, não poderá mudar o tipo sem criar outro projeto.</small></div>');
};
project.programming='script';

/* Integração exclusiva dos tutoriais: não altera projetos de usuário fora de uma aula. */
window.AurenixTutorialBridge={
 async prepareManualProject(){
  if(projectDirty&&(history.length||lastSave)&&!confirm('Você tem alterações não salvas. Faça um backup ou salve antes de criar um tutorial. Continuar?'))throw Error('Abertura cancelada');
  window.AurenixHome?.close();selectTab('projects');openPanel('left');
 },
 async openProject(track,course){
  if(projectDirty&&(history.length||lastSave)&&!confirm('Você tem alterações não salvas. Salve seu jogo antes de entrar no laboratório. Continuar?'))throw Error('Abertura cancelada');
  if(!db)db=await openDB();
  const id='aurenix-academy-'+track;
  let p=await requestPromise(store().get(id));
  if(!p){
   const template=track==='3d'?'3d':track==='pixel'?'topdown':'platformer';
   p=R.makeTemplate(template);p.id=id;
   p.name={'2d':'📘 Laboratório de Jogo 2D','3d':'📘 Laboratório de Jogo 3D','pixel':'📘 Laboratório de Jogo Pixel','animation2d':'📘 Laboratório de Animações 2D'}[track]||'📘 Laboratório';
   p.programming='script';
   p.updated=Date.now();
  }
  if(course?.id==='blocos')p.programming='blocks';
  if(course?.id==='codigo')p.programming='script';
  setProject(p);
  if(course?.id==='animacao2d-loop'){
   const obj=selected()||project.objects.find(o=>o.type==='player2d')||project.objects[0];
   if(obj){selectObj(obj.id);if(!(obj.animations||[]).length){S?.addClip(obj);touchProject();}}
  }
 },
 goTo(tab){
  if(tab==='inspector'){openPanel('right');return;}
  if(!tab)return;selectTab(tab);openPanel('left');
 },
 state(){return {id:project.id,mode:project.mode,objects:project.objects?.length||0,clips:selected()?.animations?.length||0,selected:selected()?.type||''};},
 async adoptProject(track){
  const id='aurenix-academy-'+track;
  project.id=id;project.name='📘 Laboratório de Jogo 2D';
  $('projectName').value=project.name;
  await saveProject();window.AurenixHome?.refresh?.();
 },
 async save(){await saveProject();}
};
start().catch(e=>{console.error(e);toast('Erro ao iniciar: '+e.message);});
})();
