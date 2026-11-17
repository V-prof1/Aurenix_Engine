/* Aurenix Model Studio — editor 3D offline para celular (sem assinaturas ou bibliotecas externas). */
(function(){
'use strict';
const C=window.AurenixCharacters,R=window.AurenixRuntime,T=window.AurenixModelTouch,$=id=>document.getElementById(id);
const clone=C.copy,clamp=(x,a,b)=>Math.min(b,Math.max(a,Number(x)||0));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types=[['cube','▣ Cubo'],['sphere','● Esfera'],['capsule','⬟ Cápsula'],['cylinder','⬢ Cilindro'],['cone','▲ Cone'],['pyramid','◆ Pirâmide'],['torus','◎ Anel']];
const library=C.library(),canvas=$('view'),renderer=new R.Renderer3D(canvas),Tracks=C.AurenixTracks,Sym=C.AurenixSymmetry;
let model=C.preset('blocky'),libId=null,selectedId=model.parts[0].id,clipId='',time=0,draftPose=null,draftExpression=null,draftTransforms=null,draftModified=false,playing=false,dirty=false,tool='orbit',snapToGrid=false,depthAxis=false;
let activeTrack='body',pairSelecting=false,pendingPair=[],movingKey=null,skipKeyClick=false,selectedKey=null;
let history=[],future=[],camera={yaw:.65,pitch:.32,distance:7.5,target:[0,1.3,0]},pointers=new Map(),lastTouch=null,lastFrame=performance.now(),toastId=0,previewParts=[],lastOverlay=0,draggedPart=null;
const selected=()=>model.parts.find(p=>p.id===selectedId)||null;
const clip=()=>model.animations.find(c=>c.id===clipId)||null;
const canRedo=()=>future.length>0;
const currentTransforms=()=>draftTransforms||C.getTransforms(model,clipId,time);
function dataAtTrack(channel){
 if(channel==='body')return {pose:clone(currentPose())};
 if(channel==='face')return {expression:currentExpression()};
 return {transforms:clone(currentTransforms())};
}
function commitDraft(){
 if(!clip()||!draftModified)return;
 Tracks.capture(model,clip(),activeTrack,time,dataAtTrack(activeTrack));
 draftModified=false;mark();renderMarkers();
}
function switchTrack(channel){
 if(!Tracks.groups.includes(channel))return;
 if(activeTrack!==channel)commitDraft();
 activeTrack=channel;renderMarkers();
}

function loadDraft(t){
 const c=clip();
 time=clamp(t,0,c?.duration||1);
 draftPose=c?C.getPose(model,c.id,time):null;
 draftTransforms=c?C.getTransforms(model,c.id,time):null;
 draftExpression=null;draftModified=false;
 updateClock();renderFace();renderInspector();
}
function partDisplay(p){
 const transforms=clip()?currentTransforms():null,from=transforms?.[p.id];
 return {
  position:[...(from?.position||p.position)],
  offset:[...(from?.offset||p.offset)],
  size:[...(from?.size||p.size)],
  rotation:[...(clip()?(currentPose()[p.id]||p.rotation):p.rotation)]
 };
}
function setTool(name){
 if(!['orbit','select','move','rotate','scale','face'].includes(name))return;
 tool=name;playing=false;
 if(name==='face'){
  if(!model.parts.some(p=>p.faceRole)){
   notify('Para editar rosto, selecione um personagem com olhos e boca.');
  }
  camera.yaw=0;camera.pitch=0;
  const head=model.parts.find(p=>/cabeça/i.test(p.name));
  if(head)camera.target=[0,2.1,0];
  camera.distance=clamp(camera.distance,3.7,9);
 }
 for(const b of document.querySelectorAll('[data-tool14]')){
  const on=b.dataset.tool14===tool;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
 }
 const labels={orbit:'Arraste: orbitar • Dois dedos: zoom/panorâmica',select:'Toque uma peça para selecioná-la',
  move:'Arraste a peça para mover • Botão Z altera profundidade',rotate:'Arraste a peça para girar • Z controla rotação lateral',
  scale:'Arraste para cima/baixo para aumentar ou diminuir',
  face:'Toque olho, boca ou sobrancelha e arraste diretamente para mudar a expressão'};
 $('ax14ToolHint').textContent=labels[name];
 renderTouchMarkers();
}
function renderTouchMarkers(){
 const panel=$('ax14TouchMarkers');if(!panel)return;
 panel.replaceChildren();
 if(tool!=='face'&&tool!=='select'&&tool!=='move'&&tool!=='rotate'&&tool!=='scale')return;
 const points=tool==='face'?T.faceMarkers(previewParts,point=>renderer.project(point)):
  (()=>{const p=previewParts.find(p=>p._partId===selectedId);if(!p)return [];
   const point=renderer.project([p.x,p.y,p.z]);return point?[{id:p._partId,role:'selected',symbol:'✥',x:point.x,y:point.y}]:[];})();
 const width=canvas.clientWidth,height=canvas.clientHeight;
 for(const p of points){
  if(p.x<25||p.y<35||p.x>width-25||p.y>height-25)continue;
  const el=document.createElement('div');
  el.className='ax14-face-point'+(p.id===selectedId?' selected':'');
  el.style.left=p.x+'px';el.style.top=p.y+'px';
  el.textContent=p.symbol;el.title=p.role;
  panel.appendChild(el);
 }
}

const currentPose=()=>draftPose||Object.fromEntries(model.parts.map(p=>[p.id,[...p.rotation]]));
function notify(message){
 const box=$('toast');box.textContent=message;box.style.display='block';clearTimeout(toastId);
 toastId=setTimeout(()=>{box.style.display='none';},3000);
}
function snapshot(){
 const data={model:clone(model),selectedId,clipId,time,dirty,draftPose:clone(draftPose),draftTransforms:clone(draftTransforms),draftExpression,draftModified};
 history.push(data);if(history.length>70)history.shift();future=[];updateUndo();
}
function restore(state){
 model=state.model;selectedId=state.selectedId;clipId=state.clipId;time=state.time;dirty=true;playing=false;draftPose=state.draftPose|| (clip()?C.getPose(model,clipId,time):null);draftTransforms=state.draftTransforms|| (clip()?C.getTransforms(model,clipId,time):null);draftExpression=state.draftExpression||null;draftModified=!!state.draftModified;draftExpression=null;
 renderAll();
}
function undo(){if(!history.length)return;const prev=history.pop();future.push({model:clone(model),selectedId,clipId,time,dirty,draftPose:clone(draftPose),draftTransforms:clone(draftTransforms),draftExpression,draftModified});restore(prev);}
function redo(){if(!future.length)return;history.push({model:clone(model),selectedId,clipId,time,dirty,draftPose:clone(draftPose),draftTransforms:clone(draftTransforms),draftExpression,draftModified});restore(future.pop());}
function updateUndo(){$('undo').disabled=!history.length;$('redo').disabled=!canRedo();}
function mark(){dirty=true;updateClock();}
function setSelected(id){
 if(pairSelecting){
  const part=model.parts.find(p=>p.id===id);
  if(!part)return;
  if(pendingPair.includes(id))pendingPair=pendingPair.filter(x=>x!==id);
  else if(pendingPair.length<2)pendingPair.push(id);
  else{notify('Selecione somente duas peças. Toque numa das escolhidas para removê-la.');return;}
  selectedId=id;
 }else selectedId=id;
 renderTree();renderInspector();renderPairStatus();
}
function renderPairStatus(){
 const hint=$('ax16PairStatus'),lock=$('ax16PairLock'),toggle=$('ax16PairSelect');
 if(!hint)return;
 const selectedParts=pendingPair.map(id=>model.parts.find(p=>p.id===id)).filter(Boolean);
 const pair=selectedParts.length===2&&Sym.compatible(model,...selectedParts);
 const linked=Sym.partner(model,selectedId);
 hint.textContent=pairSelecting?(selectedParts.length<2?'Selecione duas peças da mesma família (ex.: os dois olhos).':
 pair?'✓ Par válido: '+selectedParts.map(x=>x.name).join(' + ')+'. Aperte Bloquear.':'⚠ Pares diferentes não podem ser vinculados. Escolha dois olhos, dois braços etc.') :
 linked?'🔒 '+model.parts.find(x=>x.id===selectedId)?.name+' ↔ '+linked.name+' • alterações espelhadas.':
 'Toque em Selecionar 2, escolha os dois membros correspondentes e pressione Bloquear.';
 lock.disabled=!pair;
 toggle.classList.toggle('active',pairSelecting);
 $('ax16PairUnlock').disabled=!linked;
}
function closeDrawers(){
 $('leftPanel').classList.remove('open');$('rightPanel').classList.remove('open');$('shade').classList.remove('open');
}
function drawer(side){
 const left=$('leftPanel'),right=$('rightPanel');const open=side==='left'?left:right;
 const show=!open.classList.contains('open');closeDrawers();
 if(show){open.classList.add('open');$('shade').classList.add('open');}
}
function updateClock(){
 const c=clip(),timeLabel=$('clock');timeLabel.textContent=(Number(time)||0).toFixed(2)+'s'+(dirty?' ●':'');
 const scrub=$('scrub');scrub.max=String(c?.duration||1);scrub.value=String(Math.min(time,c?.duration||1));updateTrackPlayhead();
}
function renderTree(){
 const box=$('tree'),map=new Map(model.parts.map(p=>[p.id,p]));
 box.innerHTML=model.parts.map(p=>{
  let depth=0,x=p;while(x?.parent&&depth<8){x=map.get(x.parent);depth++;}
  return '<button data-part="'+esc(p.id)+'" class="'+(selectedId===p.id?'active ':'')+(pendingPair.includes(p.id)?'ax16-pending ':'')+(Sym.partner(model,selectedId)?.id===p.id||p.id===selectedId&&Sym.partner(model,selectedId)?'ax16-locked':'')+'" style="padding-left:'+(9+depth*10)+'px"><span>◇</span><span>'+esc(p.name)+'</span><span class="tag">'+esc(p.type)+'</span></button>';
 }).join('');
}
function field(key,label,val,type='number',extra=''){
 return '<label>'+esc(label)+'<input type="'+type+'" data-field="'+key+'" value="'+esc(val)+'" '+extra+'></label>';
}
function vector(prefix,label,values){
 return '<h3>'+esc(label)+'</h3><div class="fieldgrid">'+['X','Y','Z'].map((axis,i)=>field(prefix+i,axis,values[i],'number','step=".05"')).join('')+'</div>';
}
function renderInspector(){
 const p=selected(),box=$('inspector');
 if(!p){box.innerHTML='<p>Selecione uma peça do personagem.</p>';return;}
 const parents=model.parts.filter(x=>x.id!==p.id);
 const disabled=(other)=>{
  let walk=other;const map=new Map(model.parts.map(x=>[x.id,x]));
  while(walk){if(walk.id===p.id)return true;walk=map.get(walk.parent);}return false;
 };
 const shown=partDisplay(p),angles=shown.rotation;
 box.innerHTML=(Sym.partner(model,p.id)?'<div class="ax16-pair-status">🔒 Vinculado a <b>'+esc(Sym.partner(model,p.id).name)+'</b>. Movimentos X e rotações espelhados. <button type="button" id="ax16PairUnlockInspector">🔓 Desbloquear</button></div>':'')+'<div class="group">'+field('name','Nome da peça',p.name,'text','maxlength="60"')+
 '<label>Formato<select data-field="type">'+types.map(([key,name])=>'<option value="'+key+'" '+(key===p.type?'selected':'')+'>'+name+'</option>').join('')+'</select></label>'+
 '<label>Ligada à peça<select data-field="parent"><option value="">— Centro do personagem —</option>'+
 parents.filter(x=>!disabled(x)).map(x=>'<option value="'+esc(x.id)+'" '+(p.parent===x.id?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label>'+
 field('color','Cor',p.color,'color')+'</div>'+
 '<div class="group">'+vector('position',clip()?'Articulação / pivô • KEYFRAME':'Articulação / pivô',shown.position)+
 vector('offset',clip()?'Deslocamento visual • KEYFRAME':'Centro visual (ajuste fino)',shown.offset)+vector('size',clip()?'Tamanho • KEYFRAME':'Tamanho',shown.size)+
 '<h3>ROTAÇÃO '+(clip()?'DESTA POSE':'BASE')+'</h3><div class="fieldgrid">'+['X','Y','Z'].map((axis,i)=>field('rotation'+i,axis,Number(angles[i]).toFixed(1),'number','step="1"')).join('')+'</div></div>'+
 '<p class="hint">💡 Girar uma articulação também move suas peças filhas. Para animar, escolha uma animação, gire o braço/perna e toque em ◆ Pose.</p>';
}
function renderClips(){
 const list=$('clip'),chosen=clip(),names=model.animations.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===clipId?'selected':'')+'>'+esc(c.name)+'</option>').join('');
 list.innerHTML='<option value="">Pose original</option>'+names;
 const box=$('clipEditor');
 if(!chosen){box.innerHTML='<p>Toque em <b>＋ Animação</b> ou selecione um movimento pronto no painel Peças.</p>';updateClock();renderMarkers();return;}
 box.innerHTML='<div class="group">'+field('clipName','Nome da animação',chosen.name,'text','maxlength="50"')+
 '<label>Duração (segundos)<input data-field="clipDuration" type="number" min=".1" max="120" step=".1" value="'+chosen.duration+'"></label>'+
 '<label>Velocidade<input data-field="clipSpeed" type="number" min=".1" max="4" step=".1" value="'+chosen.speed+'"></label>'+
 '<label>Suavização<select data-field="clipEase">'+[['smooth','Suave'],['linear','Linear'],['step','Quadros discretos']].map(([id,name])=>'<option value="'+id+'" '+(chosen.ease===id?'selected':'')+'>'+name+'</option>').join('')+'</select></label>'+
 '<label style="flex-direction:row;align-items:center"><input type="checkbox" data-field="clipLoop" '+(chosen.loop?'checked':'')+' style="width:21px;height:21px"> Repetir movimento</label>'+
 '<button id="deleteClip" style="background:#593140">✕ Excluir animação</button></div>';
 updateClock();renderMarkers();
}
function renderMarkers(){
 const box=$('markers'),c=clip(),tracks=$('ax14Tracks'),controls=$('ax16TrackControls');
 if(!tracks)return;
 if(!c){box.innerHTML='';tracks.innerHTML='<div class="ax14-help">Crie uma animação para editar Corpo, Rosto e Objetos de modo independente.</div>';if(controls)controls.innerHTML='';return;}
 const channels=Tracks.ensure(c);
 box.innerHTML=c.frames.map(f=>'<button data-time="'+f.time+'">◆ '+f.time.toFixed(1)+'</button>').join('');
 const names=[['body','🦴 Corpo'],['face','😄 Rosto'],['objects','🧱 Objetos']];
 tracks.innerHTML=names.map(([channel,label])=>{
  const dots=channels[channel].map(f=>{
   const pct=clamp(f.time/c.duration*100,0,100);
   const current=Math.abs(f.time-time)<.013?' current':'';
   const selected=selectedKey?.channel===channel&&Math.abs(selectedKey.time-f.time)<.004?' ax16-selected-frame':'';
   const symbol=channel==='body'?'◆':channel==='face'?'☺':'▣';
   return '<button type="button" class="ax14-track-dot'+current+selected+'" data-track="'+channel+'" data-time="'+f.time+'" style="left:'+pct+'%" title="Arraste este frame para mudar o tempo ou toque para selecionar" aria-label="Frame '+label+' em '+f.time.toFixed(2)+' segundos">'+symbol+'</button>';
  }).join('');
  return '<div class="ax14-track'+(channel===activeTrack?' active':'')+'" data-track-row="'+channel+'"><span class="ax14-track-label">'+label+'</span>'+
  '<div class="ax14-track-content" data-track-area="'+channel+'" role="slider" aria-label="Tempo: '+label+'" aria-valuemin="0" aria-valuemax="'+c.duration+'" aria-valuenow="'+time.toFixed(2)+'">'+
  dots+'<div class="ax14-track-playhead" style="left:'+clamp(time/c.duration*100,0,100)+'%"></div></div>'+
  '<button type="button" class="ax16-add-to-row" data-track-add="'+channel+'" title="Gravar um frame apenas nesta trilha">＋</button></div>';
 }).join('');
 if(!controls)return;
 const label={body:'🦴 Corpo',face:'😄 Rosto',objects:'🧱 Objetos'}[activeTrack];
 const hasSelected=!!selectedKey&&selectedKey.channel===activeTrack&&channels[activeTrack].some(f=>Math.abs(f.time-selectedKey.time)<.004);
 const displayTime=hasSelected?selectedKey.time:time;
 controls.innerHTML='<span class="ax16-selected-track">'+label+'</span>'+
 '<button type="button" data-track-nav="-1" title="Frame anterior nesta trilha">◀</button>'+
 '<button type="button" data-track-create title="Gravar quadro apenas nesta trilha">◆＋</button>'+
 '<button type="button" data-track-copy '+(!hasSelected?'disabled':'')+' title="Duplicar quadro nesta trilha">⧉</button>'+
 '<button type="button" data-track-delete '+(!hasSelected?'disabled':'')+' title="Apagar apenas o frame selecionado">✕</button>'+
 '<button type="button" data-track-nav="1" title="Próximo frame nesta trilha">▶</button>'+
 '<label>Tempo <input id="ax16FrameTime" type="number" min="0" max="'+c.duration+'" step=".01" value="'+displayTime.toFixed(2)+'" aria-label="Tempo deste frame em segundos"></label>';
}
function selectTrackFrame(channel,t){
 if(!clip())return;
 switchTrack(channel);
 selectedKey={channel,time:Number(t)};
 playing=false;applyFramePreview(Number(t));renderMarkers();
}
function trackCreate(channel=activeTrack){
 const c=clip();if(!c)return;
 switchTrack(channel);snapshot();
 Tracks.capture(model,c,channel,time,dataAtTrack(channel));selectedKey={channel,time};
 draftModified=false;mark();renderMarkers();notify('◆ Frame adicionado somente na trilha '+({body:'Corpo',face:'Rosto',objects:'Objetos'}[channel]));
}
function trackDelete(){
 const c=clip();if(!c||!selectedKey||selectedKey.channel!==activeTrack){notify('Selecione um frame nesta trilha antes de excluir');return;}
 snapshot();
 if(!Tracks.erase(c,activeTrack,selectedKey.time)){history.pop();return;}
 selectedKey=null;loadDraft(time);mark();renderMarkers();notify('Frame excluído apenas desta trilha.');
}
function trackCopy(){
 const c=clip(),selected=selectedKey;
 if(!c||!selected||selected.channel!==activeTrack)return;
 const item=Tracks.ensure(c)[activeTrack].find(f=>Math.abs(f.time-selected.time)<.004);if(!item)return;
 const next=Tracks.normalizedTime(c,Math.min(c.duration,item.time+.12));
 if(Math.abs(next-item.time)<.01){notify('Sem espaço ao final da timeline');return;}
 snapshot();Tracks.capture(model,c,activeTrack,next,Object.fromEntries(Object.entries(item).filter(([k])=>k!=='time')));
 selectedKey={channel:activeTrack,time:next};applyFramePreview(next);mark();renderMarkers();
}
function trackNavigate(dir){
 const c=clip();if(!c)return;
 const frames=Tracks.ensure(c)[activeTrack],sorted=frames.map(f=>f.time).sort((a,b)=>a-b);
 if(!sorted.length){notify('Esta trilha não possui frames. Toque em ◆＋.');return;}
 const next=dir>0?sorted.find(v=>v>time+.003):sorted.slice().reverse().find(v=>v<time-.003);
 selectTrackFrame(activeTrack,next??(dir>0?sorted[0]:sorted[sorted.length-1]));
}
function trackSeek(e){
 const c=clip(),dot=e.target.closest('[data-track][data-time]');
 if(!c)return;
 if(dot){
  if(skipKeyClick){skipKeyClick=false;return;}
  selectTrackFrame(dot.dataset.track,Number(dot.dataset.time));return;
 }
 const area=e.target.closest('[data-track-area]');if(!area)return;
 const rect=area.getBoundingClientRect();
 const next=Tracks.normalizedTime(c,Math.max(0,Math.min(1,(e.clientX-rect.left)/Math.max(1,rect.width)))*c.duration);
 switchTrack(area.dataset.trackArea);selectedKey=null;
 playing=false;applyFramePreview(next);renderMarkers();
}
function trackPointerDown(e){
 const dot=e.target.closest('.ax14-track-dot');if(!dot||!clip())return;
 movingKey={channel:dot.dataset.track,from:Number(dot.dataset.time),id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false,dot};
 try{dot.setPointerCapture(e.pointerId);}catch(_){}
}
function trackPointerMove(e){
 const drag=movingKey;if(!drag||drag.id!==e.pointerId)return;
 if(!drag.dragged&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;
 drag.dragged=true;
 const area=drag.dot.closest('[data-track-area]'),rect=area.getBoundingClientRect(),c=clip();
 drag.to=Tracks.normalizedTime(c,(e.clientX-rect.left)/Math.max(1,rect.width)*c.duration);
 drag.dot.style.left=(drag.to/c.duration*100)+'%';
}
function trackPointerUp(e){
 const drag=movingKey;if(!drag||drag.id!==e.pointerId)return;
 movingKey=null;
 if(!drag.dragged)return;
 skipKeyClick=true;setTimeout(()=>{skipKeyClick=false;},160);
 const c=clip();if(!c)return;
 switchTrack(drag.channel);
 snapshot();
 if(!Tracks.move(c,drag.channel,drag.from,drag.to)){
  history.pop();notify('Já existe um frame neste tempo ou a posição é inválida.');
 }else{
  selectedKey={channel:drag.channel,time:drag.to};time=drag.to;loadDraft(drag.to);mark();notify('Frame movido apenas na trilha selecionada.');
 }
 renderMarkers();
}

function updateTrackPlayhead(){
 const c=clip(),tracks=$('ax14Tracks');if(!c||!tracks)return;
 const v=clamp(time/c.duration*100,0,100);
 tracks.querySelectorAll('.ax14-track-playhead').forEach(el=>el.style.left=v+'%');
}

function currentExpression(){
 if(typeof draftExpression==='string')return draftExpression;
 const c=clip();if(!c)return model.face?.expression||'neutral';
 if(c.tracks)return Tracks.getChannel(model,c,time,'face').expression;
 const prev=c.frames.filter(f=>f.time<=time+.001).at(-1)||c.frames[0];
 return prev?.expression||model.face?.expression||'neutral';
}
function renderFace(){
 const expr=currentExpression(),name=C.FACE_EXPRESSIONS.find(([id])=>id===expr)?.[1]||'😐 Neutro';
 const label=$('faceStatus');if(label)label.textContent=name+(clip()?' • grave com ◆ Pose':'');
 const intensity=$('faceStrength');if(intensity)intensity.value=String(model.face?.intensity??1);
 for(const button of document.querySelectorAll('[data-expression]')){
  const active=button.dataset.expression===expr;
  button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false');
 }
}
function setExpression(expression){
 if(!C.FACE_EXPRESSIONS.some(([id])=>id===expression))return;
 if(clip())switchTrack('face');
 snapshot();playing=false;
 if(clip()){draftExpression=expression;draftModified=true;}
 else{model.face??={expression:'neutral',intensity:1};model.face.expression=expression;draftExpression=null;}
 mark();renderFace();notify(clip()?'Expressão pronta. Toque em ◆ Pose para gravar.':'Expressão aplicada ao modelo.');
}
function renderAll(){
 $('name').value=model.name;renderTree();renderInspector();renderClips();renderFace();updateClock();updateUndo();renderPairStatus();
}
function applyFramePreview(t){
 commitDraft();loadDraft(t);renderMarkers();
}
function resetPose(){commitDraft();playing=false;clipId='';selectedKey=null;activeTrack='body';time=0;draftPose=null;draftExpression=null;draftTransforms=null;draftModified=false;renderAll();}
function addPart(){
 if(model.parts.length>=C.MAX_PARTS){notify('Limite de 80 peças');return;}
 snapshot();const parent=selected(),p=C.part('Nova peça','cube',parent?.id||null,parent?[0,.8,0]:[0,1.5,0],[0,.1,0],[.42,.42,.42],'#81c7e8');
 model.parts.push(p);selectedId=p.id;mark();renderAll();notify('Peça adicionada. Ajuste o tamanho e articulação.');
}
function clonePart(mirror=false){
 const p=selected();if(!p)return;
 if(model.parts.length>=C.MAX_PARTS){notify('Limite de 80 peças');return;}
 snapshot();const copy=clone(p);copy.id=C.uid();copy.name=(mirror?'Espelho: ':'Cópia: ')+p.name;
 if(mirror){copy.position[0]*=-1;copy.offset[0]*=-1;copy.rotation[1]*=-1;copy.rotation[2]*=-1;}
 else copy.position[0]+=.4;
 model.parts.push(copy);selectedId=copy.id;mark();renderAll();
}
function addAccessory(kind){
 const head=model.parts.find(x=>/cabeça|head/i.test(x.name))||model.parts[0];
 const torso=model.parts.find(x=>/tronco|torso/i.test(x.name))||model.parts[0];
 const leftArm=model.parts.find(x=>/braço esquerdo/i.test(x.name))||torso;
 const rightArm=model.parts.find(x=>/braço direito/i.test(x.name))||torso;
 const parts=[];
 const make=(name,type,parent,pos,offset,size,color,rotation)=>parts.push(C.part(name,type,parent.id,pos,offset,size,color,rotation||[0,0,0]));
 if(kind==='hair'){
  make('Cabelo estilizado','cube',head,[0,.6,0],[0,.12,0],[.72,.3,.63],'#293957');
  make('Franja','cube',head,[0,.51,.28],[0,-.10,0],[.56,.27,.14],'#293957');
 }else if(kind==='glasses'){
  make('Lente esquerda','cube',head,[-.19,.34,.4],[0,0,0],[.27,.2,.06],'#273e59');
  make('Lente direita','cube',head,[.19,.34,.4],[0,0,0],[.27,.2,.06],'#273e59');
  make('Ponte do óculos','cube',head,[0,.34,.4],[0,0,0],[.14,.05,.065],'#9cb1cc');
 }else if(kind==='hat'){
  make('Aba do chapéu','cylinder',head,[0,.64,0],[0,0,0],[.97,.08,.9],'#2d4966');
  make('Copa do chapéu','cylinder',head,[0,.77,0],[0,.1,0],[.59,.3,.58],'#395879');
 }else if(kind==='horns'){
  make('Chifre esquerdo','cone',head,[-.25,.56,0],[0,.18,0],[.2,.5,.2],'#d7d5dc');
  make('Chifre direito','cone',head,[.25,.56,0],[0,.18,0],[.2,.5,.2],'#d7d5dc');
 }else if(kind==='wings'){
  make('Asa esquerda','cube',torso,[-.45,.34,-.35],[-.45,.12,-.15],[.82,1.22,.13],'#8199d4',[0,-10,-23]);
  make('Asa direita','cube',torso,[.45,.34,-.35],[.45,.12,-.15],[.82,1.22,.13],'#8199d4',[0,10,23]);
 }else if(kind==='tail'){
  make('Cauda','capsule',torso,[0,-.42,-.34],[0,-.27,-.2],[.24,.7,.25],'#b796bc',[58,0,0]);
 }else if(kind==='sword'){
  make('Cabo da espada','cylinder',rightArm,[0,-.86,.15],[0,-.16,0],[.11,.36,.11],'#493d4b');
  make('Lâmina da espada','cube',rightArm,[0,-1.23,.15],[0,-.3,0],[.14,.65,.09],'#b5e7ed');
  make('Guarda da espada','cube',rightArm,[0,-1.05,.15],[0,0,0],[.4,.09,.16],'#d9b575');
 }else if(kind==='shield'){
  make('Escudo','cube',leftArm,[0,-.65,.34],[0,-.12,.05],[.68,.76,.16],'#4786ad');
  make('Emblema','sphere',leftArm,[0,-.74,.45],[0,0,0],[.26,.28,.07],'#d7c282');
 }
 if(!parts.length)return;
 if(model.parts.length+parts.length>C.MAX_PARTS){notify('Limite de 80 peças: não é possível adicionar esse acessório');return;}
 snapshot();model.parts.push(...parts);selectedId=parts[0].id;
 if(clip())for(const a of model.animations)for(const f of a.frames)for(const p of parts)f.pose[p.id]=[...p.rotation];
 draftPose=clip()?C.getPose(model,clipId,time):null;mark();renderAll();notify('Acessório adicionado! Ajuste cores e tamanho como quiser.');
}
function removePart(){
 const p=selected();if(!p||model.parts.length<=1){notify('O modelo precisa ter ao menos uma peça');return;}
 const children=model.parts.filter(x=>x.parent===p.id);
 if(children.length&&!confirm('Esta peça tem '+children.length+' peça(s) filha(s). Elas serão ligadas ao pai da peça excluída. Excluir?'))return;
 snapshot();for(const c of children)c.parent=p.parent||null;
 model.parts=model.parts.filter(x=>x.id!==p.id);
 for(const a of model.animations)for(const f of a.frames)delete f.pose[p.id];
 selectedId=p.parent||model.parts[0].id;mark();renderAll();
}
function selectClip(id){
 commitDraft();playing=false;clipId=id;selectedKey=null;activeTrack='body';time=0;draftPose=id?C.getPose(model,id,0):null;draftTransforms=id?C.getTransforms(model,id,0):null;draftExpression=null;draftModified=false;
 renderInspector();renderClips();renderFace();
}
function createClip(){
 const name=prompt('Nome do movimento','Minha animação');if(!name)return;
 commitDraft();snapshot();const c=C.newClip(model,name);Tracks.ensure(c);activeTrack='body';selectedKey=null;clipId=c.id;time=0;draftPose=C.getPose(model,c.id,0);draftTransforms=C.getTransforms(model,c.id,0);draftExpression=null;draftModified=false;
 mark();renderAll();notify('Gire as peças e capture poses em tempos diferentes.');
}
function capturePose(){
 const c=clip();if(!c){notify('Crie ou selecione uma animação');return;}
 trackCreate(activeTrack);
}
function captureAllTracks(){
 const c=clip();if(!c){notify('Crie uma animação primeiro');return;}
 snapshot();Tracks.ensure(c);
 for(const channel of Tracks.groups)Tracks.capture(model,c,channel,time,dataAtTrack(channel));
 selectedKey={channel:activeTrack,time};draftModified=false;mark();renderMarkers();
 notify('✓ Corpo, rosto e objetos gravados em '+time.toFixed(2)+'s!');
}
function removeFrame(){trackDelete();}

function autoMovement(kind){
 const labels={idle:'Respirar',walk:'Caminhar',run:'Corrida',attack:'Ataque',
  wave:'Acenar',jump:'Pular',hit:'Receber dano',dance:'Dançar',blink:'Piscar',talk:'Conversar'};
 if(model.animations.length>=C.MAX_CLIPS){notify('Máximo de 24 animações');return;}
 commitDraft();snapshot();const c=C.newClip(model,labels[kind]||'Movimento');
 const base=Object.fromEntries(model.parts.map(p=>[p.id,[...p.rotation]]));
 const leftArm=model.parts.find(p=>/braço esquerdo/i.test(p.name)),rightArm=model.parts.find(p=>/braço direito/i.test(p.name)),
  leftLeg=model.parts.find(p=>/perna esquerda/i.test(p.name)),rightLeg=model.parts.find(p=>/perna direita/i.test(p.name)),
  torso=model.parts.find(p=>/tronco/i.test(p.name)),head=model.parts.find(p=>/cabeça/i.test(p.name));
 c.duration={idle:2,run:.55,attack:.8,blink:.5,talk:1.2,wave:1.3,jump:.85,hit:.65,dance:1.6}[kind]||1;
 const steps=kind==='idle'?[0,.25,.5,.75,1]:kind==='attack'?[0,.25,.55,1]:
  kind==='blink'?[0,.35,.5,.65,1]:kind==='hit'?[0,.2,.5,1]:
  kind==='talk'?[0,.12,.25,.37,.5,.62,.75,.87,1]:[0,.25,.5,.75,1];
 c.loop=!['attack','jump','hit'].includes(kind);
 c.frames=steps.map((step,i)=>{
  const pose=clone(base);
  const set=(part,axis,value)=>{if(part)pose[part.id][axis]+=value;};
  const wave=Math.sin(step*Math.PI*2);
  let expression=model.face?.expression||'neutral';
  if(kind==='idle'){
   set(torso,0,wave*3);set(leftArm,2,wave*3);set(rightArm,2,-wave*3);
  }else if(kind==='attack'){
   set(rightArm,0,[0,-65,-120,0][i]);set(torso,1,[0,-10,20,0][i]);set(leftArm,0,[0,15,25,0][i]);
   expression=step>.2&&step<.75?'angry':'neutral';
  }else if(kind==='wave'){
   set(rightArm,0,-115);set(rightArm,2,20+wave*25);set(head,2,wave*6);expression='happy';
  }else if(kind==='jump'){
   set(leftLeg,0,step<.5?-22:16);set(rightLeg,0,step<.5?-22:16);
   set(leftArm,2,-35);set(rightArm,2,35);set(torso,0,step<.5?12:-8);
   expression=step>.25&&step<.8?'surprised':'happy';
  }else if(kind==='hit'){
   set(torso,0,[0,-24,-15,0][i]);set(head,0,[0,19,10,0][i]);
   set(leftArm,2,[0,-35,-19,0][i]);set(rightArm,2,[0,35,19,0][i]);
   expression=step===0?'neutral':'scared';
  }else if(kind==='dance'){
   set(torso,2,wave*18);set(head,2,-wave*12);set(leftArm,2,55+wave*30);set(rightArm,2,-55+wave*30);
   set(leftLeg,0,wave*18);set(rightLeg,0,-wave*18);expression='happy';
  }else if(kind==='blink'){
   expression=step>.2&&step<.8?'blink':'neutral';
  }else if(kind==='talk'){
   expression=i%2?'talk':'neutral';
   set(head,0,wave*2.5);set(rightArm,0,wave*8);
  }else{
   const angle=kind==='run'?50:28;
   set(leftLeg,0,wave*angle);set(rightLeg,0,-wave*angle);
   set(leftArm,0,-wave*angle*.85);set(rightArm,0,wave*angle*.85);
   set(torso,0,kind==='run'?8:3);
  }
  return {time:Number((c.duration*step).toFixed(4)),pose,expression};
 });
 Tracks.ensure(c);activeTrack='body';selectedKey=null;clipId=c.id;time=0;draftPose=C.getPose(model,c.id,0);draftTransforms=C.getTransforms(model,c.id,0);draftExpression=null;draftModified=false;mark();renderAll();
 notify('Animação '+labels[kind]+' pronta! Ajuste movimentos e expressões.');
}
async function saveModel(){
 try{
  model.name=$('name').value.trim().slice(0,72)||'Personagem';
  commitDraft();const checked=C.validate(model);libId=await library.save(checked,libId||undefined);
  model=checked;dirty=false;draftExpression=null;draftModified=false;updateClock();renderFace();await renderLibrary();
  notify('✓ Personagem salvo no aplicativo!');return true;
 }catch(e){notify('Erro ao salvar: '+e.message);return false;}
}
function exportFile(blob,filename){
 if(window.AurenixFiles){window.AurenixFiles.save(blob,filename).then(result=>notify('Arquivo exportado'+(result?.path?' para '+result.path:''))).catch(e=>notify(e.message));return;}
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 notify('Arquivo pronto para baixar.');
}
function slug(x){return String(x||'modelo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').slice(0,55).toLowerCase();}
function exportJSON(){try{model.name=$('name').value.trim()||'Personagem';commitDraft();const checked=C.validate(model);
 exportFile(new Blob([JSON.stringify(checked,null,2)],{type:'application/json'}),slug(checked.name)+'.aurenix3d');
 }catch(e){notify(e.message);}}
function exportOBJ(){
 const root={id:'export',x:0,y:0,z:0,visible:true};
 commitDraft();const parts=C.expand(model,root,clipId,time,currentPose(),draftExpression,currentTransforms());
 let vertices=[],faces=[],materials=['# Aurenix Model Studio — OBJ: malha estática, sem rig ou animações'],counter=1;
 for(const p of parts){
  const mesh=R.createGeometry(p.type);if(!mesh?.p)continue;
  materials.push('o '+p._partId.replace(/[^a-zA-Z0-9_-]/g,'_'));
  const vals=mesh.p;
  for(let i=0;i<vals.length;i+=3){
   const point=C.transformPoint(p._modelMatrix,[vals[i],vals[i+1],vals[i+2]]);
   materials.push('v '+point.map(x=>x.toFixed(5)).join(' '));
  }
  for(let i=0;i<vals.length;i+=9){materials.push('f '+counter+' '+(counter+1)+' '+(counter+2));counter+=3;}
 }
 if(counter>300000){notify('Modelo muito grande para exportar');return;}
 exportFile(new Blob([materials.join('\n')+'\n'],{type:'text/plain'}),slug(model.name)+'.obj');
}
async function loadPixelPalette(){
 const box=$('ax14PixelPalette');
 box.innerHTML='<p>Carregando cores…</p>';
 try{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open('aurenix-pixelstudio-v1',1);
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('Biblioteca indisponível'));
  });
  const artworks=await new Promise((resolve,reject)=>{
   const req=db.transaction('artworks','readonly').objectStore('artworks').getAll();
   req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);
  });db.close();
  const colors=[...new Set(artworks.sort((a,b)=>(b.updated||0)-(a.updated||0)).flatMap(a=>a.palette||[]).filter(c=>/^#[a-f0-9]{6}$/i.test(c)))].slice(0,72);
  box.replaceChildren();
  if(!colors.length){box.textContent='Crie ou salve uma paleta no Pixel Studio para usar aqui.';return;}
  for(const color of colors){
   const b=document.createElement('button');b.type='button';b.style.background=color;
   b.dataset.palcolor=color;b.title='Aplicar '+color+' à peça selecionada';
   b.setAttribute('aria-label','Pintar peça com '+color);box.appendChild(b);
  }
  notify(colors.length+' cores do Pixel Studio disponíveis.');
 }catch(error){box.textContent='Não foi possível carregar cores: '+error.message;}
}
async function leaveStudio(target){
 if(dirty&&!await saveModel())return;
 location.href=target;
}
async function renderLibrary(){
 const box=$('libraryList');try{
 const rows=(await library.list()).sort((a,b)=>b.updated-a.updated);
 box.innerHTML=rows.length?rows.map(r=>'<div class="group"><b>'+esc(r.name)+'</b><div class="row"><button data-load="'+esc(r.id)+'">↗ Abrir</button><button data-del="'+esc(r.id)+'">✕</button></div></div>').join(''):'<p>Nenhum personagem salvo. Toque em Salvar.</p>';
 }catch(e){box.innerHTML='<p>Biblioteca indisponível: '+esc(e.message)+'</p>';}
}
async function importFile(file){
 if(!file||file.size>900000){notify('Arquivo muito grande (máximo 900 KB)');return;}
 try{
  const doc=C.validate(JSON.parse(await file.text()));if(dirty&&!confirm('Substituir o personagem atual por '+doc.name+'?'))return;
  snapshot();model=doc;libId=null;selectedId=model.parts[0].id;clipId='';draftPose=null;draftTransforms=null;draftModified=false;draftExpression=null;time=0;playing=false;dirty=true;renderAll();notify('Personagem importado!');
 }catch(e){notify('Erro ao importar: '+e.message);}
}
function editField(input,saveHistory=false){
 const p=selected();if(!p)return;
 const key=input.dataset.field;if(!key)return;
 if(clip()&&/^(position|offset|size|rotation)[0-2]$/.test(key))switchTrack(key.startsWith('rotation')?'body':'objects');
 const before=Sym.snapshot(p,partDisplay(p));
 if(key.startsWith('clip')){
  const c=clip();if(!c)return;
  if(key==='clipName')c.name=String(input.value).slice(0,50);
  if(key==='clipDuration'){c.duration=clamp(input.value,.1,120);for(const f of c.frames)f.time=clamp(f.time,0,c.duration);time=clamp(time,0,c.duration);}
  if(key==='clipSpeed')c.speed=clamp(input.value,.1,4);
  if(key==='clipEase')c.ease=input.value;
  if(key==='clipLoop')c.loop=input.checked;
  mark();renderClips();return;
 }
 if(key==='name'){p.name=input.value.slice(0,60);}
 else if(key==='type'){p.type=input.value;}
 else if(key==='parent'){p.parent=input.value||null;}
 else if(key==='color')p.color=input.value;
 else{
  const m=key.match(/^(position|offset|size|rotation)([0-2])$/);if(!m)return;
  const axis=Number(m[2]),value=clamp(input.value,m[1]==='size'?.02:-500,m[1]==='size'?30:500);
  if(m[1]==='rotation'){
   if(clip()){draftPose??=C.getPose(model,clipId,time);draftPose[p.id]??=[...p.rotation];draftPose[p.id][axis]=value;draftModified=true;}
   else p.rotation[axis]=value;
  }else if(clip()){
   draftTransforms??=C.getTransforms(model,clipId,time);
   const base=partDisplay(p);
   draftTransforms[p.id]??={position:[...base.position],offset:[...base.offset],size:[...base.size]};
   draftTransforms[p.id][m[1]][axis]=value;draftModified=true;
  }else p[m[1]][axis]=value;
 }
 const after=Sym.snapshot(p,partDisplay(p));
 Sym.mirror(model,p.id,before,after,{clip:!!clip(),pose:draftPose,transforms:draftTransforms});
 mark();renderTree();renderPairStatus();
}
function changeField(e){
 if(!e.target.matches('[data-field]'))return;
 if(e.target.dataset.axTouched){delete e.target.dataset.axTouched;renderInspector();return;}
 snapshot();editField(e.target,true);renderInspector();
}
function visualEdit(e){
 if(!e.target.matches('input[data-field]'))return;
 if(!/^(position|offset|size|rotation)\d$/.test(e.target.dataset.field))return;
 // Store original pose only once on focus, not on each slider value.
 if(!e.target.dataset.axTouched){snapshot();e.target.dataset.axTouched='1';}
 editField(e.target);
}
function touchCanvas(){
 const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
 canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();try{canvas.setPointerCapture(e.pointerId);}catch{}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
  if(pointers.size>1){draggedPart=null;lastTouch=null;touchCanvas.previous=null;return;}
  lastTouch={x:e.clientX,y:e.clientY,time:performance.now(),moved:false};
  draggedPart=null;
  if(tool!=='orbit'){
   const mesh=T.pick(previewParts,point(e),v=>renderer.project(v),{facesOnly:tool==='face',threshold:tool==='face'?44:61});
   if(mesh){
    setSelected(mesh._partId);
    if(tool!=='select'){
     const p=selected();
     if(p)draggedPart={id:p.id,pointerId:e.pointerId,sx:e.clientX,sy:e.clientY,start:partDisplay(p),didMove:false};
    }
   }
  }
 });
 canvas.addEventListener('pointermove',e=>{
  const p=pointers.get(e.pointerId);if(!p)return;
  e.preventDefault();
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(pointers.size>=2){
   draggedPart=null;if(lastTouch)lastTouch.moved=true;
   const ps=[...pointers.values()];
   if(ps.length!==2)return;
   const a=ps[0],b=ps[1],dist=Math.hypot(a.x-b.x,a.y-b.y);
   if(!touchCanvas.previous){touchCanvas.previous={dist,centerX:(a.x+b.x)/2,centerY:(a.y+b.y)/2};return;}
   const old=touchCanvas.previous;
   if(dist>15&&old.dist>15)camera.distance=clamp(camera.distance*old.dist/dist,2.6,38);
   const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,px=mx-old.centerX,py=my-old.centerY;
   camera.target[0]-=(px*Math.cos(camera.yaw)+py*Math.sin(camera.yaw))*camera.distance*.002;
   camera.target[2]+=(px*Math.sin(camera.yaw)-py*Math.cos(camera.yaw))*camera.distance*.002;
   touchCanvas.previous={dist,centerX:mx,centerY:my};return;
  }
  if(draggedPart&&draggedPart.pointerId===e.pointerId&&['move','rotate','scale','face'].includes(tool)){
   const mx=e.clientX-draggedPart.sx,my=e.clientY-draggedPart.sy;
   if(!draggedPart.didMove&&Math.hypot(mx,my)<6)return;
   if(!draggedPart.didMove){snapshot();draggedPart.didMove=true;}
   if(clip())switchTrack(tool==='rotate'?'body':'objects');
   const part=model.parts.find(p=>p.id===draggedPart.id);
   if(!part)return;
   const beforeMirror=Sym.snapshot(part,partDisplay(part));
   const value=T.transform({tool,start:draggedPart.start,dx:mx,dy:my,camera,snapToGrid,depth:depthAxis});
   if(!value)return;
   if(tool==='rotate'){
    if(clip()){draftPose??=C.getPose(model,clipId,time);draftPose[part.id]=value.rotation;draftModified=true;}
    else part.rotation=value.rotation;
   }else if(clip()){
    draftTransforms??=C.getTransforms(model,clipId,time);
    const old=partDisplay(part);
    draftTransforms[part.id]??={position:[...old.position],offset:[...old.offset],size:[...old.size]};
    if(tool==='scale')draftTransforms[part.id].size=value.size;
    else draftTransforms[part.id].position=value.position;
    draftModified=true;
   }else{
    if(tool==='scale')part.size=value.size;
    else part.position=value.position;
   }
   if(lastTouch)lastTouch.moved=true;
   Sym.mirror(model,part.id,beforeMirror,Sym.snapshot(part,partDisplay(part)),{clip:!!clip(),pose:draftPose,transforms:draftTransforms});
   playing=false;mark();return;
  }
  if(lastTouch&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>8)lastTouch.moved=true;
  if(tool==='orbit'||tool==='select'||!draggedPart){
   camera.yaw-=dx*.009;camera.pitch=clamp(camera.pitch-dy*.008,-1.35,1.35);
  }
 });
 function finish(e,cancel=false){
  const p=pointers.get(e.pointerId);if(!p)return;
  pointers.delete(e.pointerId);
  if(pointers.size<2)touchCanvas.previous=null;
  if(draggedPart?.pointerId===e.pointerId&&draggedPart.didMove){
   renderInspector();renderTouchMarkers();
   if(clip())$('ax14ToolHint').textContent='◆ Movimento ajustado! Grave tudo ou mude o tempo para salvar o keyframe.';
  }else if(!cancel&&pointers.size===0&&lastTouch&&!lastTouch.moved&&Math.hypot(e.clientX-lastTouch.x,e.clientY-lastTouch.y)<10){
   const mesh=T.pick(previewParts,point(e),v=>renderer.project(v),{facesOnly:tool==='face',threshold:tool==='face'?46:55});
   if(mesh){
    setSelected(mesh._partId);
    if(tool==='select'&&matchMedia('(max-width:720px)').matches)drawer('right');
   }
  }
  if(pointers.size===0){lastTouch=null;draggedPart=null;}
 }
 canvas.addEventListener('pointerup',e=>finish(e));
 canvas.addEventListener('pointercancel',e=>finish(e,true));
 canvas.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))finish(e,true);});
 window.addEventListener('blur',()=>{pointers.clear();lastTouch=null;draggedPart=null;touchCanvas.previous=null;playing=false;});
}
function loop(now){
 const dt=clamp((now-lastFrame)*.001,0,.1);lastFrame=now;
 const c=clip();
 if(playing&&c){time+=dt*(c.speed||1);if(c.loop)time%=c.duration;else if(time>=c.duration){time=c.duration;playing=false;}
  draftPose=C.getPose(model,c.id,time);draftTransforms=C.getTransforms(model,c.id,time);draftExpression=null;updateClock();renderFace();}
 const root={id:'preview',type:'character3d',visible:true,x:0,y:0,z:0,ry:0,rx:0,rz:0,modelScale:1};
 const pose=currentPose();
 previewParts=C.expand(model,root,clipId,time,pose,draftExpression,currentTransforms());
 if(renderer)renderer.render({mode:'3d',background:'#102032',objects:previewParts,assets:[]},camera,{grid:true,selectedId:root.id+'::'+selectedId});
 if(now-lastOverlay>95){renderTouchMarkers();lastOverlay=now;}
 requestAnimationFrame(loop);
}
async function onAction(e){
 const b=e.target.closest('button');if(!b)return;
 const id=b.id;
 try{
  if(b.dataset.tool14){setTool(b.dataset.tool14);return;}
  if(id==='ax14Snap'){snapToGrid=!snapToGrid;b.classList.toggle('active',snapToGrid);b.setAttribute('aria-pressed',String(snapToGrid));notify(snapToGrid?'Encaixe ativado: 0,05 unidade e 5°':'Encaixe desativado');return;}
  if(id==='ax14Depth'){depthAxis=!depthAxis;b.classList.toggle('active',depthAxis);b.setAttribute('aria-pressed',String(depthAxis));notify(depthAxis?'Movimento/rotação no eixo Z':'Movimento na superfície XY');return;}
  if(id==='ax14LoadPalette'){await loadPixelPalette();return;}
  if(b.dataset.palcolor){const p=selected();if(p){snapshot();p.color=b.dataset.palcolor;mark();renderInspector();notify('Cor aplicada à peça');}return;}
  if(id==='goPixel'){await leaveStudio('pixelstudio.html');return;}
  if(id==='goEditor'){await leaveStudio('index.html');return;}
  if(b.dataset.part){setSelected(b.dataset.part);if(matchMedia('(max-width:720px)').matches)closeDrawers();return;}
  if(b.dataset.time){applyFramePreview(Number(b.dataset.time));renderInspector();return;}
  if(b.dataset.load){
   const row=await library.load(b.dataset.load);if(!row)return;
   if(dirty&&!confirm('Abrir '+row.name+' e substituir as alterações não salvas?'))return;
   model=C.validate(row.model);libId=row.id;selectedId=model.parts[0].id;clipId='';draftPose=null;draftTransforms=null;draftModified=false;draftExpression=null;time=0;playing=false;dirty=false;history=[];future=[];renderAll();closeDrawers();notify('Personagem carregado.');return;
  }
  if(b.dataset.del){if(confirm('Excluir este modelo salvo do aplicativo?')){await library.remove(b.dataset.del);if(b.dataset.del===libId)libId=null;await renderLibrary();}return;}
  if(b.dataset.expression){setExpression(b.dataset.expression);return;}
  if(id==='addFace'){
   if(!model.parts.some(p=>/cabeça|head/i.test(p.name))){notify('Este objeto não tem cabeça. Adicione uma peça chamada Cabeça para criar um rosto.');return;}
   const before=model.parts.length;snapshot();C.ensureFace(model);
   if(model.parts.length===before){notify('Este modelo já tem um rosto completo.');history.pop();updateUndo();return;}
   mark();renderAll();notify('Rosto quadradinho adicionado!');return;
  }
  if(b.dataset.kit){addAccessory(b.dataset.kit);return;}
  if(b.dataset.auto){if(model.animations.length>=24){notify('Máximo de animações atingido');return;}autoMovement(b.dataset.auto);return;}
  if(id==='back'){await leaveStudio('index.html');return;}
  if(id==='undo')return undo();if(id==='redo')return redo();
  if(id==='save'||id==='mobileSave')return await saveModel();
  if(id==='export')return exportJSON();if(id==='exportOBJ')return exportOBJ();
  if(id==='import')return $('fileInput').click();
  if(id==='newPreset'){if(dirty&&!confirm('Criar um personagem novo e descartar alterações atuais?'))return;
   snapshot();model=C.preset($('preset').value);libId=null;selectedId=model.parts[0].id;clipId='';time=0;draftPose=null;draftTransforms=null;draftModified=false;draftExpression=null;playing=false;mark();renderAll();notify('Novo personagem criado!');return;}
  if(id==='library'){await renderLibrary();return;}
  if(id==='addPart')return addPart();if(id==='clonePart')return clonePart();if(id==='mirrorPart')return clonePart(true);if(id==='removePart')return removePart();
  if(id==='frameModel'){camera={yaw:.65,pitch:.32,distance:7.5,target:[0,1.3,0]};return;}
  if(id==='resetPose'){resetPose();return;}
  if(id==='openParts'){drawer('left');return;}if(id==='openProps'||id==='openAnim'){drawer('right');return;}
  if(id==='newClip')return createClip();
  if(id==='play'){if(!clip()){notify('Crie uma animação');return;}commitDraft();playing=true;return;}
  if(id==='pause'){playing=false;return;}
  if(id==='capture')return capturePose();if(id==='deleteFrame')return removeFrame();
  if(id==='deleteClip'){const c=clip();if(c&&confirm('Excluir a animação '+c.name+'?')){snapshot();model.animations=model.animations.filter(x=>x.id!==c.id);clipId='';draftPose=null;draftTransforms=null;draftExpression=null;draftModified=false;playing=false;mark();renderAll();}return;}
 }catch(error){console.error(error);notify(error.message);}
}
function init(){
 $('name').value=model.name;
 $('name').addEventListener('change',()=>{snapshot();model.name=$('name').value.trim().slice(0,72)||'Personagem';mark();});
 $('faceStrength').addEventListener('change',e=>{snapshot();model.face??={expression:'neutral',intensity:1};model.face.intensity=clamp(e.target.value,0,1);mark();renderFace();});
 $('clip').addEventListener('change',e=>selectClip(e.target.value));
 $('scrub').addEventListener('input',e=>{playing=false;applyFramePreview(Number(e.target.value));renderInspector();});
 $('fileInput').addEventListener('change',async e=>{await importFile(e.target.files?.[0]);e.target.value='';});
 document.addEventListener('click',onAction);
 document.addEventListener('change',changeField);
 document.addEventListener('input',visualEdit);
 document.addEventListener('focusout',e=>{if(e.target.dataset?.axTouched)delete e.target.dataset.axTouched;});
 window.visualViewport?.addEventListener('resize',()=>{lastOverlay=0;});
 $('shade').addEventListener('click',closeDrawers);
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeDrawers();
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveModel();}
 });
 const nativeApp=window.Capacitor?.Plugins?.App;
 nativeApp?.addListener?.('backButton',async()=>{
  if($('leftPanel').classList.contains('open')||$('rightPanel').classList.contains('open')){closeDrawers();return;}
  await leaveStudio('index.html');
 });
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')playing=false;});
 touchCanvas();renderAll();renderLibrary();setTool('orbit');requestAnimationFrame(loop);
}

