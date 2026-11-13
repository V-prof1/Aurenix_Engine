/* Aurenix Studio 0.7 — cenas, tiles, animações e prefabs offline.
 * As funções de modelo não dependem do DOM e podem ser testadas separadamente.
 */
(function(global){
'use strict';
const $=id=>document.getElementById(id),clone=v=>JSON.parse(JSON.stringify(v));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const uid=()=> 'ax'+Math.random().toString(36).slice(2,10);
const props=['x','y','z','w','h','d','rotation','rx','ry','rz','opacity'];
const n=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,n(x,a)));
const freshTilemap=()=>({size:32,cells:{}});
const sceneKeys=['objects','background','grid','gravity','gravity3d','genre','script','blocks','tilemap'];
const capture=(project,id,name)=>({
 id:id||uid(),name:name||'Cena 1',mode:project.mode,
 objects:clone(project.objects||[]),background:project.background||'#101c31',
 grid:n(project.grid,32),gravity:n(project.gravity,1100),
 gravity3d:n(project.gravity3d,18),genre:project.genre||'platformer',
 script:project.script||'',blocks:clone(project.blocks||[]),tilemap:clone(project.tilemap||freshTilemap())
});
function ensureScenes(p){
 if(!p||p.mode==='html5')return [];
 if(!Array.isArray(p.scenes)||!p.scenes.length){
  const first=capture(p,uid(),'Cena 1');p.scenes=[first];p.activeSceneId=first.id;
 }
 if(!p.scenes.some(s=>s.id===p.activeSceneId))p.activeSceneId=p.scenes[0].id;
 p.tilemap||=freshTilemap();
 return p.scenes;
}
function syncScene(p){
 const scenes=ensureScenes(p);if(!scenes.length)return;
 const at=scenes.findIndex(s=>s.id===p.activeSceneId);
 const old=scenes[at],next=capture(p,old.id,old.name);
 scenes[at]=next;
 return next;
}
function activateScene(p,id){
 const scenes=ensureScenes(p),target=scenes.find(s=>s.id===id);
 if(!target)throw Error('Cena não encontrada');
 if(p.activeSceneId!==id)syncScene(p);
 const scene=clone(target);p.activeSceneId=id;
 for(const key of sceneKeys)p[key]=clone(scene[key]);
 return scene;
}
function createScene(p,{name,duplicate=false}={}){
 const scenes=ensureScenes(p);syncScene(p);
 if(scenes.length>=50)throw Error('Máximo de 50 cenas por jogo');
 let source=duplicate?clone(scenes.find(s=>s.id===p.activeSceneId)):capture({...p,objects:[],script:'',tilemap:freshTilemap()},null,'');
 source.id=uid();source.name=String(name||('Cena '+(scenes.length+1))).trim().slice(0,65);
 if(!duplicate)source.objects=[];
 scenes.push(source);activateScene(p,source.id);
 return source;
}
function deleteScene(p,id){
 ensureScenes(p);if(p.scenes.length<=1)throw Error('Não é possível excluir a única cena');
 if(!p.scenes.some(s=>s.id===id))return false;
 if(id!==p.activeSceneId)syncScene(p);
 p.scenes=p.scenes.filter(s=>s.id!==id);
 if(p.activeSceneId===id){p.activeSceneId=p.scenes[0].id;const active=clone(p.scenes[0]);for(const key of sceneKeys)p[key]=clone(active[key]);}
 return true;
}
function renameScene(p,id,name){
 ensureScenes(p);const scene=p.scenes.find(x=>x.id===id);
 if(!scene)return false;scene.name=String(name||scene.name).slice(0,65);return true;
}
function moveScene(p,id,delta){
 ensureScenes(p);const a=p.scenes.findIndex(x=>x.id===id),b=a+delta;
 if(a<0||b<0||b>=p.scenes.length)return false;
 [p.scenes[a],p.scenes[b]]=[p.scenes[b],p.scenes[a]];return true;
}
function tileAt(p,x,y){const t=p.tilemap||freshTilemap();return t.cells[x+','+y]||null;}
function setTile(p,x,y,{color='#639c72',solid=false,erase=false}={}){
 p.tilemap||=freshTilemap();const t=p.tilemap,key=Math.floor(x)+','+Math.floor(y);
 if(erase){if(t.cells[key]){delete t.cells[key];return true;}return false;}
 if(!/^#[0-9a-fA-F]{6}$/.test(color))throw Error('Cor de tile inválida');
 const next={color,solid:!!solid};if(t.cells[key]?.color===color&&t.cells[key]?.solid===next.solid)return false;
 if(Object.keys(t.cells).length>10000&&!t.cells[key])throw Error('Limite de 10 mil tiles por cena');
 t.cells[key]=next;return true;
}
function snapCell(p,worldX,worldY){
 const size=clamp(p?.tilemap?.size||32,8,256);
 return {x:Math.floor(n(worldX)/size),y:Math.floor(n(worldY)/size),size};
}
function keyPose(o){const r={};for(const key of props)r[key]=n(o[key],key==='opacity'?1:key==='w'||key==='h'||key==='d'?1:0);return r;}
function ensureAnimations(o){if(!Array.isArray(o.animations))o.animations=[];return o.animations;}
function addClip(o,name='Animação'){
 const list=ensureAnimations(o);if(list.length>=24)throw Error('Máximo de 24 animações por objeto');
 const clip={id:uid(),name:String(name).slice(0,50),duration:1,loop:true,autoplay:true,
 keyframes:[{time:0,...keyPose(o)},{time:1,...keyPose(o)}]};
 list.push(clip);o.activeAnimation=clip.id;return clip;
}
function addKeyframe(o,clip,time){
 const duration=clamp(clip.duration||1,.1,120);
 const t=Math.round(clamp(time,0,duration)*1000)/1000;
 const frame={time:t,...keyPose(o)};
 const at=clip.keyframes.findIndex(k=>Math.abs(k.time-t)<.001);
 if(at>=0)clip.keyframes[at]=frame;else clip.keyframes.push(frame);
 clip.keyframes.sort((a,b)=>a.time-b.time);
 return frame;
}
function interpolate(clip,seconds){
 const keys=clip?.keyframes?.slice().sort((a,b)=>a.time-b.time)||[];
 if(!keys.length)return null;
 const duration=clamp(clip.duration||1,.1,120);
 let t=Number(seconds)||0;
 if(clip.loop)t=((t%duration)+duration)%duration;else t=clamp(t,0,duration);
 const start=keys[0],end=keys[keys.length-1];
 if(t<=start.time)return Object.fromEntries(props.map(p=>[p,n(start[p],0)]));
 if(t>=end.time)return Object.fromEntries(props.map(p=>[p,n(end[p],0)]));
 let prev=start,next=end;
 for(let i=1;i<keys.length;i++)if(keys[i].time>=t){prev=keys[i-1];next=keys[i];break;}
 const a=clamp((t-prev.time)/Math.max(.0001,next.time-prev.time),0,1),result={};
 for(const prop of props)result[prop]=n(prev[prop])+(n(next[prop])-n(prev[prop]))*a;
 return result;
}
const PREFAB_KEY='aurenix.studio.prefabs.07';
function prefabs(){try{return JSON.parse(localStorage.getItem(PREFAB_KEY)||'[]');}catch{return [];}}
function savePrefab(object,programming){
 if(!object)throw Error('Selecione um objeto');
 const list=prefabs(),name=object.name||'Objeto';if(list.length>=80)throw Error('Máximo de 80 prefabs');
 const entry={id:uid(),name,programming:programming==='blocks'?'blocks':'script',
 object:clone(object),saved:Date.now()};
 list.unshift(entry);localStorage.setItem(PREFAB_KEY,JSON.stringify(list));return entry;
}
function createFromPrefab(p,id,newId=uid){
 const entry=prefabs().find(x=>x.id===id);
 if(!entry)throw Error('Objeto salvo não encontrado');
 if(entry.programming!==(p.programming==='blocks'?'blocks':'script'))throw Error('Este prefab usa outro modo de programação');
 const o=clone(entry.object);o.id=newId();o.name+=' (prefab)';
 o.x=n(o.x)+(p.mode==='3d'?1:24);
 p.objects.push(o);return o;
}
function removePrefab(id){localStorage.setItem(PREFAB_KEY,JSON.stringify(prefabs().filter(x=>x.id!==id)));}
let ui=null,config={},tool='brush',paintColor='#62c99a',paintSolid=true,preview=null,raf=0,activeTab='scenes',dragPaint=false;
function getProject(){return config.getProject?.();}
function touch(){config.onChange?.();}
function history(){config.onHistory?.();}
function notify(s){config.toast?.(s);}
function useScene(id){
 const p=getProject();if(!p)return;
 if(p.activeSceneId===id)return;
 stopPreview();history();activateScene(p,id);config.onSceneChanged?.();touch();renderAll();
}
function renderScenes(){
 const box=$('axScenes');if(!box)return;const p=getProject();if(!p)return;
 if(p.mode==='html5'){box.innerHTML='<div class="ax-studio-heading"><h3>⌘ Projeto HTML5 externo</h3><p>Este projeto mantém seus arquivos HTML/CSS/JS originais. O editor visual de cenas não altera a estrutura interna de jogos importados.</p></div>';return;}
 ensureScenes(p);syncScene(p);
 box.innerHTML='<div class="ax-studio-heading"><h3>🎬 Cenas do jogo</h3><p>Cada cena tem seus próprios objetos e mapa. O modo de programação continua fixo no projeto.</p></div>'+
 '<div class="ax-studio-buttons"><button data-action="newScene">＋ Nova cena</button><button data-action="cloneScene">▣ Duplicar atual</button></div>'+
 '<div class="ax-studio-list">'+p.scenes.map((s,i)=>'<article class="ax-studio-row '+(s.id===p.activeSceneId?'current':'')+'"><div><strong>'+(s.id===p.activeSceneId?'▶ ':'')+esc(s.name)+'</strong><small>'+(i+1)+' · '+s.objects.length+' objetos</small></div><button data-scene="'+esc(s.id)+'">Abrir</button><button data-rename-scene="'+esc(s.id)+'" title="Renomear">✎</button><button data-move-scene="'+esc(s.id)+'" data-dir="-1" title="Subir">↑</button><button data-move-scene="'+esc(s.id)+'" data-dir="1" title="Descer">↓</button><button data-delete-scene="'+esc(s.id)+'" title="Excluir">✕</button></article>').join('')+'</div>'+
 '<div class="ax-studio-help"><strong>Trocar de cena no jogo:</strong><br>Em Scripts, use <code>api.loadScene("Nome")</code> ou <code>api.nextScene()</code>. Em Blocos, use a ação <b>Mudar de cena</b> ou <b>Próxima cena</b>.</div>';
}
function renderTiles(){
 const box=$('axTiles'),p=getProject();if(!box||!p)return;
 const is3d=p.mode==='3d'||p.mode==='html5';p.tilemap||=freshTilemap();
 const t=p.tilemap,count=Object.keys(t.cells).length;
 box.innerHTML='<div class="ax-studio-heading"><h3>▦ Pintor de tiles</h3><p>Crie cenários coloridos diretamente na cena. Marque “Sólido” para impedir o jogador de atravessar.</p></div>'+
 (is3d?'<div class="ax-studio-help">O pintor de tiles é exclusivo dos projetos 2D e pixel. Para cenários 3D, use os objetos do editor.</div>':
 '<div class="ax-studio-buttons"><button data-tilestool="brush" class="'+(tool==='brush'?'chosen':'')+'">✎ Pincel</button><button data-tilestool="erase" class="'+(tool==='erase'?'chosen':'')+'">⌫ Borracha</button></div>'+
 '<div class="ax-studio-field"><label>Cor do tile</label><input type="color" id="axTileColor" value="'+paintColor+'"></div>'+
 '<div class="ax-studio-field"><label>Tamanho da célula (px)</label><select id="axTileSize">'+[8,16,24,32,48,64,96,128].map(s=>'<option value="'+s+'" '+(t.size===s?'selected':'')+'>'+s+' × '+s+'</option>').join('')+'</select></div>'+
 '<label class="ax-studio-check"><input type="checkbox" id="axTileSolid" '+(paintSolid?'checked':'')+'> ⬛ Tile sólido (colisão)</label>'+
 '<div class="ax-studio-pal">'+['#3d8e67','#5caa78','#3173a8','#b1a268','#8c6649','#7c86a6','#c48472','#2b4251','#171e36','#d0b979','#e9f5fa','#534557'].map(c=>'<button data-tilecolor="'+c+'" style="--swatch:'+c+'" title="'+c+'"></button>').join('')+'</div>'+
 '<div class="ax-studio-help">1. Selecione <b>▦ Pintar mapa</b> nas ferramentas.<br>2. Arraste sobre o cenário para pintar. Para apagar, use Borracha.<br>3. Os tiles permanecem no jogo exportado.</div>'+
 '<div class="ax-studio-buttons"><button data-action="clearTiles">⌫ Limpar mapa</button><button data-action="exportTiles">⇩ Exportar mapa JSON</button></div>')+
 '<p class="ax-studio-count">'+count+' tiles colocados nesta cena.</p>';
}
function clipSelected(){const o=config.getSelected?.();return o?.animations?.find(c=>c.id===o.activeAnimation)||null;}
function renderAnimations(){
 const box=$('axAnimations'),o=config.getSelected?.(),p=getProject();if(!box||!p)return;
 if(!o){box.innerHTML='<div class="ax-studio-heading"><h3>🎞️ Animações</h3><p>Selecione um objeto na cena ou na lista Objetos para criar animações.</p></div>';return;}
 const clips=ensureAnimations(o),clip=clipSelected();
 box.innerHTML='<div class="ax-studio-heading"><h3>🎞️ Animação</h3><p>Objeto: <b>'+esc(o.name)+'</b>. Captura posição, rotação, tamanho e opacidade.</p></div>'+
 '<div class="ax-studio-buttons"><button data-action="addClip">＋ Nova animação</button><button data-action="cloneClip" '+(!clip?'disabled':'')+'>▣ Duplicar</button></div>'+
 '<div class="ax-studio-field"><label>Animação ativa</label><select id="axClipChoice"><option value="">Nenhuma</option>'+clips.map(c=>'<option value="'+esc(c.id)+'" '+(o.activeAnimation===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></div>'+
 (clip?'<div class="ax-studio-field"><label>Nome</label><input id="axClipName" maxlength="60" value="'+esc(clip.name)+'"></div>'+
 '<div class="ax-studio-field"><label>Duração (segundos)</label><input id="axClipDuration" type="number" min=".1" max="120" step=".1" value="'+clip.duration+'"></div>'+
 '<label class="ax-studio-check"><input id="axClipLoop" type="checkbox" '+(clip.loop?'checked':'')+'> Repetir em loop</label>'+
 '<label class="ax-studio-check"><input id="axClipAuto" type="checkbox" '+(clip.autoplay?'checked':'')+'> Começar automaticamente</label>'+
 '<div class="ax-studio-field"><label>Tempo da keyframe</label><input id="axKeyTime" type="number" min="0" max="'+clip.duration+'" step=".1" value="'+Math.round(clip.duration/2*10)/10+'"></div>'+
 '<div class="ax-studio-buttons"><button data-action="captureKey">◆ Capturar pose atual</button><button data-action="deleteClip">✕ Excluir animação</button></div>'+
 '<p class="ax-studio-help">Mova ou redimensione o objeto no Inspetor. Depois capture a pose no tempo escolhido. Os valores mudam suavemente entre as keyframes.</p>'+
 '<div class="ax-studio-frames">'+(clip.keyframes||[]).map((k,i)=>'<div class="ax-studio-frame"><span>◆ '+Number(k.time).toFixed(2)+' s</span><button data-preview="'+i+'">👁 Ver pose</button><button data-key-delete="'+i+'">✕</button></div>').join('')+'</div>'+
 '<div class="ax-studio-buttons"><button data-action="playPreview">▶ Prévia</button><button data-action="stopPreview">■ Restaurar pose</button></div>':
 '<div class="ax-studio-help">Adicione a primeira animação. Você poderá criar várias para o mesmo objeto.</div>')+
 '<div class="ax-studio-help">Em Scripts: <code>api.playAnimation(self,"Nome")</code> e <code>api.stopAnimation(self)</code>. Em Blocos: use as ações de animação.</div>';
}
function renderPrefabs(){
 const box=$('axPrefabs'),p=getProject();if(!box||!p)return;
 box.innerHTML='<div class="ax-studio-heading"><h3>▣ Objetos reutilizáveis</h3><p>Salve modelos e use em outros jogos. Os scripts/blocos são mantidos separados.</p></div><button class="ax-studio-full" data-action="savePrefab">＋ Salvar objeto selecionado</button>'+
 (prefabs().length?prefabs().map(e=>'<div class="ax-studio-row"><div><strong>'+esc(e.name)+'</strong><small>'+esc(e.programming==='blocks'?'Blocos':'Scripts')+' · '+esc(e.object.type)+'</small></div><button data-place-prefab="'+esc(e.id)+'">＋</button><button data-remove-prefab="'+esc(e.id)+'">✕</button></div>').join(''):
 '<p class="ax-studio-help">Nenhum prefab salvo ainda. Selecione um objeto e salve-o acima.</p>')+
 '<p class="ax-studio-help">Armazenados no próprio aplicativo. Para usar prefabs de outro modo de programação, crie um prefab compatível.</p>';
}
function renderAll(){renderScenes();renderTiles();renderAnimations();renderPrefabs();}
function stopPreview(){
 if(raf)cancelAnimationFrame(raf);raf=0;
 if(preview){const obj=config.getSelected?.();if(obj&&obj.id===preview.id)Object.assign(obj,preview.pose);preview=null;}
}
function previewClip(clip,time){
 const o=config.getSelected?.();if(!o)return;
 if(!preview||preview.id!==o.id){stopPreview();preview={id:o.id,pose:keyPose(o)};}
 const pose=interpolate(clip,time);if(pose)Object.assign(o,pose);
 config.onVisualUpdate?.();
}
function onClick(e){
 const p=getProject();if(!p||!e.target.closest('#tabScenes,#tabTiles,#tabAnimation,#tabPrefabs'))return;
 const el=e.target.closest('button');if(!el)return;
 try{
  if(el.dataset.scene){useScene(el.dataset.scene);return;}
  if(el.dataset.renameScene){const sc=p.scenes.find(s=>s.id===el.dataset.renameScene),name=prompt('Nome da cena',sc.name);if(name){history();renameScene(p,sc.id,name);touch();renderScenes();}return;}
  if(el.dataset.deleteScene){if(confirm('Excluir esta cena? Não é possível desfazer após salvar.')){history();deleteScene(p,el.dataset.deleteScene);config.onSceneChanged?.();touch();renderAll();}return;}
  if(el.dataset.moveScene){history();moveScene(p,el.dataset.moveScene,Number(el.dataset.dir));touch();renderScenes();return;}
  if(el.dataset.tilecolor){paintColor=el.dataset.tilecolor;renderTiles();return;}
  if(el.dataset.tilestool){tool=el.dataset.tilestool;renderTiles();return;}
  if(el.dataset.placePrefab){history();const obj=createFromPrefab(p,el.dataset.placePrefab);config.selectObject?.(obj.id);touch();renderAll();notify('Objeto reutilizável adicionado');return;}
  if(el.dataset.removePrefab){if(confirm('Excluir este prefab salvo?')){removePrefab(el.dataset.removePrefab);renderPrefabs();}return;}
  const action=el.dataset.action;
  if(!action)return;
  if(action==='newScene'||action==='cloneScene'){history();const created=createScene(p,{duplicate:action==='cloneScene'});config.onSceneChanged?.();touch();renderAll();notify('Cena '+created.name+' criada');}
  if(action==='clearTiles'){if(confirm('Remover todos os tiles desta cena?')){history();p.tilemap=freshTilemap();touch();renderTiles();}}
  if(action==='exportTiles')config.exportJSON?.(clone(p.tilemap),'tiles-'+(p.activeSceneId||'cena')+'.json');
  if(action==='savePrefab'){const o=config.getSelected?.();if(!o){notify('Selecione um objeto primeiro');return;}savePrefab(o,p.programming);renderPrefabs();notify('Prefab salvo');}
  if(action==='addClip'){const o=config.getSelected?.();if(!o)return;history();addClip(o);touch();renderAnimations();}
  if(action==='cloneClip'){const o=config.getSelected?.(),clip=clipSelected();if(!clip)return;history();const next=clone(clip);next.id=uid();next.name+=' cópia';o.animations.push(next);o.activeAnimation=next.id;touch();renderAnimations();}
  if(action==='deleteClip'){const o=config.getSelected?.(),clip=clipSelected();if(!clip||!confirm('Excluir esta animação?'))return;stopPreview();history();o.animations=o.animations.filter(c=>c.id!==clip.id);o.activeAnimation=o.animations[0]?.id||'';touch();renderAnimations();}
  if(action==='captureKey'){const o=config.getSelected?.(),clip=clipSelected();if(!clip)return;stopPreview();history();addKeyframe(o,clip,$('axKeyTime').value);touch();renderAnimations();notify('Keyframe capturada');}
  if(action==='stopPreview'){stopPreview();renderAnimations();}
  if(action==='playPreview'){const clip=clipSelected();if(!clip)return;stopPreview();const start=performance.now();function run(now){if(!preview&&now>start+clip.duration*1000+40)return;previewClip(clip,(now-start)/1000);if(!clip.loop&&(now-start)/1000>=clip.duration){stopPreview();renderAnimations();return;}raf=requestAnimationFrame(run);}raf=requestAnimationFrame(run);}
  if(el.dataset.preview!==undefined){const clip=clipSelected();if(clip)previewClip({...clip,loop:false},clip.keyframes[Number(el.dataset.preview)].time);}
  if(el.dataset.keyDelete!==undefined){const clip=clipSelected();if(!clip)return;history();clip.keyframes.splice(Number(el.dataset.keyDelete),1);touch();renderAnimations();}
 }catch(err){notify(err.message||'Erro ao executar ação');console.error(err);}
}
function onChange(e){
 const p=getProject();if(!p)return;
 const id=e.target.id;
 if(id==='axTileColor'){paintColor=e.target.value;return;}
 if(id==='axTileSolid'){paintSolid=e.target.checked;return;}
 if(id==='axTileSize'){history();p.tilemap||=freshTilemap();p.tilemap.size=Number(e.target.value);touch();return;}
 const o=config.getSelected?.(),clip=clipSelected();
 if(!o)return;
 if(id==='axClipChoice'){stopPreview();o.activeAnimation=e.target.value;touch();renderAnimations();return;}
 if(!clip||!['axClipName','axClipDuration','axClipLoop','axClipAuto'].includes(id))return;
 history();
 if(id==='axClipName')clip.name=e.target.value.trim().slice(0,60)||'Animação';
 if(id==='axClipDuration')clip.duration=clamp(e.target.value,.1,120);
 if(id==='axClipLoop')clip.loop=e.target.checked;
 if(id==='axClipAuto')clip.autoplay=e.target.checked;
 touch();renderAnimations();
}
function paintPointer(worldX,worldY,{erase=false}={}){
 const p=getProject();if(!p||p.mode==='3d'||p.mode==='html5')return false;
 const {x,y}=snapCell(p,worldX,worldY);
 try{const changed=setTile(p,x,y,{color:paintColor,solid:paintSolid,erase:erase||tool==='erase'});if(changed){touch();return true;}}catch(e){notify(e.message);}return false;
}
function initialize(opts){
 config=opts;for(const id of ['tabScenes','tabTiles','tabAnimation','tabPrefabs'])if(!$(id))console.warn('[Aurenix Studio] Painel ausente:',id);
 document.addEventListener('click',onClick);document.addEventListener('change',onChange);
 renderAll();
}
global.AurenixStudio07={
 ensureScenes,syncScene,activateScene,createScene,deleteScene,renameScene,moveScene,
 freshTilemap,tileAt,setTile,snapCell,keyPose,ensureAnimations,addClip,addKeyframe,interpolate,
 savePrefab,createFromPrefab,prefabs,removePrefab,
 initialize,renderAll,renderScenes,renderTiles,renderAnimations,renderPrefabs,
 paintPointer,stopPreview,get paintColor(){return paintColor;},get paintSolid(){return paintSolid;}
};
})(window);