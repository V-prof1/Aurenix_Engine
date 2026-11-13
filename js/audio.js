/* Aurenix Audio Studio — importação, prévia, mixagem, papéis e efeitos gerados offline. */
(function(global){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clip=(n,lo,hi)=>Math.min(hi,Math.max(lo,Number(n)||0));
const uid=()=> 'snd'+Math.random().toString(36).slice(2,10);
const defaults=()=>({master:1,music:0.7,sfx:0.85,mute:false,musicAssetId:'',jumpAssetId:'',actionAssetId:'',musicAuto:true});
let panel=null,ctx=null,preview=null,previewId='',onChange=()=>{},getProject=()=>null,importFiles=()=>{},addAsset=()=>{};
function project(){return getProject();}
function prefs(){const p=project();if(!p)return defaults();p.audio={...defaults(),...(p.audio||{})};return p.audio;}
function audios(){return (project()?.assets||[]).filter(a=>String(a.type||'').startsWith('audio/'));}
function selected(asset){const p=prefs();return p.musicAssetId===asset.id?'music':p.jumpAssetId===asset.id?'jump':p.actionAssetId===asset.id?'action':'none';}
function stop(){if(preview){preview.pause();preview.removeAttribute('src');preview.load();preview=null;previewId='';}if(panel)panel.querySelector('#axAudioPlaying')?.replaceChildren(document.createTextNode('Nenhum som tocando'));}
function previewAsset(id){
 const a=audios().find(x=>x.id===id);if(!a)return;
 if(previewId===id){stop();render();return;}
 stop();const v=prefs(),group=(selected(a)==='music'||a.category==='music')?v.music:v.sfx;
 const sound=new Audio(a.data);sound.preload='auto';sound.volume=v.mute?0:clip((a.volume??1)*v.master*group,0,1);
 sound.loop=!!a.loop;sound.playbackRate=clip(a.rate??1,.5,2);
 sound.onended=()=>{if(!sound.loop){previewId='';render();}};
 sound.onerror=()=>{status('O Android não conseguiu reproduzir esse formato de áudio.');stop();};
 sound.ontimeupdate=()=>{const progress=panel?.querySelector('#axAudioProgress');if(progress&&Number.isFinite(sound.duration)&&sound.duration>0){progress.value=Math.round(sound.currentTime/sound.duration*100);}};
 preview=sound;previewId=id;sound.play().then(render).catch(err=>{status('Toque em ▶ novamente para permitir áudio: '+err.message);stop();render();});
}
function status(s){const el=panel?.querySelector('#axAudioStatus');if(el)el.textContent=s;}
function musicChoices(value,selectedId){
 return '<option value="">Nenhum</option>'+audios().map(a=>'<option value="'+esc(a.id)+'" '+(value===a.id?'selected':'')+'>'+esc(a.name)+'</option>').join('');
}
function row(a){
 const role=selected(a);
 return '<article class="ax-aud-item"><div class="ax-aud-summary"><div class="ax-aud-file">♫</div><div class="ax-aud-name"><strong>'+esc(a.name)+'</strong><small>'+esc(a.type||'Áudio')+' · '+(role==='music'?'Música de fundo':role==='jump'?'Pulo':role==='action'?'Ação':'Biblioteca')+'</small></div><button class="ax-aud-play" data-preview="'+esc(a.id)+'" aria-label="Tocar ou parar">'+(previewId===a.id?'■ Parar':'▶ Ouvir')+'</button></div>'+
 '<div class="ax-aud-cols"><label>Tipo<select data-id="'+esc(a.id)+'" data-property="category"><option value="sfx" '+(a.category!=='music'?'selected':'')+'>Efeito sonoro</option><option value="music" '+(a.category==='music'?'selected':'')+'>Música</option></select></label>'+
 '<label>Usar no jogo<select data-id="'+esc(a.id)+'" data-property="role"><option value="none" '+(role==='none'?'selected':'')+'>Sem ação automática</option><option value="music" '+(role==='music'?'selected':'')+'>🎵 Fundo do jogo</option><option value="jump" '+(role==='jump'?'selected':'')+'>↑ Ao pular</option><option value="action" '+(role==='action'?'selected':'')+'>◎ Botão Ação</option></select></label></div>'+
 '<div class="ax-aud-sliders"><label>Volume <b>'+Math.round(clip(a.volume??1,0,1)*100)+'%</b><input type="range" min="0" max="100" step="1" value="'+Math.round(clip(a.volume??1,0,1)*100)+'" data-id="'+esc(a.id)+'" data-property="volume"></label><label>Velocidade <b>'+clip(a.rate??1,.5,2).toFixed(2)+'×</b><input type="range" min="50" max="200" step="5" value="'+Math.round(clip(a.rate??1,.5,2)*100)+'" data-id="'+esc(a.id)+'" data-property="rate"></label></div>'+
 '<div class="ax-aud-footer"><label><input type="checkbox" '+(a.loop?'checked':'')+' data-id="'+esc(a.id)+'" data-property="loop"> Repetir áudio</label><button data-rename="'+esc(a.id)+'">✎ Renomear</button><button data-delete="'+esc(a.id)+'" class="danger">✕ Remover</button></div></article>';
}
function render(){
 if(!panel)return;
 const v=prefs();
 panel.innerHTML='<div class="ax-aud-head"><div><small>ESTÚDIO DE ÁUDIO</small><h3>♫ Música e efeitos</h3><p>Importe MP3, WAV, OGG ou crie efeitos. Tudo fica salvo dentro do projeto.</p></div><label class="ax-aud-import">＋ Importar som<input type="file" id="axAudioFile" accept="audio/*,.mp3,.wav,.ogg,.m4a" multiple hidden></label></div>'+
 '<div class="ax-aud-master"><label><span>Volume geral <strong>'+Math.round(v.master*100)+'%</strong></span><input type="range" data-mix="master" min="0" max="100" value="'+Math.round(v.master*100)+'"></label><label><span>Música <strong>'+Math.round(v.music*100)+'%</strong></span><input type="range" data-mix="music" min="0" max="100" value="'+Math.round(v.music*100)+'"></label><label><span>Efeitos <strong>'+Math.round(v.sfx*100)+'%</strong></span><input type="range" data-mix="sfx" min="0" max="100" value="'+Math.round(v.sfx*100)+'"></label><div class="ax-aud-checks"><label><input type="checkbox" data-mix="mute" '+(v.mute?'checked':'')+'> Silenciar</label><label><input type="checkbox" data-mix="musicAuto" '+(v.musicAuto?'checked':'')+'> Tocar música ao iniciar</label></div></div>'+
 '<div class="ax-aud-help">🎮 <strong>Uso no jogo:</strong> selecione a música de fundo e atribua sons aos botões Pular e Ação. Scripts JS também podem chamar <code>api.playSound("Nome do áudio")</code>. No Android, o primeiro toque libera o áudio.</div>'+
 '<div class="ax-aud-synth"><h4>⚡ Criador de efeitos (sem arquivos externos)</h4><div class="ax-aud-cols"><label>Efeito<select id="axSfxPreset"><option value="jump">Pulo</option><option value="coin">Moeda</option><option value="laser">Laser</option><option value="hit">Impacto</option><option value="power">Poder</option><option value="menu">Clique de menu</option></select></label><label>Forma de onda<select id="axSfxWave"><option value="sine">Suave</option><option value="square">8-bit</option><option value="triangle">Retro</option><option value="saw">Agressivo</option></select></label></div><div class="ax-aud-cols"><label>Frequência <input id="axSfxFreq" min="80" max="1800" value="540" type="number"></label><label>Duração (s) <input id="axSfxDuration" min=".05" max="3" step=".05" value=".3" type="number"></label></div><button id="axGenerateSfx">＋ Gerar WAV no projeto</button></div>'+
 '<div class="ax-aud-library"><h4>📂 Biblioteca ('+audios().length+')</h4><div class="ax-aud-now" id="axAudioPlaying">'+(previewId?'▶ Reproduzindo áudio':'Nenhum som tocando')+'</div><input id="axAudioProgress" type="range" min="0" max="100" value="0" aria-label="Progresso da prévia">'+(audios().length?audios().map(row).join(''):'<p class="ax-aud-empty">Nenhum som importado. Toque em <b>Importar som</b> ou gere um efeito WAV acima.</p>')+'</div><p class="ax-aud-status" id="axAudioStatus" role="status"></p>';
}
function generateWave(preset,wave,freq,duration){
 const sampleRate=22050,n=Math.max(1,Math.min(sampleRate*3,Math.round(sampleRate*duration))),bytes=new Uint8Array(44+2*n),dv=new DataView(bytes.buffer),write=(i,s)=>{for(let j=0;j<s.length;j++)bytes[i+j]=s.charCodeAt(j);};
 write(0,'RIFF');dv.setUint32(4,36+2*n,true);write(8,'WAVE');write(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,sampleRate,true);dv.setUint32(28,sampleRate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);write(36,'data');dv.setUint32(40,2*n,true);
 let phase=0;
 for(let i=0;i<n;i++){
  const t=i/n,cur=({jump:freq*(.55+t*.95),coin:freq*(1.5+.22*Math.sin(t*36)),laser:freq*(1.7-t*1.3),hit:freq*(.75-.65*t),power:freq*(.6+t*1.8),menu:freq*.9})[preset]||freq;
  phase+=2*Math.PI*cur/sampleRate;const a=phase%(Math.PI*2);
  const sound=wave==='square'?(Math.sin(a)>=0?1:-1):wave==='triangle'?(2/Math.PI*Math.asin(Math.sin(a))):wave==='saw'?(2*a/(Math.PI*2)-1):Math.sin(a);
  const env=Math.sin(Math.PI*Math.min(.15,t/.05)/2)*Math.pow(1-t,preset==='hit'?4:2);
  const noise=preset==='hit'?(Math.random()*2-1)*.35*(1-t):0;
  dv.setInt16(44+i*2,Math.round(clip((sound*.65+noise)*env,-1,1)*32767),true);
 }
 let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return 'data:audio/wav;base64,'+btoa(binary);
}
function bind(){
 if(!panel)return;
 panel.addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el)return;
  const id=el.dataset.preview;if(id){previewAsset(id);return;}
  const remove=el.dataset.delete;if(remove){const a=audios().find(a=>a.id===remove);if(!a||!confirm('Remover '+a.name+' e suas atribuições?'))return;onChange();const p=project();p.assets=p.assets.filter(x=>x.id!==remove);for(const key of ['musicAssetId','jumpAssetId','actionAssetId'])if(prefs()[key]===remove)prefs()[key]='';if(previewId===remove)stop();render();return;}
  const rename=el.dataset.rename;if(rename){const a=audios().find(a=>a.id===rename),name=a&&prompt('Novo nome do áudio',a.name);if(name?.trim()){onChange();a.name=name.trim().slice(0,100);render();}return;}
  if(el.id==='axGenerateSfx'){
   const preset=$('axSfxPreset')?.value||'jump',wave=$('axSfxWave')?.value||'sine',freq=clip($('axSfxFreq')?.value,80,1800),duration=clip($('axSfxDuration')?.value,.05,3);
   const data=generateWave(preset,wave,freq,duration),name='Aurenix-'+preset+'-'+Date.now()+'.wav';
   addAsset({id:uid(),name,type:'audio/wav',data,category:'sfx',volume:1,rate:1,loop:false});render();status('✓ Efeito WAV criado e adicionado ao projeto.');
  }
 });
 panel.addEventListener('change',e=>{
   const t=e.target;
   if(t.id==='axAudioFile'){importFiles(t.files).then(()=>{render();status('Áudios importados para a biblioteca.');}).catch(e=>status('Não foi possível importar: '+e.message));t.value='';return;}
   if(t.dataset.mix){onChange();const cfg=prefs();cfg[t.dataset.mix]=t.type==='checkbox'?t.checked:clip(Number(t.value)/100,0,1);render();return;}
   if(t.dataset.id){const a=audios().find(x=>x.id===t.dataset.id);if(!a)return;onChange();const key=t.dataset.property,val=t.value;
     if(key==='role'){const cfg=prefs();for(const attr of ['musicAssetId','jumpAssetId','actionAssetId'])if(cfg[attr]===a.id)cfg[attr]='';if(val==='music'){cfg.musicAssetId=a.id;a.category='music';}if(val==='jump')cfg.jumpAssetId=a.id;if(val==='action')cfg.actionAssetId=a.id;}
     else if(key==='volume')a.volume=clip(Number(val)/100,0,1);
     else if(key==='rate')a.rate=clip(Number(val)/100,.5,2);
     else if(key==='loop')a.loop=t.checked;else if(key==='category')a.category=val;
     render();
   }
 });
 panel.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='axAudioProgress'&&preview?.duration){preview.currentTime=preview.duration*clip(Number(t.value)/100,0,1);return;}
  if(t.dataset.mix&&!t.checked){const tval=t.closest('label')?.querySelector('strong');if(tval)tval.textContent=t.value+'%';}
  if(t.dataset.property==='volume'||t.dataset.property==='rate'){const b=t.closest('label')?.querySelector('b');if(b)b.textContent=t.dataset.property==='volume'?t.value+'%':(Number(t.value)/100).toFixed(2)+'×';}
 });
}
function init(args){panel=$(args.panelId||'audioPanel');if(!panel)return;getProject=args.getProject;onChange=args.onChange||onChange;importFiles=args.importFiles||importFiles;addAsset=args.addAsset||addAsset;bind();render();}
global.AurenixAudio={init,render,stop,generateWave,defaults};
})(window);