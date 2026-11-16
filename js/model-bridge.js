/* Aurenix Model Bridge — importar personagens completos para o projeto 3D. */
(function(global){
'use strict';
const C=global.AurenixCharacters,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let cfg={},rows=[],chosen='';
const project=()=>cfg.getProject?.();
function makeAsset(model,id){
 const m=C.validate(model);
 return {id,libraryId:null,name:m.name+'.aurenix3d',type:'application/x-aurenix-character+json',data:JSON.stringify(m)};
}
function toCharacter(asset){
 const m=C.validate(JSON.parse(asset.data));
 return {model:m,asset};
}
function place(asset){
 const p=project();if(!p||p.mode!=='3d'){cfg.toast?.('Abra um projeto 3D para colocar personagens');return false;}
 let model;
 try{model=toCharacter(asset).model;}catch(e){cfg.toast?.('Modelo inválido: '+e.message);return false;}
 cfg.history?.();
 const focus=cfg.getCamera?.()?.target||[0,0,0];
 const obj=global.AurenixRuntime.makeObj('character3d',{
  id:global.AurenixRuntime.uid(),type:'character3d',name:model.name,
  x:Number(focus[0])||0,y:1.5,z:Number(focus[2])||0,
  w:1.25,h:3,d:1.3,assetId:asset.id,modelScale:1,rigClip:model.animations[0]?.id||'',
  rigPlaying:true,rigTime:0,solid:false,visible:true,anchored:false
 });
 p.objects.push(obj);cfg.selectObject?.(obj.id);cfg.changed?.();cfg.toast?.('Personagem colocado na cena 3D');
 return true;
}
async function importLibrary(id){
 const p=project();if(!p||p.mode!=='3d'){cfg.toast?.('Selecione um projeto 3D');return;}
 const row=await C.library().load(id);if(!row)return;
 const model=C.validate(row.model);
 cfg.history?.();
 let a=p.assets.find(a=>a.libraryId===id&&a.type==='application/x-aurenix-character+json');
 if(a){a.data=JSON.stringify(model);a.name=model.name+'.aurenix3d';}
 else{a=makeAsset(model,global.AurenixRuntime.uid());a.libraryId=id;p.assets.push(a);}
 cfg.changed?.();cfg.renderAssets?.();cfg.refresh?.();
 place(a);
}
async function importFile(file){
 const p=project();if(!p||p.mode!=='3d')throw Error('Importe modelos somente em projetos 3D');
 if(file.size>900000)throw Error('Máximo de 900 KB por personagem');
 const m=C.validate(JSON.parse(await file.text()));
 cfg.history?.();
 const asset=makeAsset(m,global.AurenixRuntime.uid());
 p.assets.push(asset);cfg.changed?.();cfg.renderAssets?.();place(asset);
 cfg.toast?.('Personagem '+m.name+' importado!');
}
async function refresh(){
 const box=$('axModelBridge'),p=project();if(!box)return;
 if(!p){box.innerHTML='<p>Abra um projeto para importar personagens.</p>';return;}
 const projectItems=(p.assets||[]).filter(a=>a.type==='application/x-aurenix-character+json');
 try{rows=(await C.library().list()).sort((a,b)=>b.updated-a.updated);}
 catch(e){rows=[];cfg.toast?.('Biblioteca 3D indisponível: '+e.message);}
 box.innerHTML='<div class="ax-studio-heading"><h3>🎭 Personagens 3D</h3><p>Monte modelos low-poly com articulações, poses e animações. Tudo sem pagar.</p></div>'+
 '<div class="ax08-quick"><button data-model="open">🧩 Abrir Model Studio</button><button data-model="refresh">⟳ Atualizar</button></div>'+
 '<label class="upload-button">⇧ Importar .aurenix3d<input id="axModelPicker" type="file" accept=".aurenix3d,.json" hidden></label>'+
 (p.mode==='3d'?'<div class="ax-studio-heading"><h3>Biblioteca no celular</h3><p>Toque em ＋ para inserir no jogo. Salve primeiro no Model Studio.</p></div>':'<p class="ax08-note">Abra um projeto 3D para inserir personagens na cena.</p>')+
 (rows.length?rows.map(r=>'<div class="ax-modelrow"><div><b>♟ '+esc(r.name)+'</b><small>'+(r.model?.parts?.length||0)+' peças • '+(r.model?.animations?.length||0)+' animações</small></div><button data-model-lib="'+esc(r.id)+'">＋ Colocar</button></div>').join(''):'<p class="ax08-note">Nenhum personagem salvo nesta instalação.</p>')+
 '<div class="ax-studio-heading"><h3>Personagens no projeto</h3><p>Esses modelos já ficam incluídos nos backups do projeto e no APK exportado.</p></div>'+
 (projectItems.length?projectItems.map(a=>'<div class="ax-modelrow"><div><b>'+esc(a.name)+'</b></div><button data-model-project="'+esc(a.id)+'">＋ Colocar</button></div>').join(''):'<p class="ax08-note">Ainda não existem personagens importados para este projeto.</p>');
 const picker=$('axModelPicker');picker.onchange=async e=>{const f=e.target.files[0];if(!f)return;try{await importFile(f);}catch(ex){cfg.toast?.(ex.message);}picker.value='';};
}
function init(config){
 cfg=config||{};
 const box=$('axModelBridge');if(!box)return;
 box.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.model==='open'){cfg.goModeler?.();return;}
  if(b.dataset.model==='refresh'){await refresh();return;}
  if(b.dataset.modelLib){try{await importLibrary(b.dataset.modelLib);}catch(error){cfg.toast?.(error.message);}return;}
  if(b.dataset.modelProject){const asset=(project()?.assets||[]).find(x=>x.id===b.dataset.modelProject);if(asset)place(asset);}
 });
 refresh();
}
global.AurenixModelBridge={init,refresh,importLibrary,importFile,place};
})(window);
