/* Aurenix 0.17 - sistemas locais 2D/3D. Sem serviços ou dependências.
 * Os módulos utilizam apenas dados declarativos e não executam código importado.
 */
(function(global){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const clone=x=>JSON.parse(JSON.stringify(x));
const rarity=['Comum','Incomum','Raro','Épico','Lendário','Mítico','Divino'];
const colors=['#89949d','#51b57f','#4298e5','#a173e7','#e1ab42','#f0688e','#f5df7b'];
const defaults=()=>({
 world:{enabled:false,seed:17,size:25,cell:2,heights:[],density:.08,dayLength:360,time:.25,fog:0,atmosphere:true,revision:0,renderRadius:9,biome:'grass'},
 camera:{mode:'third',yaw:.8,pitch:.55,distance:16,offset:[0,1,0],smooth:.1,zoomMin:3,zoomMax:45,obstacleFade:true},
 controls:{sensitivity:1,deadzone:.18,gamepad:true,keyboard:true,touch:true,bindings:{forward:'w',back:'s',left:'a',right:'d',attack:'f',jump:' '}},
 combat:{enabled:false,playerMaxHealth:100,playerMaxStamina:100,staminaRegen:12,enemyLimit:35,spawnRadius:24,showHitboxes:false},
 economy:{enabled:false,coins:0,marketSeed:31,restockDay:0,licenseDivine:false},
 graphics:{quality:'balanced',maxVisible:220,maxNpcs:35,maxParticles:180,shadows:false,lod:1,fps:true},
 inventory:{slots:24,items:[],equipment:{}},achievements:[],permanent:{unlocks:[],stats:{}},
});
function ensure(project){
 project.advanced??=defaults();
 const d=defaults();for(const [k,v] of Object.entries(d)){
  if(project.advanced[k]==null)project.advanced[k]=v;
  else if(v&&typeof v==='object'&&!Array.isArray(v))for(const [field,def] of Object.entries(v))if(project.advanced[k][field]===undefined)project.advanced[k][field]=clone(def);
 }
 return project.advanced;
}
function seedRandom(seed){let s=(Number(seed)||1)>>>0;return ()=>{s=(s+0x6d2b79f5)|0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
function createTerrain(size=25,seed=17){
 const n=Math.round(clamp(size,9,65));const r=seedRandom(seed),values=new Array(n*n).fill(0);
 const hills=Array.from({length:Math.max(5,Math.floor(n/3))},()=>({x:r()*(n-1),z:r()*(n-1),rad:2+r()*n*.3,height:(r()-.25)*5}));
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){
  let h=0;for(const hill of hills){const d2=((x-hill.x)**2+(z-hill.z)**2)/(hill.rad**2);h+=hill.height*Math.exp(-d2*1.8);}
  values[z*n+x]=Math.round(clamp(h,-5,12)*100)/100;
 }
 return values;
}
function worldInit(world){
 world.size=Math.round(clamp(world.size||25,9,65));world.cell=clamp(world.cell||2,.5,10);
 if(!Array.isArray(world.heights)||world.heights.length!==world.size**2)world.heights=createTerrain(world.size,world.seed||17);
 return world;
}
function index(world,x,z){return z*world.size+x;}
function elevation(world,x,z){
 worldInit(world);
 const n=world.size,c=world.cell,fx=x/c+(n-1)/2,fz=z/c+(n-1)/2;
 if(fx<0||fz<0||fx>n-1||fz>n-1)return null;
 const x0=Math.floor(fx),z0=Math.floor(fz),x1=Math.min(n-1,x0+1),z1=Math.min(n-1,z0+1),u=fx-x0,v=fz-z0;
 const h=(i,j)=>Number(world.heights[index(world,i,j)])||0;
 return (h(x0,z0)*(1-u)+h(x1,z0)*u)*(1-v)+(h(x0,z1)*(1-u)+h(x1,z1)*u)*v;
}
function sculpt(world,x,z,mode='raise',radius=2,strength=.45){
 worldInit(world);radius=clamp(radius,.3,30);strength=clamp(strength,.05,10);
 const cx=x/world.cell+(world.size-1)/2,cz=z/world.cell+(world.size-1)/2;
 const original=world.heights.slice(),n=world.size;
 let changed=0;
 for(let j=Math.max(0,Math.floor(cz-radius));j<=Math.min(n-1,Math.ceil(cz+radius));j++)
 for(let i=Math.max(0,Math.floor(cx-radius));i<=Math.min(n-1,Math.ceil(cx+radius));i++){
  const dist=Math.hypot(i-cx,j-cz);if(dist>radius)continue;
  const weight=(1-dist/radius)*strength,idx=index(world,i,j),cur=original[idx];
  let value=cur;
  if(mode==='raise')value=cur+weight;
  else if(mode==='lower')value=cur-weight;
  else if(mode==='flatten')value=cur+(0-cur)*Math.min(1,weight);
  else if(mode==='smooth'){
   let sum=0,count=0;for(let z2=Math.max(0,j-1);z2<=Math.min(n-1,j+1);z2++)for(let x2=Math.max(0,i-1);x2<=Math.min(n-1,i+1);x2++){sum+=original[index(world,x2,z2)];count++;}
   value=cur+(sum/count-cur)*Math.min(1,weight);
  }else throw Error('Ferramenta de terreno inválida: '+mode);
  world.heights[idx]=Math.round(clamp(value,-15,25)*100)/100;changed++;
 }
 if(changed)world.revision=(Number(world.revision)||0)+1;
 return changed;
}
function regionKey(x,z,cell=16){return Math.floor(x/cell)+':'+Math.floor(z/cell);}
function terrainObjects(scene,camera){
 const world=scene.advanced?.world||scene.world;if(!world?.enabled||scene.mode!=='3d')return [];
 worldInit(world);
 const n=world.size,r=Math.round(clamp(world.renderRadius||9,2,20)),cell=world.cell,origin=camera?.target||[0,0,0];
 const px=Math.round((origin[0]/cell)+(n-1)/2),pz=Math.round((origin[2]/cell)+(n-1)/2);
 const maxVisible=Math.round(clamp(scene.advanced?.graphics?.maxVisible||220,40,700)),objects=[];
 const center=Math.max(0,Math.floor((n-1)/2)); // cache only outside of the engine's mutable scene
 const fromX=Math.max(0,px-r),toX=Math.min(n-1,px+r),fromZ=Math.max(0,pz-r),toZ=Math.min(n-1,pz+r);
 const stride=(toX-fromX+1)*(toZ-fromZ+1)>maxVisible?2:1;
 const palette={grass:'#41775d',desert:'#bc9f68',snow:'#b5c8d6',dark:'#51607a',volcanic:'#554b54'};
 const base=palette[world.biome]||palette.grass;
 for(let z=fromZ;z<=toZ;z+=stride)for(let x=fromX;x<=toX;x+=stride){
  if(objects.length>=maxVisible)break;
  const h=Number(world.heights[z*n+x])||0,width=cell*stride;
  objects.push({id:'axterrain:'+x+':'+z,type:'cube',name:'Terreno',x:(x-center)*cell+width*.5-cell*.5,
   z:(z-center)*cell+width*.5-cell*.5,y:(h-1)/2,w:width+.018,h:Math.max(.05,h+1),d:width+.018,
   solid:false,anchored:true,visible:true,color:base});
 }
 return objects;
}
function scatter(scene,kind='forest',count=28,seed){
 const world=scene.advanced?.world||scene.world;if(!world)throw Error('Crie um terreno antes');
 worldInit(world);const rnd=seedRandom(seed??(world.seed||17)),made=[];
 const extent=(world.size-2)*world.cell/2;
 const available={forest:['tree','bush'],rocks:['rock'],clearing:['tree','rock']};
 const types=available[kind]||available.forest;
 for(let i=0;i<Math.min(300,Math.max(1,count));i++){
  const x=(rnd()*2-1)*extent,z=(rnd()*2-1)*extent,ground=elevation(world,x,z);
  if(ground==null)continue;
  if(kind==='clearing'&&Math.hypot(x,z)<extent*.36)continue;
  const type=types[Math.floor(rnd()*types.length)],baseId='env'+Date.now().toString(36)+i;
  if(type==='tree'){
   const height=2.5+rnd()*3;
   made.push({id:baseId+'a',type:'cylinder',name:'Tronco',x,y:ground+height*.42,z,w:.45,h:height*.85,d:.45,solid:true,anchored:true,color:'#6d4f37',tags:'natureza'});
   made.push({id:baseId+'b',type:'cone',name:'Copa',x,y:ground+height*.85,z,w:2+rnd(),h:2.5+rnd(),d:2+rnd(),solid:false,anchored:true,color:'#317751',tags:'natureza'});
  }else if(type==='bush'){
   made.push({id:baseId,type:'sphere',name:'Arbusto',x,y:ground+.45,z,w:1.3,h:.8,d:1.3,solid:false,anchored:true,color:'#33845d',tags:'natureza'});
  }else made.push({id:baseId,type:'sphere',name:'Pedra',x,y:ground+.45,z,w:.9+rnd(),h:.8,d:1+rnd(),solid:true,anchored:true,color:'#849094',tags:'natureza'});
 }
 return made;
}
function makeItem(type='sword',rarity=1,power=1){
 const r=Math.round(clamp(rarity,1,7)),level=Math.round(clamp(power,1,7));
 const base={sword:16,bow:12,staff:14,armor:8,turret:18,trap:9}[type]||10;
 const value=Math.round(base*(1+r*.7)*(1+level*.9));
 return {id:'item'+Math.random().toString(36).slice(2,10),type,rarity:r,power:level,name:rarityName(r)+' • '+type.toUpperCase()+' '+level,
  price:value*8,damage:value,levelRequired:Math.max(1,(level-1)*7),license:r===7?'divine':null};
}
function rarityName(n){return rarity[Math.round(clamp(n,1,7))-1];}
function restock(economy,day=0,slots=6){
 const rnd=seedRandom((Number(economy.marketSeed)||31)+Math.floor(day)*71);
 const types=['sword','bow','staff','armor','turret','trap'],list=[];
 for(let i=0;i<Math.max(1,Math.min(24,slots));i++){
  const r=1+Math.floor(Math.pow(rnd(),2.2)*7),power=1+Math.floor(Math.pow(rnd(),1.6)*7),type=types[Math.floor(rnd()*types.length)];
  const item=makeItem(type,r,power);item.id='stock:'+day+':'+i;list.push(item);
 }
 return list;
}
function buy(inventory,economy,item,unlocks=[]){
 if(item.license==='divine'&&!unlocks.includes('divine')&&!economy.licenseDivine)return {ok:false,reason:'Requer licença Divina por conquista'};
 if((inventory.items?.length||0)>=clamp(inventory.slots||24,1,120))return {ok:false,reason:'Inventário cheio'};
 if((economy.coins||0)<item.price)return {ok:false,reason:'Moedas insuficientes'};
 economy.coins-=item.price;(inventory.items??=[]).push(clone(item));return {ok:true,coins:economy.coins};
}
function damage(target,amount,kind='physical'){
 const armor=clamp(target.armor||0,0,1000),resist=clamp(target.resistances?.[kind]||0,0,.9);
 const dealt=Math.max(0,Math.round((Number(amount)||0)*100/(100+armor)*(1-resist)));
 target.health=Math.max(0,(Number(target.health??target.maxHealth??100))-dealt);
 return {amount:dealt,dead:target.health<=0,health:target.health};
}
function status(entity,type,duration=3,potency=1){
 entity.statuses??=[];
 const existing=entity.statuses.find(s=>s.type===type);
 if(existing){existing.duration=Math.max(existing.duration,duration);existing.potency=Math.max(existing.potency,potency);}
 else entity.statuses.push({type,duration,potency});return entity.statuses;
}
function tickStatus(entity,dt){
 const effects=[];
 for(const s of entity.statuses||[]){if(['burn','poison','bleed'].includes(s.type))effects.push(damage(entity,s.potency*dt,s.type));s.duration-=dt;}
 entity.statuses=(entity.statuses||[]).filter(s=>s.duration>0);return effects;
}
function detect(npc,player,obstacles=[]){
 if(!player)return false;
 const deltaX=(player.x||0)-(npc.x||0),deltaZ=(player.z??player.y??0)-(npc.z??npc.y??0);
 const range=clamp(npc.sight||14,0,100),hearing=clamp(npc.hearing||6,0,100),dist=Math.hypot(deltaX,deltaZ);
 if(dist<=hearing)return true;if(dist>range)return false;
 for(const o of obstacles)if(o.solid&&o!==npc){
  const vx=(o.x||0)-(npc.x||0),vz=(o.z||0)-(npc.z||0),t=clamp((vx*deltaX+vz*deltaZ)/Math.max(.001,dist*dist),0,1);
  if(Math.hypot(vx-t*deltaX,vz-t*deltaZ)<Math.max(o.w||1,o.d||1)*.4)return false;
 }
 return true;
}
function npcTick(npc,player,dt,obstacles=[]){
 const state=npc.behavior??={state:'idle',timer:0,origin:[npc.x||0,npc.z??npc.y??0],order:'',iq:50,submission:50};
 npc.behavior=state;state.timer=(state.timer||0)+dt;
 const detected=detect(npc,player,obstacles),maxLife=Math.max(1,npc.maxHealth||100);
 let goal=null,attack=false;
 if((npc.health||maxLife)<maxLife*.2&&state.submission<45){state.state='flee';goal={x:2*(npc.x||0)-(player?.x||0),z:2*(npc.z||0)-(player?.z??player?.y??0)};}
 else if(detected){state.state='chase';goal={x:player.x||0,z:player.z??player.y??0};}
 else if(state.order==='hold'){state.state='guard';}
 else {state.state='patrol';const rad=3+clamp(state.iq||50,0,100)/20;goal={x:state.origin[0]+Math.sin(state.timer*.5)*rad,z:state.origin[1]+Math.cos(state.timer*.5)*rad};}
 const nx=Number(npc.x)||0,nz=Number(npc.z??npc.y)||0,speed=clamp(npc.speed||2.3,.2,30);
 if(goal){const dx=goal.x-nx,dz=goal.z-nz,dist=Math.hypot(dx,dz);
  if(detected&&dist<clamp(npc.attackRange||1.6,.2,12)){state.state='attack';attack=true;}
  else if(dist>.2){let mx=dx/dist,mz=dz/dist;
   for(const o of obstacles){if(!o.solid||o===npc)continue;const ox=nx-(o.x||0),oz=nz-(o.z||0),d=Math.hypot(ox,oz);
    if(d<Math.max(o.w||1,o.d||1)*.5+1.2&&d>.01){mx+=ox/d*.9;mz+=oz/d*.9;}}
   const m=Math.hypot(mx,mz)||1;npc.x=nx+mx/m*speed*dt;
   if(npc.z!==undefined)npc.z=nz+mz/m*speed*dt;else npc.y=nz+mz/m*speed*dt;
  }
 }
 return {state:state.state,attack,detected};
}
function newState(scene){
 const adv=ensure(scene);
 return {permanent:clone(adv.permanent),run:{health:adv.combat.playerMaxHealth,stamina:adv.combat.playerMaxStamina,coins:adv.economy.coins,
  day:1,time:adv.world.time,inventory:clone(adv.inventory),kills:0,buildings:[],achievements:[]},settings:clone(adv.controls)};
}
function gameSaveDB(){
 const open=()=>new Promise((resolve,reject)=>{
  if(!global.indexedDB)return reject(Error('IndexedDB indisponível'));
  const request=global.indexedDB.open('aurenix-game-saves-v1',1);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('saves'))db.createObjectStore('saves',{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
 async function transact(mode,cb){const db=await open();try{
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction('saves',mode),req=cb(tx.objectStore('saves'));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
 }finally{db.close();}}
 return {put:(id,data)=>transact('readwrite',s=>s.put({id,data:clone(data),updated:Date.now()})),
  get:async id=>(await transact('readonly',s=>s.get(id)))?.data||null,
  remove:id=>transact('readwrite',s=>s.delete(id)),
  all:()=>transact('readonly',s=>s.getAll())};
}
function pool(factory,max=200){
 const unused=[],active=new Set();
 return {acquire(){const obj=unused.pop()||factory();active.add(obj);return obj;},release(obj){if(!active.delete(obj))return false;if(unused.length<max)unused.push(obj);return true;},
  clear(){unused.length=0;active.clear();},get size(){return active.size;},get cached(){return unused.length;}};
}
const API={ensure,defaults,createTerrain,worldInit,elevation,sculpt,terrainObjects,scatter,regionKey,rarity,rarityName,colors,
 seedRandom,makeItem,restock,buy,damage,status,tickStatus,detect,npcTick,newState,gameSaveDB,pool};
global.AurenixAdvanced17=API;
})(window);
