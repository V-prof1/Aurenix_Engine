/* Aurenix 0.17 - painel mobile de mundos, câmeras e gameplay. */
(function(global){'use strict';
const A=global.AurenixAdvanced17,E=global.Aurenix08,$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let bridge={},page='world',brush='raise',radius=2,strength=.6,painting=false,activePointer=null;
const tabs=[['world','🌍 Mundo'],['camera','🎥 Câmeras'],['controls','🎮 Controles'],['combat','⚔️ Combate'],['npc','🧠 IA local'],['economy','💰 Economia'],['graphics','⚡ FPS/LOD'],['imports','📦 Modelos']];
const project=()=>bridge.getProject?.(),config=()=>project()?A.ensure(project()):null;
const field=(section,key,label,min,max,step=.1)=>{
 const value=config()?.[section]?.[key]??0;
 return '<label class="ax17-field"><span>'+label+'</span><input data-ax17-field="'+section+'.'+key+'" type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+esc(value)+'"></label>';
};
const checkbox=(section,key,label)=>'<label class="ax17-toggle"><input data-ax17-field="'+section+'.'+key+'" type="checkbox" '+(config()?.[section]?.[key]?'checked':'')+'><span>'+label+'</span></label>';
const select=(section,key,label,options)=>'<label class="ax17-field">'+label+'<select data-ax17-field="'+section+'.'+key+'">'+options.map(o=>'<option value="'+o[0]+'" '+(o[0]===config()?.[section]?.[key]?'selected':'')+'>'+o[1]+'</option>').join('')+'</select></label>';
const block=(title,desc,content)=>'<section class="ax17-block"><h4>'+title+'</h4><p>'+desc+'</p>'+content+'</section>';
function render(){
 const box=$('axAdvanced17Panel'),p=project();if(!box||!p)return;
 const a=config();let body='';
 if(page==='world'){
  A.worldInit(a.world);
  body=block('🌄 Terreno esculpível','Arraste no mapa com o dedo. O relevo é renderizado em 3D e carregado por proximidade.',
   checkbox('world','enabled','Ativar terreno 3D')+
   '<div class="ax17-grid">'+field('world','size','Células (9 a 65)',9,65,2)+field('world','cell','Tamanho da célula',.5,10,.5)+field('world','seed','Semente',1,999999,1)+field('world','renderRadius','Raio da região',2,20,1)+'</div>'+
   select('world','biome','Bioma',[['grass','Floresta'],['desert','Deserto'],['snow','Neve'],['dark','Escuro'],['volcanic','Vulcânico']])+
   '<button data-ax17-action="generate">⛰️ Regenerar relevo</button>'+
   '<div class="ax17-brushes">'+[['raise','⛰ Elevar'],['lower','↓ Abaixar'],['smooth','〰 Suavizar'],['flatten','▁ Achatar']].map(x=>'<button data-ax17-brush="'+x[0]+'" class="'+(brush===x[0]?'active':'')+'">'+x[1]+'</button>').join('')+'</div>'+
   '<div class="ax17-grid"><label>Raio<input id="ax17Radius" type="range" min="1" max="8" value="'+radius+'"></label><label>Força<input id="ax17Strength" type="range" min=".1" max="2" step=".1" value="'+strength+'"></label></div>'+
   '<canvas id="ax17Terrain" width="300" height="300" aria-label="Editor de terreno tocável"></canvas><small id="ax17HeightInfo">Toque para esculpir.</small>')+
   block('🌲 Vegetação & atmosfera','Cria árvores, arbustos e pedras como objetos editáveis na cena.',
    '<div class="ax17-actions"><button data-ax17-action="forest">🌲 Floresta</button><button data-ax17-action="rocks">🪨 Pedras</button><button data-ax17-action="clearing">🌾 Clareira</button></div>'+
    '<div class="ax17-grid">'+field('world','dayLength','Duração do dia (s)',30,3600,10)+field('world','fog','Neblina (0–1)',0,1,.05)+'</div>');
 }
 if(page==='camera')body=block('🎥 Câmera individual por jogo','Altere distância, inclinação e acompanhamento. A câmera isométrica mantém posição elevada.',
 select('camera','mode','Projeção',[['third','Terceira pessoa'],['isometric','Isométrica'],['fixed','Fixa']])+
 '<div class="ax17-grid">'+field('camera','yaw','Ângulo horizontal',-6.3,6.3,.05)+field('camera','pitch','Inclinação',.1,1.5,.05)+field('camera','distance','Distância',3,90,.5)+field('camera','smooth','Suavização',0,1,.05)+'</div>'+
 checkbox('camera','obstacleFade','Ocultação de obstáculos (experimental)')+
 '<button data-ax17-action="applyCamera">🎥 Aplicar câmera no editor</button>');
 if(page==='controls')body=block('🎮 Entrada multiplataforma','Touch, teclado físico e gamepad pela API Gamepad; suporte depende do navegador.',
 checkbox('controls','touch','Controles touchscreen')+checkbox('controls','keyboard','Teclado e mouse')+checkbox('controls','gamepad','Gamepads USB / Bluetooth')+
 '<div class="ax17-grid">'+field('controls','sensitivity','Sensibilidade',.2,4,.1)+field('controls','deadzone','Zona morta',0,.6,.02)+'</div>'+
 '<button data-ax17-action="gamepad">🎮 Detectar controles</button><p id="ax17Pads"></p>');
 if(page==='combat')body=block('⚔️ Personagens e construções','Vida, resistência, NPCs, estruturas e torretas por componentes. Componentes ficam editáveis em ⚡.',
 checkbox('combat','enabled','Habilitar combate')+
 '<div class="ax17-grid">'+field('combat','playerMaxHealth','Vida',1,10000,1)+field('combat','playerMaxStamina','Resistência',1,10000,1)+field('combat','staminaRegen','Regeneração/s',0,100,.5)+field('combat','enemyLimit','Inimigos ativos',1,150,1)+'</div>'+
 checkbox('combat','showHitboxes','Mostrar hitboxes')+
 '<div class="ax17-actions"><button data-ax17-action="enemy">☠ Inimigo</button><button data-ax17-action="turret">🎯 Torreta</button><button data-ax17-action="barricade">🧱 Barricada</button></div>');
 if(page==='npc')body=block('🧠 NPCs locais','Visão, audição, perseguição, patrulha, fuga e desvio simples de obstáculos. QI, submissão e alcance configuráveis por NPC.',
 '<div class="ax17-actions"><button data-ax17-action="enemy">＋ Criar monstro</button><button data-ax17-action="squad">♟ Grupo de 5</button></div>'+
 '<p>Para modificar QI e Submissão: escolha o inimigo → Componentes → Cérebro NPC.</p>');
 if(page==='economy')body=block('💰 Lojas e inventário','Itens com raridade I–VII e poder I–VII; estoque novo por dia e licença Divina por desbloqueio.',
 checkbox('economy','enabled','Ativar economia')+
 '<div class="ax17-grid">'+field('economy','coins','Moedas iniciais',0,999999,1)+field('economy','marketSeed','Semente da loja',1,999999,1)+field('inventory','slots','Espaços inventário',1,120,1)+'</div>'+
 checkbox('economy','licenseDivine','Licença Divina (teste)')+
 '<div class="ax17-actions"><button data-ax17-action="shop">🛒 Criar comerciante</button><button data-ax17-action="restock">🎲 Novo estoque</button></div>'+
 '<div id="ax17Stock"></div>');
 if(page==='graphics')body=block('⚡ Gráficos & desempenho','Streaming por região, limites de objetos e redução de renderizações distantes.',
 select('graphics','quality','Perfil',[['low','Econômico'],['balanced','Equilibrado'],['high','Alto']])+
 '<div class="ax17-grid">'+field('graphics','maxVisible','Terreno visível',40,700,10)+field('graphics','maxNpcs','NPCs ativos',1,150,1)+field('graphics','maxParticles','Partículas',10,1000,10)+field('graphics','lod','Distância LOD',.5,4,.1)+'</div>'+
 checkbox('graphics','fps','Monitor de FPS')+checkbox('graphics','shadows','Sombras (experimental)'));
 if(page==='imports'){
  const list=(p.assets||[]).filter(x=>x.gltf);
  body=block('📦 GLB / GLTF / OBJ / ZIP','Importação local. GLTF externo deve incluir buffers e texturas em ZIP. Reprodução por ossos e materiais PBR ainda não estão integrados.',
  '<button data-ax17-action="import">＋ Escolher modelos e pacotes</button>')+
  block('🎞 Clips e articulações identificadas','Visualização dos metadados de modelos importados.',
   list.length?list.map(m=>'<div class="ax17-asset"><b>'+esc(m.name)+'</b><small>'+m.gltf.triangles+' triângulos · '+m.gltf.joints+' ossos</small>'+
    m.gltf.clips.map(c=>'<small>◆ '+esc(c.name)+' · '+Number(c.duration).toFixed(2)+'s</small>').join('')+'</div>').join(''):'Nenhum GLTF importado ainda.');
 }
 box.innerHTML='<div class="ax17-head"><h3>✦ WORLD & SYSTEMS</h3><small>100% local • Editor 2D/3D • Sem APIs, créditos ou IA integrada</small></div>'+
 '<div class="ax17-nav">'+tabs.map(x=>'<button data-ax17-page="'+x[0]+'" class="'+(page===x[0]?'active':'')+'">'+x[1]+'</button>').join('')+'</div>'+body;
 if(page==='world')drawTerrain();if(page==='economy')stock();
}
function drawTerrain(){
 const canvas=$('ax17Terrain'),world=config()?.world;if(!canvas||!world)return;A.worldInit(world);
 const ctx=canvas.getContext('2d'),n=world.size,s=300/n;
 ctx.clearRect(0,0,300,300);
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){
  const h=Number(world.heights[z*n+x])||0;
  ctx.fillStyle=h<-.75?'#22567a':h<0?'#448a70':h<3?'#397853':'#938568';
  ctx.fillRect(x*s,z*s,Math.ceil(s+.1),Math.ceil(s+.1));
 }
}
function paint(e){
 const canvas=$('ax17Terrain'),w=config()?.world;if(!canvas||!w)return;
 const r=canvas.getBoundingClientRect(),x=Math.max(0,Math.min(299,(e.clientX-r.left)/r.width*300)),z=Math.max(0,Math.min(299,(e.clientY-r.top)/r.height*300));
 const worldX=(x/300*w.size-(w.size-1)/2)*w.cell,worldZ=(z/300*w.size-(w.size-1)/2)*w.cell;
 A.sculpt(w,worldX,worldZ,brush,radius,strength);drawTerrain();
 const label=$('ax17HeightInfo');if(label)label.textContent='X: '+worldX.toFixed(1)+' · Z: '+worldZ.toFixed(1)+' · Altura: '+(A.elevation(w,worldX,worldZ)||0).toFixed(2);
 bridge.changed?.();
}
function stock(){
 const box=$('ax17Stock'),adv=config();if(!box||!adv)return;
 box.innerHTML=A.restock(adv.economy,adv.economy.restockDay||0).map(item=>'<div class="ax17-item"><i style="background:'+A.colors[item.rarity-1]+'"></i>'+esc(item.name)+' — '+item.price+' moedas</div>').join('');
}
function add(type,props,components){
 const p=project(),o=global.AurenixRuntime.makeObj(type,props);o.components.push(...components);p.objects.push(o);return o;
}
function action(name){
 const p=project(),adv=config();if(!p||!adv)return;
 if(name==='import'){bridge.importFiles?.();return;}
 if(name==='gamepad'){
  const pads=[...(navigator.getGamepads?.()||[])].filter(Boolean);
  $('ax17Pads').textContent=pads.length?pads.map(x=>x.id).join(', '):'Nenhum controle encontrado. Pressione um botão após conectar.';
  return;
 }
 if(name==='applyCamera'){bridge.applyCamera?.(adv.camera);return;}
 if(name==='restock'){bridge.history?.();adv.economy.restockDay++;bridge.changed?.();stock();return;}
 if(p.mode!=='3d'){bridge.toast?.('Abra um projeto 3D para usar esta ação.');return;}
 bridge.history?.();
 if(name==='generate'){adv.world.heights=A.createTerrain(adv.world.size,adv.world.seed);adv.world.revision++;adv.world.enabled=true;render();}
 else if(['forest','rocks','clearing'].includes(name)){
  adv.world.enabled=true;p.objects.push(...A.scatter(p,name,25,adv.world.seed+Date.now()%10000));
 }else if(name==='enemy'||name==='squad'){
  for(let i=0;i<(name==='squad'?5:1);i++)add('capsule',{name:'Criatura '+(i+1),x:3+i*1.6,y:1,z:3,w:.85,h:1.9,d:.85,solid:true,anchored:true,color:'#c05073',health:85,maxHealth:85},[{type:'npcBrain',enabled:true,sight:14,hearing:6,speed:2.6,iq:45,submission:50,attack:8,range:1.6}]);
 }else if(name==='turret')add('cylinder',{name:'Torreta',x:4,y:.7,z:0,w:1.1,h:1.4,d:1.1,solid:true,color:'#759cb1',health:200,maxHealth:200},[{type:'turret',enabled:true,range:14,damage:12,cooldown:1}]);
 else if(name==='barricade')add('cube',{name:'Barricada',x:1,y:1,z:1,w:3,h:2,d:.5,solid:true,anchored:true,color:'#87694b',health:300,maxHealth:300},[{type:'destructible',enabled:true,durability:300,armor:12}]);
 else if(name==='shop')add('cube',{name:'Comerciante',x:0,y:1,z:-3,w:1,h:2,d:1,solid:true,anchored:true,color:'#d5ac59'},[{type:'merchant',enabled:true,slots:6,priceFactor:1}]);
 bridge.changed?.();bridge.refresh?.();bridge.toast?.('✓ Atualização aplicada ao projeto');
}
function init(options){
 bridge=options;const defs=E?.definitions;
 if(defs)Object.assign(defs,{
  npcBrain:{title:'🧠 Cérebro NPC local',desc:'Visão, audição, patrulha, perseguição e ataque',values:{sight:14,hearing:6,speed:2.6,iq:50,submission:50,attack:8,range:1.6},
   fields:[['sight','Visão',0,80],['hearing','Audição',0,80],['speed','Velocidade',.1,30],['iq','QI',0,100],['submission','Submissão',0,100],['attack','Dano',0,1000],['range','Alcance',.2,12]]},
  turret:{title:'🎯 Torreta automática',desc:'Busca inimigos próximos',values:{range:14,damage:12,cooldown:1},fields:[['range','Alcance',1,100],['damage','Dano',1,1000],['cooldown','Intervalo',.1,30]]},
  destructible:{title:'🧱 Estrutura destrutível',desc:'Durabilidade e armadura',values:{durability:250,armor:10},fields:[['durability','Durabilidade',1,100000],['armor','Armadura',0,1000]]},
  merchant:{title:'🛒 Loja NPC',desc:'Itens e estoque do dia',values:{slots:6,priceFactor:1},fields:[['slots','Vagas',1,24],['priceFactor','Preço',.1,10]]},
  attack:{title:'⚔️ Ataque por contato',desc:'Dano em contato',values:{damage:10,cooldown:1},fields:[['damage','Dano',0,1000],['cooldown','Intervalo',.1,30]]}
 });
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-ax17-page],[data-ax17-brush],[data-ax17-action]');if(!b)return;
  if(b.dataset.ax17Page){page=b.dataset.ax17Page;render();}
  else if(b.dataset.ax17Brush){brush=b.dataset.ax17Brush;render();}
  else action(b.dataset.ax17Action);
 });
 document.addEventListener('change',e=>{
  const path=e.target.dataset?.ax17Field;if(!path)return;
  const [section,key]=path.split('.'),a=config();if(!a?.[section]||!Object.hasOwn(a[section],key))return;
  bridge.history?.();a[section][key]=e.target.type==='checkbox'?e.target.checked:e.target.type==='number'?Number(e.target.value):e.target.value;
  if(section==='world'&&(key==='size'||key==='seed'))a.world.heights=A.createTerrain(a.world.size,a.world.seed);
  if(section==='world')a.world.revision++;
  bridge.changed?.();render();
 });
 const box=$('axAdvanced17Panel');if(box){
  box.addEventListener('pointerdown',e=>{
   if(e.target.id!=='ax17Terrain')return;
   e.preventDefault();painting=true;activePointer=e.pointerId;bridge.history?.();e.target.setPointerCapture?.(e.pointerId);paint(e);
  });
  box.addEventListener('pointermove',e=>{if(painting&&e.pointerId===activePointer&&e.target.id==='ax17Terrain'){e.preventDefault();paint(e);}});
  for(const name of ['pointerup','pointercancel'])box.addEventListener(name,e=>{if(e.pointerId===activePointer&&painting){painting=false;activePointer=null;bridge.refresh?.();}});
  box.addEventListener('input',e=>{if(e.target.id==='ax17Radius')radius=Number(e.target.value);if(e.target.id==='ax17Strength')strength=Number(e.target.value);});
 }
 render();
}
global.AurenixAdvancedEditor17={init,render,ensure};
})(window);