/* Um único personagem local para todos os tutoriais de animação 3D. */
window.AurenixModelTutorialBridge={
 async openProject(){
  const trainingName='📘 Tutorial • Animações 3D';
  const records=await library.list(),found=records.find(row=>row.name===trainingName);
  if(found){const row=await library.load(found.id);if(row){model=C.validate(row.model);libId=row.id;}}
  else{model=C.preset('blocky');model.name=trainingName;libId=null;}
  C.ensureFace(model);selectedId=model.parts[0]?.id||'';clipId='';time=0;
  draftPose=null;draftExpression=null;draftTransforms=null;draftModified=false;history=[];future=[];playing=false;dirty=false;
  $('name').value=trainingName;model.name=trainingName;renderAll();await renderLibrary();
 },
 drawer(side){
  if(!matchMedia('(max-width:720px)').matches)return;
  const target=$(side==='left'?'leftPanel':'rightPanel');if(target.classList.contains('open'))return;
  closeDrawers();target.classList.add('open');$('shade').classList.add('open');
 },
 state(){return {parts:model.parts.length,clips:model.animations.length,selected:selectedId,expression:currentExpression()};},
 async save(){const title='📘 Tutorial • Animações 3D';$('name').value=title;model.name=title;return await saveModel();}
};
init();
})();
