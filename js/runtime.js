/* Aurenix Engine — runtime autocontido, sem bibliotecas pagas e sem serviços externos.
 * Os scripts do jogo são de autoria do criador. Execute projetos importados apenas se confiar neles. */
(function(global){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const colorRGBA=(hex,alpha=1)=>{if(!hex)return `rgba(130,160,220,${alpha})`;if(hex.startsWith('#')){let c=hex.slice(1);if(c.length===3)c=c.split('').map(s=>s+s).join('');if(c.length===6){const n=parseInt(c,16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${alpha})`;}}return hex;};
const uid=()=> 'o'+Math.random().toString(36).slice(2,9);
const CHARACTER_TYPE='application/x-aurenix-character+json';
const charCache=new WeakMap();
function characterAsset(asset){
 if(!asset||asset.type!==CHARACTER_TYPE||!global.AurenixCharacters)return null;
 if(charCache.has(asset))return charCache.get(asset);
 try{
  const raw=String(asset.data||'');if(raw.length>650000)throw Error('Modelo acima do limite');
  const json=raw.startsWith('data:')?decodeURIComponent(escape(atob(raw.split(',')[1]||''))):raw;
  const checked=global.AurenixCharacters.validate(JSON.parse(json));
  charCache.set(asset,checked);return checked;
 }catch(e){console.warn('Personagem Aurenix inválido:',e.message);charCache.set(asset,null);return null;}
}
function expandedSceneObjects(scene){
 if(!global.AurenixCharacters||!scene?.assets)return scene.objects||[];
 const assets=new Map(scene.assets.map(a=>[a.id,a])),res=[];
 for(const o of scene.objects||[]){
  if(o.type!=='character3d'){res.push(o);continue;}
  if(o.visible===false)continue;
  const model=characterAsset(assets.get(o.assetId));
  if(model)res.push(...global.AurenixCharacters.expand(model,o,o.rigClip||'',o.rigTime||0));
  else res.push({...o,type:'cube',color:'#ad6c81'});
 }
 return res;
}
const defaults={mode:'2d',genre:'platformer',name:'Meu primeiro jogo',background:'#101c31',gravity:1100,gravity3d:18,grid:32,grid3d:1,objects:[],assets:[],script:'',pixelData:null};
function makeObj(type,props={}){const o={id:uid(),type,name:({rect:'Retângulo',circle:'Círculo',text:'Texto',sprite:'Sprite',player2d:'Jogador',cube:'Cubo',sphere:'Esfera',cylinder:'Cilindro',plane:'Plataforma',player3d:'Jogador 3D',character3d:'Personagem 3D',model3d:'Modelo OBJ',pyramid:'Pirâmide',cone:'Cone',torus:'Toro',capsule:'Cápsula'})[type]||type,x:0,y:0,z:0,w:type==='plane'?6:60,h:type==='plane'?.3:60,d:1,rotation:0,rx:0,ry:0,rz:0,color:'#64cad5',opacity:1,layer:0,visible:true,solid:false,physics:false,anchored:false,editorLocked:false,tags:'',components:[],health:100,maxHealth:100,speed:230,jump:430,text:'Texto',fontSize:22,assetId:'',script:'',...props};return o;}
function makeTemplate(kind='platformer'){
 const base={...JSON.parse(JSON.stringify(defaults)),id:uid(),updated:Date.now()};
 if(kind==='platformer')return {...base,name:'Aventura 2D',objects:[makeObj('rect',{name:'Solo',x:0,y:328,w:1200,h:76,color:'#3a786f',solid:true}),makeObj('rect',{name:'Plataforma 1',x:-170,y:185,w:160,h:22,color:'#6975b2',solid:true}),makeObj('rect',{name:'Plataforma 2',x:115,y:107,w:180,h:22,color:'#6975b2',solid:true}),makeObj('player2d',{name:'Herói',x:-330,y:248,w:35,h:53,color:'#68ebd7',speed:270,jump:515}),makeObj('circle',{name:'Cristal',x:152,y:64,w:24,h:24,color:'#ffcd73',script:'self.rotation += dt * 65;'})]};
 if(kind==='topdown')return {...base,name:'Mundo Pixel',mode:'pixel',genre:'topdown',background:'#12251f',grid:16,objects:[makeObj('rect',{name:'Grama',x:0,y:0,w:1280,h:780,color:'#1b4836',layer:-2}),makeObj('rect',{name:'Lago',x:240,y:-120,w:190,h:140,color:'#245d86',layer:-1,solid:true}),makeObj('rect',{name:'Casa',x:-185,y:-130,w:170,h:130,color:'#806349',solid:true}),makeObj('player2d',{name:'Aventureiro',x:0,y:60,w:28,h:28,color:'#8ae4cf',speed:210}),makeObj('circle',{name:'Árvore',x:220,y:170,w:73,h:73,color:'#31724c',solid:true})]};
 if(kind==='3d')return {...base,name:'Ilhas 3D',mode:'3d',genre:'adventure3d',background:'#0e192d',grid:32,objects:[makeObj('plane',{name:'Ilha central',x:0,y:-.35,z:0,w:16,h:.6,d:16,color:'#397b6d',solid:true}),makeObj('player3d',{name:'Explorador',x:0,y:.8,z:0,w:.8,h:1.6,d:.8,color:'#6edbff',speed:5,jump:7}),makeObj('cube',{name:'Monólito',x:-3,y:1.2,z:-3,w:1.5,h:2.4,d:1.5,color:'#8377d6',solid:true}),makeObj('cube',{name:'Obstáculo',x:3,y:.7,z:-2,w:2,h:1.4,d:2,color:'#cf8671',solid:true}),makeObj('sphere',{name:'Orbe',x:2,y:2,z:3,w:1.25,h:1.25,d:1.25,color:'#ffd379',script:'self.ry += dt * 55;'})]};
 if(kind==='empty3d')return {...base,name:'Cena 3D vazia',mode:'3d',genre:'adventure3d',objects:[makeObj('plane',{name:'Chão',x:0,y:-.25,z:0,w:12,h:.5,d:12,color:'#526b77',solid:true})]};
 if(kind==='empty2d')return {...base,name:'Cena 2D vazia',objects:[]};
 return makeTemplate('platformer');
}
function imgMap(scene){const result={};for(const a of scene.assets||[]){if(a.type.startsWith('image/')){const img=new Image();img.src=a.data;result[a.id]=img;}}return result;}
function shape2d(ctx,o,images){const w=Number(o.w)||32,h=Number(o.h)||32,alpha=Number(o.opacity??1);if(!o.visible||alpha<=0)return;ctx.save();ctx.translate(o.x||0,o.y||0);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.globalAlpha=alpha;const x=-w/2,y=-h/2;ctx.fillStyle=o.color||'#54c2d6';if(o.type==='circle'){ctx.beginPath();ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);ctx.fill();}else if(o.type==='text'){ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${o.fontSize||22}px system-ui,sans-serif`;ctx.fillText(o.text||'Texto',0,0);}else if(o.type==='sprite' && images[o.assetId]?.complete && images[o.assetId].naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(images[o.assetId],x,y,w,h);}else if(o.type==='player2d'){ctx.fillStyle=o.color;ctx.fillRect(x,y,w,h);ctx.fillStyle='#102131';ctx.fillRect(x+w*.21,y+h*.23,w*.19,h*.12);ctx.fillRect(x+w*.62,y+h*.23,w*.18,h*.12);ctx.fillStyle='#ffffff30';ctx.fillRect(x+3,y+3,w*.2,h*.55);}else{ctx.fillRect(x,y,w,h);}ctx.restore();}
function draw2D(canvas,scene,camera={},options={}){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const W=canvas.clientWidth||canvas.width,H=canvas.clientHeight||canvas.height,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(W*dpr)||canvas.height!==Math.round(H*dpr)){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle=scene.background||'#101c31';ctx.fillRect(0,0,W,H);
 const z=camera.zoom||1,cx=camera.x||0,cy=camera.y||0;ctx.save();ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-cx,-cy);
 if(options.grid){const grid=Math.max(8,scene.grid||32);const left=cx-W/(2*z),right=cx+W/(2*z),top=cy-H/(2*z),bottom=cy+H/(2*z);ctx.lineWidth=1/z;ctx.strokeStyle='#adcfeb13';ctx.beginPath();for(let x=Math.floor(left/grid)*grid;x<right;x+=grid){ctx.moveTo(x,top);ctx.lineTo(x,bottom);}for(let y=Math.floor(top/grid)*grid;y<bottom;y+=grid){ctx.moveTo(left,y);ctx.lineTo(right,y);}ctx.stroke();ctx.strokeStyle='#73dfd53d';ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(0,bottom);ctx.moveTo(left,0);ctx.lineTo(right,0);ctx.stroke();}

 const tilemap=scene.tilemap;
 if(tilemap?.cells&&scene.mode!=='3d'){
  const ts=clamp(tilemap.size||32,8,256),left=cx-W/(2*z),top=cy-H/(2*z);
  const minX=Math.floor(left/ts)-1,maxX=Math.ceil((left+W/z)/ts)+1;
  const minY=Math.floor(top/ts)-1,maxY=Math.ceil((top+H/z)/ts)+1;
  ctx.lineWidth=1/z;
  let painted=0;
  for(let ty=minY;ty<=maxY;ty++)for(let tx=minX;tx<=maxX;tx++){
   if(painted>3000)break;
   const cell=tilemap.cells[tx+','+ty];
   if(!cell)continue;painted++;
   const tileImage=(options.images||{})[cell.assetId];
   if(tileImage?.complete&&tileImage.naturalWidth){
    ctx.imageSmoothingEnabled=false;ctx.drawImage(tileImage,tx*ts,ty*ts,ts+.5,ts+.5);
   }else{ctx.fillStyle=cell.color||'#4a947d';ctx.fillRect(tx*ts,ty*ts,ts+.5,ts+.5);}

   if(options.showTileCollision&&cell.solid){
    ctx.strokeStyle='#ffb17a9c';ctx.strokeRect(tx*ts+.5/z,ty*ts+.5/z,ts-1/z,ts-1/z);
   }
  }
 }
 const images=options.images||{};const objects=(scene.objects||[]).slice().sort((a,b)=>(a.layer||0)-(b.layer||0));for(const o of objects){shape2d(ctx,o,images);if(options.selectedId===o.id){ctx.save();ctx.translate(o.x||0,o.y||0);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.strokeStyle='#6af8e2';ctx.setLineDash([6/z,4/z]);ctx.lineWidth=2/z;ctx.strokeRect(-(o.w||32)/2-3/z,-(o.h||32)/2-3/z,(o.w||32)+6/z,(o.h||32)+6/z);ctx.restore();}}
 ctx.restore();return {w:W,h:H};
}
// 3D nativo com WebGL 1, sem Three.js ou API externa.
function matIdentity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
function matMul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let n=0;for(let k=0;k<4;k++)n+=a[k*4+r]*b[c*4+k];o[c*4+r]=n;}return o;}
function matMove(x,y,z){const m=matIdentity();m[12]=x;m[13]=y;m[14]=z;return m;}
function matScale(x,y,z){const m=matIdentity();m[0]=x;m[5]=y;m[10]=z;return m;}
function matRotX(t){const m=matIdentity(),c=Math.cos(t),s=Math.sin(t);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
function matRotY(t){const m=matIdentity(),c=Math.cos(t),s=Math.sin(t);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
function matRotZ(t){const m=matIdentity(),c=Math.cos(t),s=Math.sin(t);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;}
function perspective(fov,aspect,n,f){const s=1/Math.tan(fov/2),m=new Float32Array(16);m[0]=s/aspect;m[5]=s;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m;}
const vsub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const vdot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const vcross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const vnorm=v=>{const s=Math.hypot(...v)||1;return v.map(x=>x/s);};
function lookAt(eye,target){const z=vnorm(vsub(eye,target)),x=vnorm(vcross([0,1,0],z)),y=vcross(z,x);const m=matIdentity();m[0]=x[0];m[1]=y[0];m[2]=z[0];m[4]=x[1];m[5]=y[1];m[6]=z[1];m[8]=x[2];m[9]=y[2];m[10]=z[2];m[12]=-vdot(x,eye);m[13]=-vdot(y,eye);m[14]=-vdot(z,eye);return m;}
function orbitPosition(cam){const yaw=cam.yaw??.7,pitch=clamp(cam.pitch??.55,-1.4,1.4),d=cam.distance||16,target=cam.target||[0,0,0];return [target[0]+Math.sin(yaw)*Math.cos(pitch)*d,target[1]+Math.sin(pitch)*d,target[2]+Math.cos(yaw)*Math.cos(pitch)*d];}
function rgbaNorm(hex){const s=(hex||'#70c4dc').replace('#','');const n=parseInt(s.length===3?s.split('').map(c=>c+c).join(''):s,16);return isNaN(n)?[.5,.7,.8]:[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
function createGeometry(type){const p=[],norm=[];function tri(a,b,c,n){for(const v of [a,b,c]){p.push(...v);norm.push(...n);}}if(type==='cube'||type==='plane'||type==='player3d'){
 const q=[[[0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],[[0,0,-1],[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]],[[0,1,0],[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]],[[0,-1,0],[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]],[[1,0,0],[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]],[[-1,0,0],[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]]];
 for(const [n,v] of q){tri(v[0],v[1],v[2],n);tri(v[0],v[2],v[3],n);}}
 else if(type==='sphere'){const lat=12,lon=18;function sp(a,b){return [Math.sin(a)*Math.cos(b)*.5,Math.cos(a)*.5,Math.sin(a)*Math.sin(b)*.5];}for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){const a=i*Math.PI/lat,b=j*Math.PI*2/lon,a2=(i+1)*Math.PI/lat,b2=(j+1)*Math.PI*2/lon;const v0=sp(a,b),v1=sp(a2,b),v2=sp(a2,b2),v3=sp(a,b2);tri(v0,v1,v2,vnorm(v0));tri(v0,v2,v3,vnorm(v2));}for(let k=0;k<norm.length;k+=3){const n=vnorm([p[k],p[k+1],p[k+2]]);norm[k]=n[0];norm[k+1]=n[1];norm[k+2]=n[2];}}
 else if(type==='pyramid'){
  const a=[-.5,-.5,-.5],b=[.5,-.5,-.5],c=[.5,-.5,.5],d=[-.5,-.5,.5],peak=[0,.5,0];
  const face=(x,y,z)=>tri(x,y,z,vnorm(vcross(vsub(y,x),vsub(z,x))));
  face(a,b,peak);face(b,c,peak);face(c,d,peak);face(d,a,peak);tri(a,d,c,[0,-1,0]);tri(a,c,b,[0,-1,0]);
 }
 else if(type==='cone'){
  const top=[0,.5,0];
  for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
   const x=[Math.cos(a)*.5,-.5,Math.sin(a)*.5],y=[Math.cos(b)*.5,-.5,Math.sin(b)*.5];
   const normal=vnorm(vcross(vsub(y,x),vsub(top,x)));
   tri(x,y,top,normal);tri([0,-.5,0],y,x,[0,-1,0]);
  }
 }
 else if(type==='torus'){
  const major=32,minor=12,R=.34,r=.16;
  const pnt=(a,b)=>[(R+r*Math.cos(b))*Math.cos(a),r*Math.sin(b),(R+r*Math.cos(b))*Math.sin(a)];
  const norm3=(a,b)=>vnorm([Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)]);
  for(let i=0;i<major;i++)for(let j=0;j<minor;j++){
   const a=i*2*Math.PI/major,aa=(i+1)*2*Math.PI/major,b=j*2*Math.PI/minor,bb=(j+1)*2*Math.PI/minor;
   const p0=pnt(a,b),p1=pnt(aa,b),p2=pnt(aa,bb),p3=pnt(a,bb),n=norm3(a,b);
   tri(p0,p1,p2,n);tri(p0,p2,p3,n);
  }
 }
 else if(type==='capsule'){
  const lat=20,lon=24;
  const pt=(a,b)=>{const y=Math.cos(a)*.35,shift=y>0?.15:-.15;return [Math.sin(a)*Math.cos(b)*.34,y+shift,Math.sin(a)*Math.sin(b)*.34];};
  for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){
   const a=i*Math.PI/lat,aa=(i+1)*Math.PI/lat,b=j*2*Math.PI/lon,bb=(j+1)*2*Math.PI/lon;
   const x=pt(a,b),y=pt(aa,b),z=pt(aa,bb),w=pt(a,bb);
   tri(x,y,z,vnorm([x[0],x[1]-Math.sign(x[1])*.15,x[2]]));
   tri(x,z,w,vnorm([w[0],w[1]-Math.sign(w[1])*.15,w[2]]));
  }
 }
 else if(type==='cylinder'){for(let i=0;i<20;i++){const a=i*Math.PI/10,b=(i+1)*Math.PI/10,c=[Math.cos(a)*.5,0,Math.sin(a)*.5],d=[Math.cos(b)*.5,0,Math.sin(b)*.5],n=vnorm([c[0]+d[0],0,c[2]+d[2]]);tri([c[0],-.5,c[2]],[d[0],-.5,d[2]],[d[0],.5,d[2]],n);tri([c[0],-.5,c[2]],[d[0],.5,d[2]],[c[0],.5,c[2]],n);tri([0,.5,0],[c[0],.5,c[2]],[d[0],.5,d[2]],[0,1,0]);tri([0,-.5,0],[d[0],-.5,d[2]],[c[0],-.5,c[2]],[0,-1,0]);}}
 return {p:new Float32Array(p),n:new Float32Array(norm)};}
function parseOBJ(text,limit=12000){
 const vertices=[],coords=[],normals=[];const rows=String(text||'').split(/\r?\n/).slice(0,160000);let faces=0;
 for(const line of rows){
  const cols=line.trim().split(/\s+/);const op=cols[0];
  if(op==='v'&&cols.length>=4&&vertices.length<20000){
   const xyz=cols.slice(1,4).map(Number);if(xyz.every(Number.isFinite))vertices.push(xyz);
  }else if(op==='f'&&cols.length>=4&&faces<limit){
   const indices=cols.slice(1).map(x=>{
    const token=parseInt(x.split('/')[0],10);
    return token>0?token-1:vertices.length+token;
   });
   if(indices.length>32||indices.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length))continue;
   for(let j=1;j<indices.length-1&&faces<limit;j++){
    const a=vertices[indices[0]],b=vertices[indices[j]],c=vertices[indices[j+1]];
    const ab=vsub(b,a),ac=vsub(c,a),normal=vnorm(vcross(ab,ac));
    for(const v of [a,b,c]){coords.push(...v);normals.push(...normal);}
    faces++;
   }
  }
 }
 if(!faces)throw Error('OBJ sem triângulos válidos');
 let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<coords.length;i+=3)for(let j=0;j<3;j++){min[j]=Math.min(min[j],coords[i+j]);max[j]=Math.max(max[j],coords[i+j]);}
 const center=min.map((x,i)=>(x+max[i])/2),scale=1/Math.max(.000001,...min.map((x,i)=>max[i]-x));
 for(let i=0;i<coords.length;i+=3)for(let j=0;j<3;j++)coords[i+j]=(coords[i+j]-center[j])*scale;
 return {p:new Float32Array(coords),n:new Float32Array(normals),triangles:faces};
}
function objFromAsset(asset){
 if(!asset||!/\.obj$/i.test(asset.name||''))return null;
 if(asset.data?.length>2900000)return null;
 try{const raw=asset.data?.startsWith('data:')?atob(asset.data.split(',')[1]||''):asset.data;
  return parseOBJ(raw);
 }catch(e){console.warn('OBJ inválido',e.message);return null;}
}
class Renderer3D{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:false})||canvas.getContext('experimental-webgl');if(!this.gl){this.fallback=canvas.getContext('2d');this.cpuMeshes={};this.customMeshes=new Map();for(const t of ['cube','plane','player3d','sphere','cylinder','pyramid','cone','torus','capsule'])this.cpuMeshes[t]=createGeometry(t);return;}const gl=this.gl;
 const vs=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMVP;uniform mat4 uModel;varying vec3 vNormal;void main(){gl_Position=uMVP*vec4(aPosition,1.0);vNormal=mat3(uModel)*aNormal;}`;
 const fs=`precision mediump float;uniform vec3 uColor;uniform float uUnlit;varying vec3 vNormal;void main(){float light=0.42+max(dot(normalize(vNormal),normalize(vec3(-0.55,0.85,0.45))),0.0)*0.58;gl_FragColor=vec4(uColor*mix(light,1.0,uUnlit),1.0);}`;
 const makeShader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};const prog=gl.createProgram();gl.attachShader(prog,makeShader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,makeShader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error('Falha ao conectar shaders');this.program=prog;this.loc={p:gl.getAttribLocation(prog,'aPosition'),n:gl.getAttribLocation(prog,'aNormal'),mvp:gl.getUniformLocation(prog,'uMVP'),model:gl.getUniformLocation(prog,'uModel'),color:gl.getUniformLocation(prog,'uColor'),unlit:gl.getUniformLocation(prog,'uUnlit')};this.meshes={};this.customMeshes=new Map();for(const t of ['cube','plane','player3d','sphere','cylinder','pyramid','cone','torus','capsule']){const g=createGeometry(t),vb=gl.createBuffer(),nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,g.p,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,g.n,gl.STATIC_DRAW);this.meshes[t]={vb,nb,count:g.p.length/3};}gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);}
 render(scene,camera={},opts={}){const gl=this.gl;if(!gl){this.renderFallback(scene,camera,opts);return;}const canvas=this.canvas,W=canvas.clientWidth||canvas.width||1,H=canvas.clientHeight||canvas.height||1,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(W*dpr)||canvas.height!==Math.round(H*dpr)){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);}gl.viewport(0,0,canvas.width,canvas.height);const clr=rgbaNorm(scene.background||'#101c31');gl.clearColor(...clr,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.enableVertexAttribArray(this.loc.p);gl.enableVertexAttribArray(this.loc.n);const eye=orbitPosition(camera);const view=lookAt(eye,camera.target||[0,0,0]),proj=perspective(Math.PI/3,W/H,.1,500),vp=matMul(proj,view);this.vp=vp;this.canvasW=W;this.canvasH=H;
 const draw=(mesh,model,color,unlit=0,mode=gl.TRIANGLES)=>{gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vb);gl.vertexAttribPointer(this.loc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.vertexAttribPointer(this.loc.n,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(this.loc.mvp,false,matMul(vp,model));gl.uniformMatrix4fv(this.loc.model,false,model);gl.uniform3fv(this.loc.color,color);gl.uniform1f(this.loc.unlit,unlit);gl.drawArrays(mode,0,mesh.count);};
 if(opts.grid){if(!this.gridBuffer){const a=[],b=[];for(let i=-50;i<=50;i++){a.push(-50,0,i,50,0,i,i,0,-50,i,0,50);for(let k=0;k<4;k++)b.push(0,1,0);}const vb=gl.createBuffer(),nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(b),gl.STATIC_DRAW);this.gridBuffer={vb,nb,count:a.length/3};}draw(this.gridBuffer,matIdentity(),[.19,.27,.33],1,gl.LINES);}
 for(const o of expandedSceneObjects(scene).slice().sort((a,b)=>(a.y||0)-(b.y||0))){if(!o.visible)continue;let mesh=this.meshes[o.type]||this.meshes.cube;
 if(o.type==='model3d'&&o.assetId){
  if(!this.customMeshes.has(o.assetId)){
   const asset=(scene.assets||[]).find(a=>a.id===o.assetId),geo=objFromAsset(asset);
   if(geo){
    const vb=gl.createBuffer(),nb=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,geo.p,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,geo.n,gl.STATIC_DRAW);
    this.customMeshes.set(o.assetId,{vb,nb,count:geo.p.length/3});
   }else this.customMeshes.set(o.assetId,null);
  }
  mesh=this.customMeshes.get(o.assetId)||this.meshes.cube;
 }
 let model=o._modelMatrix?new Float32Array(o._modelMatrix):matMove(o.x||0,o.y||0,o.z||0);if(!o._modelMatrix){model=matMul(model,matRotY((o.ry||0)*Math.PI/180));model=matMul(model,matRotX((o.rx||0)*Math.PI/180));model=matMul(model,matRotZ((o.rz||o.rotation||0)*Math.PI/180));model=matMul(model,matScale(o.w||1,o.h||1,o.d||1));}draw(mesh,model,rgbaNorm(o.color));if(o.id===opts.selectedId||o._parentId===opts.selectedId){const border=matMul(model,matScale(1.055,1.055,1.055));gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthFunc(gl.ALWAYS);draw(mesh,border,[.24,1,.88],1,gl.LINE_LOOP);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);}}
 this.lastCamera=camera;}
 renderFallback(scene,camera={},opts={}){
 const ctx=this.fallback;if(!ctx)return;
 const canvas=this.canvas,W=canvas.clientWidth||canvas.width||1,H=canvas.clientHeight||canvas.height||1,dpr=Math.min(devicePixelRatio||1,2);
 if(canvas.width!==Math.round(W*dpr)||canvas.height!==Math.round(H*dpr)){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=scene.background||'#101c31';ctx.fillRect(0,0,W,H);
 const eye=orbitPosition(camera),view=lookAt(eye,camera.target||[0,0,0]),proj=perspective(Math.PI/3,W/H,.1,500),vp=matMul(proj,view);
 this.vp=vp;this.canvasW=W;this.canvasH=H;
 const projectPoint=(x,y,z)=>{const w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];if(w<=0.08)return null;return {x:(1+(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w)*W/2,y:(1-(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w)*H/2,w};};
 if(opts.grid){ctx.lineWidth=1;ctx.strokeStyle='#ffffff18';ctx.beginPath();for(let i=-20;i<=20;i++){const a=projectPoint(-20,0,i),b=projectPoint(20,0,i),c=projectPoint(i,0,-20),d=projectPoint(i,0,20);for(const pair of [[a,b],[c,d]])if(pair[0]&&pair[1]){ctx.moveTo(pair[0].x,pair[0].y);ctx.lineTo(pair[1].x,pair[1].y);}}ctx.stroke();}
 const faces=[];
 for(const o of expandedSceneObjects(scene)){if(!o.visible)continue;let mesh=this.cpuMeshes[o.type]||this.cpuMeshes.cube;
 if(o.type==='model3d'&&o.assetId){
  if(!this.customMeshes.has(o.assetId)){
   this.customMeshes.set(o.assetId,objFromAsset((scene.assets||[]).find(a=>a.id===o.assetId)));
  }
  mesh=this.customMeshes.get(o.assetId)||this.cpuMeshes.cube;
 }
 let model=o._modelMatrix?new Float32Array(o._modelMatrix):matMove(o.x||0,o.y||0,o.z||0);if(!o._modelMatrix){model=matMul(model,matRotY((o.ry||0)*Math.PI/180));model=matMul(model,matRotX((o.rx||0)*Math.PI/180));model=matMul(model,matRotZ((o.rz||o.rotation||0)*Math.PI/180));model=matMul(model,matScale(o.w||1,o.h||1,o.d||1));}
 const base=rgbaNorm(o.color);
 for(let i=0;i<mesh.p.length;i+=9){const points=[];
 for(let j=0;j<9;j+=3){const x=mesh.p[i+j],y=mesh.p[i+j+1],z=mesh.p[i+j+2],wx=model[0]*x+model[4]*y+model[8]*z+model[12],wy=model[1]*x+model[5]*y+model[9]*z+model[13],wz=model[2]*x+model[6]*y+model[10]*z+model[14],pp=projectPoint(wx,wy,wz);if(!pp){points.length=0;break;}points.push(pp);}
 if(points.length!==3)continue;
 const nx=mesh.n[i],ny=mesh.n[i+1],nz=mesh.n[i+2],N=vnorm([model[0]*nx+model[4]*ny+model[8]*nz,model[1]*nx+model[5]*ny+model[9]*nz,model[2]*nx+model[6]*ny+model[10]*nz]);
 const brightness=.45+Math.max(0,vdot(N,vnorm([-.55,.85,.45])))*.55;
 const r=Math.round(base[0]*brightness*255),g=Math.round(base[1]*brightness*255),b=Math.round(base[2]*brightness*255);
 faces.push({points,depth:points.reduce((a,p)=>a+p.w,0)/3,color:`rgb(${r},${g},${b})`,selected:o.id===opts.selectedId||o._parentId===opts.selectedId});
 }}
 faces.sort((a,b)=>b.depth-a.depth);
 for(const f of faces){ctx.beginPath();ctx.moveTo(f.points[0].x,f.points[0].y);ctx.lineTo(f.points[1].x,f.points[1].y);ctx.lineTo(f.points[2].x,f.points[2].y);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();if(f.selected){ctx.strokeStyle='#75fbdd';ctx.lineWidth=.6;ctx.stroke();}}
 }
 project(point){if(!this.vp)return null;const m=this.vp,[x,y,z]=point;const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return null;const nx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,ny=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;return {x:(nx+1)*this.canvasW*.5,y:(1-ny)*this.canvasH*.5,depth:w};}
}
function box2d(o){return {left:o.x-o.w/2,right:o.x+o.w/2,top:o.y-o.h/2,bottom:o.y+o.h/2};}
function intersect2d(a,b){const A=box2d(a),B=box2d(b);return A.left<B.right&&A.right>B.left&&A.top<B.bottom&&A.bottom>B.top;}
function gameHTML(scene,{baseHref='',inlineRuntime=''}={}){const data=JSON.stringify(scene).replace(/</g,'\\u003c');return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="theme-color" content="#101928">${baseHref?`<base href="${baseHref.replaceAll('"','&quot;')}">`:''}<title>${String(scene.name||'Meu jogo').replace(/[<>&"]/g,'')}</title><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101928;touch-action:none;font-family:system-ui,sans-serif}#game{width:100vw;height:100dvh;display:block;touch-action:none}.hud{position:fixed;inset:0;pointer-events:none;user-select:none}.joystick{position:absolute;left:24px;bottom:calc(32px + env(safe-area-inset-bottom,0px));width:122px;height:122px;border:2px solid #b9dded55;border-radius:50%;background:#ffffff17;pointer-events:auto;touch-action:none}.stick{position:absolute;left:35px;top:35px;width:48px;height:48px;border-radius:50%;background:#91f1ec88;border:2px solid #d5fffa88}.action{pointer-events:auto;position:absolute;right:25px;bottom:calc(54px + env(safe-area-inset-bottom,0px));width:79px;height:79px;border-radius:50%;background:#3e7d91a0;color:#f0ffff;border:2px solid #9be6ff70;font-size:21px;font-weight:800;touch-action:none}.action2{right:115px;bottom:calc(31px + env(safe-area-inset-bottom,0px));width:49px;height:49px;background:#60639a99;font-size:12px}.gameerror{position:absolute;top:10px;left:10px;right:10px;background:#742b3fe8;color:white;font-size:12px;white-space:pre-wrap;pointer-events:none;padding:8px;border-radius:7px}.touchhidden{display:none}@media(hover:hover) and (pointer:fine){.joystick,.action{display:none}}</style></head><body><canvas id="game"></canvas><div id="hud" class="hud"><div id="joystick" class="joystick"><div id="stick" class="stick"></div></div><button id="jumpBtn" class="action">A</button><button id="actionBtn" class="action action2">B</button></div><script>window.__AURENIX_GAME__=${data};</script>${inlineRuntime?`<script>${inlineRuntime.replace(/<\/script/gi,'<\\/script')}</script>`:'<script src="js/runtime.js"></script>'}</body></html>`;}
function startGame(scene){const canvas=document.getElementById('game');if(!canvas)return;const is3d=scene.mode==='3d',images=imgMap(scene),renderer=is3d?new Renderer3D(canvas):null,keys=new Set(),controls={x:0,y:0,jump:false,action:false},camera3d={target:[0,0,0],yaw:.8,pitch:.55,distance:16},camera2d={x:0,y:0,zoom:1};let time=performance.now(),dead=false,scriptErrors=new Set();
 const objects=scene.objects||[];let player=objects.find(o=>o.type===(is3d?'player3d':'player2d'));
 let pendingScene='',fpsTime=performance.now(),fpsFrames=0;
 const settings={hud:true,showHealth:true,showScore:true,joystickSize:122,actionSize:78,controlOpacity:.8,cameraZoom:1,cameraSmoothing:.09,maxParticles:220,pixelPerfect:scene.mode==='pixel',showGameTips:true,...(scene.gameSettings||{})};
 let score=0,health=Number(player?.health??100),maxHealth=Math.max(1,Number(player?.maxHealth??100)),checkpoint=null,messageTimeout=0,cameraShake=0;
 let particles=[],particleAccumulator=new Map(),componentStates=new Map(),hudBox=null,gameMessage=null,hudScore=null,hudHealth=null;
 const isColliding=(a,b)=>a&&b&&(is3d?Math.abs((a.x||0)-(b.x||0))<((a.w||1)+(b.w||1))/2&&Math.abs((a.y||0)-(b.y||0))<((a.h||1)+(b.h||1))/2&&Math.abs((a.z||0)-(b.z||0))<((a.d||1)+(b.d||1))/2:intersect2d(a,b));
 function checkpointAt(){if(player)checkpoint={sceneId:scene.activeSceneId,x:player.x||0,y:player.y||0,z:player.z||0};}
 function setHealth(value){health=clamp(value,0,maxHealth);if(health<=0&&player){health=maxHealth;const fallback=checkpoint?.sceneId===scene.activeSceneId?checkpoint:null;player.x=fallback?.x||0;player.y=fallback?.y??(is3d?3:0);player.z=fallback?.z||0;velocities.delete(player.id);showMessage('Você renasceu!',2);}updateHud();return health;}
 function showMessage(text,duration=2.5){
  if(!gameMessage)return;
  gameMessage.textContent=String(text||'').slice(0,160);
  gameMessage.style.display='block';
  clearTimeout(messageTimeout);
  messageTimeout=setTimeout(()=>{gameMessage.style.display='none';},Math.max(.5,Math.min(15,Number(duration)||2.5))*1000);
 }
 function addScore(points=1){score+=Math.round(Number(points)||0);updateHud();return score;}
 function updateHud(){
  if(hudScore)hudScore.textContent='✦ '+score;
  if(hudHealth){const pct=Math.round(100*health/maxHealth);hudHealth.style.width=pct+'%';hudHealth.title=health+' / '+maxHealth;}
 }
 function spawnParticles(x,y,count=8,color='#73e2ce',speed=80,life=1,size=5){
  const max=Math.max(10,Math.min(800,Number(settings.maxParticles)||220));
  for(let i=0;i<Math.min(50,count);i++)if(particles.length<max){
   const angle=Math.random()*Math.PI*2,power=speed*(.25+.75*Math.random()),dur=Math.max(.05,life);
   particles.push({x,y,vx:Math.cos(angle)*power,vy:Math.sin(angle)*power,age:0,life:dur,color,size:Math.max(1,size)});
  }
 }
 function updateComponents(dt){
  for(const o of objects){
   if(o===player)continue;
   for(const c of o.components||[]){
    if(!c||c.enabled===false)continue;
    if(!o.visible&&c.type!=='collectible')continue;
    const key=o.id+':'+c.type;
    let state=componentStates.get(key);
    if(!state){state={t:0,x:o.x||0,y:o.y||0,z:o.z||0,cooldown:0,hit:false,acc:0,collected:false};componentStates.set(key,state);}
    state.t+=dt;
    if(c.type==='spin'){const key=is3d?'ry':'rotation';o[key]=(Number(o[key])||0)+(Number(c.speed)||0)*dt;}
    else if(c.type==='bob'){const wave=Math.sin(state.t*2*Math.PI*Math.max(.1,Number(c.frequency)||1))*Math.max(0,Number(c.amplitude)||0);if(is3d)o.y=state.y+wave;else o.y=state.y+wave;}
    else if(c.type==='patrol'){const dist=Math.max(1,Number(c.distance)||130),speed=Math.max(1,Number(c.speed)||60),travel=(state.t*speed)%(dist*2);o.x=state.x+(travel>dist?2*dist-travel:travel)-dist/2;}
    else if(c.type==='follow'&&player){
     const px=(player.x||0)-(o.x||0),py=is3d?(player.z||0)-(o.z||0):(player.y||0)-(o.y||0),len=Math.hypot(px,py);
     if(len>Math.max(0,Number(c.stopDistance)||0)&&len>.01){
      const move=Math.min(len-Math.max(0,Number(c.stopDistance)||0),(Number(c.speed)||0)*dt);
      o.x+=px/len*move;if(is3d)o.z+=py/len*move;else o.y+=py/len*move;
     }
    }
    else if(c.type==='particles'&&!is3d){
     state.acc+=(Math.max(0,Number(c.rate)||0))*dt;
     const count=Math.min(12,Math.floor(state.acc));state.acc-=count;
     if(count)spawnParticles(o.x||0,o.y||0,count,o.color||'#73e2ce',Number(c.speed)||65,Number(c.life)||1,Number(c.size)||4);
    }
    const hit=!!(o.visible&&player&&isColliding(o,player));
    if(c.type==='collectible'&&hit&&!state.collected){
     state.collected=true;o.visible=false;state.respawnAt=Number(c.respawn)||0;addScore(c.score);showMessage('+'+(Number(c.score)||0)+' pontos');
     spawnParticles(o.x,o.y,14,o.color||'#ffe082',100,.7,4);
    }
    if(c.type==='collectible'&&state.collected&&state.respawnAt>0){state.respawnAt-=dt;if(state.respawnAt<=0){o.visible=true;state.collected=false;}}
    if(c.type==='hazard'&&hit){state.cooldown-=dt;if(state.cooldown<=0){setHealth(health-(Number(c.damage)||0));state.cooldown=Math.max(.1,Number(c.cooldown)||1);}}
    else if(c.type==='hazard'){state.cooldown=Math.max(0,state.cooldown-dt);}
    if(c.type==='checkpoint'&&hit&&!state.hit){checkpointAt();showMessage('Checkpoint salvo!');}
    if(c.type==='portal'&&hit&&!state.hit&&c.sceneName)requestScene(c.sceneName);
    if(c.type==='impulse'&&hit&&!state.hit&&player){
     const vel=velocities.get(player.id)||{vy:0,ground:false};
     vel.vy=is3d?Math.max(0,Number(c.strength)||430): -Math.max(0,Number(c.strength)||430);
     vel.ground=false;velocities.set(player.id,vel);
    }
    state.hit=hit;
   }
  }
 }
 function drawParticles(dt){
  if(is3d||!particles.length)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const w=canvas.clientWidth,h=canvas.clientHeight,z=camera2d.zoom||1;
  ctx.save();ctx.translate(w/2,h/2);ctx.scale(z,z);ctx.translate(-(camera2d.x||0),-(camera2d.y||0));
  for(let i=particles.length-1;i>=0;i--){
   const p=particles[i];p.age+=dt;if(p.age>=p.life){particles.splice(i,1);continue;}
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;
   ctx.globalAlpha=Math.max(0,1-p.age/p.life);
   ctx.fillStyle=/^#[a-f0-9]{6}$/i.test(p.color)?p.color:'#77e6db';
   ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1-p.age/p.life*.5),0,Math.PI*2);ctx.fill();
  }
  ctx.restore();ctx.globalAlpha=1;
 }

 const animClocks=new Map();const clone=v=>JSON.parse(JSON.stringify(v));
 const animationProps=['x','y','z','w','h','d','rotation','rx','ry','rz','opacity'];
 function sampleAnimation(clip,clock){
  const keys=(clip.keyframes||[]).slice().sort((a,b)=>a.time-b.time);
  if(!keys.length)return null;const duration=Math.max(.1,Number(clip.duration)||1);
  const t=clip.loop?(clock%duration):Math.min(duration,clock);
  let a=keys[0],b=keys[keys.length-1];
  if(t<=a.time)b=a;else if(t>=b.time)a=b;else for(let i=1;i<keys.length;i++)if(keys[i].time>=t){a=keys[i-1];b=keys[i];break;}
  let ratio=Math.max(0,Math.min(1,(t-a.time)/Math.max(.0001,b.time-a.time)));
  if(clip.ease==='smooth')ratio=ratio*ratio*(3-2*ratio);
  else if(clip.ease==='in')ratio=ratio*ratio;
  else if(clip.ease==='out')ratio=1-(1-ratio)*(1-ratio);
  else if(clip.ease==='step')ratio=ratio<1?0:1;
  const pose={};
  for(const key of animationProps)pose[key]=(Number(a[key])||0)+((Number(b[key])||0)-(Number(a[key])||0))*ratio;
  return pose;
 }
 function animateObject(o,dt){
  const clips=o.animations||[],clip=clips.find(c=>c.id===o.activeAnimation);
  if(o.type==='character3d'){
   const asset=(scene.assets||[]).find(a=>a.id===o.assetId),model=characterAsset(asset);
   if(model){
    const rigClip=model.animations.find(c=>c.id===o.rigClip||c.name===o.rigClip)||model.animations[0];
    if(rigClip){
     if(o.rigPlaying!==false){
      o.rigClip=rigClip.id;o.rigTime=(o.rigTime||0)+dt*(rigClip.speed||1);
      if(!rigClip.loop&&o.rigTime>=rigClip.duration){o.rigTime=rigClip.duration;o.rigPlaying=false;}
     }
    }
   }
  }
  if(!clip)return;let state=animClocks.get(o.id);
  if(!state||state.clipId!==clip.id){state={clipId:clip.id,time:0,playing:clip.autoplay!==false};animClocks.set(o.id,state);}
  if(!state.playing)return;
  state.time+=dt*Math.min(5,Math.max(.1,Number(clip.speed)||1));const pose=sampleAnimation(clip,state.time);if(pose)Object.assign(o,pose);
  if(!clip.loop&&state.time>=Math.max(.1,clip.duration||1))state.playing=false;
 }
 function solidTilesNear(o){
  const t=scene.tilemap;if(!t?.cells||is3d)return [];
  const ts=clamp(Number(t.size)||32,8,256),result=[];
  const minX=Math.floor(((o.x||0)-(o.w||32)/2)/ts)-1,maxX=Math.ceil(((o.x||0)+(o.w||32)/2)/ts)+1;
  const minY=Math.floor(((o.y||0)-(o.h||32)/2)/ts)-1,maxY=Math.ceil(((o.y||0)+(o.h||32)/2)/ts)+1;
  for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)if(t.cells[x+','+y]?.solid){
   result.push({x:(x+.5)*ts,y:(y+.5)*ts,w:ts,h:ts,solid:true,visible:true});
  }
  return result;
 }
 function requestScene(name){
  if(!Array.isArray(scene.scenes)||!scene.scenes.length)return false;
  const found=scene.scenes.find(s=>s.id===name||s.name===name);
  if(!found)return false;
  if(found.mode!==scene.mode||found.id===scene.activeSceneId)return false;
  pendingScene=found.id;return true;
 }
 function nextScene(){
  const arr=scene.scenes||[],idx=arr.findIndex(x=>x.id===scene.activeSceneId);
  if(arr.length<2)return false;
  pendingScene=arr[(idx+1)%arr.length].id;return true;
 }
 function changeSceneNow(){
  if(!pendingScene)return;
  const target=(scene.scenes||[]).find(x=>x.id===pendingScene);pendingScene='';
  if(!target)return;
  for(const key of ['background','gravity','gravity3d','grid','genre','script','tilemap'])scene[key]=clone(target[key]??(key==='tilemap'?{size:32,cells:{}}:key==='script'?'':0));
  objects.splice(0,objects.length,...clone(target.objects||[]));scene.objects=objects;scene.activeSceneId=target.id;
  player=objects.find(o=>o.type===(is3d?'player3d':'player2d'));velocities.clear();playscript.clear();animClocks.clear();scriptErrors.clear();
  camera2d.x=player?.x||0;camera2d.y=player?.y||0;
  camera3d.target=[player?.x||0,player?.y||0,player?.z||0];
  if(debugOverlay)debugOverlay.textContent='Cena: '+target.name;componentStates.clear();particles=[];checkpoint=null;checkpointAt();health=Number(player?.health??100);maxHealth=Math.max(1,Number(player?.maxHealth??100));updateHud();
 }
 let debugOverlay=null;
 if(scene.debugFps){
  debugOverlay=document.createElement('div');debugOverlay.className='ax-game-fps';
  debugOverlay.style.cssText='position:fixed;left:8px;top:8px;z-index:15;background:#07192ddd;color:#9cf1d3;border-radius:9px;padding:6px;font:700 11px monospace;pointer-events:none';
  document.body.appendChild(debugOverlay);
 }

 // HUD e controles touch configuráveis por jogo, sem dependência de servidor.
 const joystick=document.getElementById('joystick'),stickKnob=document.getElementById('stick');
 const jumpCtrl=document.getElementById('jumpBtn'),actionCtrl=document.getElementById('actionBtn');
 if(joystick&&stickKnob){
  const diameter=clamp(settings.joystickSize||122,70,210);
  joystick.style.width=joystick.style.height=diameter+'px';
  stickKnob.style.width=stickKnob.style.height=Math.round(diameter*.4)+'px';
  stickKnob.style.left=stickKnob.style.top=Math.round(diameter*.3)+'px';
  joystick.style.opacity=clamp(settings.controlOpacity||.8,.2,1);
 }
 for(const btn of [jumpCtrl,actionCtrl])if(btn){
  const diameter=btn===actionCtrl?Math.round(clamp(settings.actionSize||78,45,150)*.64):clamp(settings.actionSize||78,45,150);
  btn.style.width=btn.style.height=diameter+'px';
  btn.style.opacity=clamp(settings.controlOpacity||.8,.2,1);
 }
 if(actionCtrl)actionCtrl.style.right=Math.round(clamp(settings.actionSize||78,45,150)*1.5)+'px';
 camera2d.zoom=clamp(settings.cameraZoom||1,.35,3);
 if(settings.pixelPerfect)canvas.style.imageRendering='pixelated';
 if(settings.hud!==false){
  hudBox=document.createElement('div');hudBox.id='ax08Hud';
  hudBox.style.cssText='position:fixed;z-index:10;left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));pointer-events:none;color:#f0ffff;font:800 13px system-ui;text-shadow:0 1px 4px #000;padding:8px;background:#0a1922bb;border-radius:10px;min-width:100px';
  if(settings.showScore!==false){hudScore=document.createElement('div');hudScore.textContent='✦ 0';hudBox.appendChild(hudScore);}
  if(settings.showHealth!==false){const bar=document.createElement('div');bar.style.cssText='height:10px;margin-top:7px;min-width:110px;border-radius:8px;background:#752c38;overflow:hidden';hudHealth=document.createElement('div');hudHealth.style.cssText='width:100%;height:100%;background:#62d8ad;transition:width .15s';bar.appendChild(hudHealth);hudBox.appendChild(bar);}
  document.body.appendChild(hudBox);
 }
 gameMessage=document.createElement('div');gameMessage.id='ax08Message';
 gameMessage.style.cssText='position:fixed;z-index:20;top:15%;left:50%;transform:translateX(-50%);max-width:80vw;border:1px solid #9af4dd;padding:12px 17px;border-radius:14px;background:#122c41e9;color:white;font:800 14px system-ui;text-align:center;pointer-events:none;display:none';
 document.body.appendChild(gameMessage);
 if(settings.showGameTips&&player){showMessage('Use o analógico ou WASD para mover',2);}
 checkpointAt();
 const audioConfig=scene.audio||{},audioAssets=(scene.assets||[]).filter(a=>String(a.type||'').startsWith('audio/')),audioPlaying=new Set(),soundCooldown=new Map();
 let bgMusic=null,lastJump=false,lastAction=false;
 function playAsset(key,opts={}){
  const asset=audioAssets.find(a=>a.id===key||a.name===key);
  if(!asset||audioConfig.mute)return null;
  const now=performance.now(),last=soundCooldown.get(asset.id)||-Infinity;
  if(now-last<70)return null;
  soundCooldown.set(asset.id,now);
  try{
   const snd=new Audio(asset.data),isMusic=opts.group==='music'||asset.id===audioConfig.musicAssetId;
   snd.volume=clamp((asset.volume??1)*(opts.volume??1)*(audioConfig.master??1)*(isMusic?(audioConfig.music??.7):(audioConfig.sfx??.85)),0,1);
   snd.loop=opts.loop??asset.loop??isMusic;
   snd.playbackRate=clamp(opts.rate??asset.rate??1,.5,2);
   snd.onended=()=>audioPlaying.delete(snd);
   audioPlaying.add(snd);snd.play().catch(()=>audioPlaying.delete(snd));
   return snd;
  }catch{return null;}
 }
 function startBgm(){if(bgMusic||!audioConfig.musicAssetId||audioConfig.musicAuto===false)return;bgMusic=playAsset(audioConfig.musicAssetId,{group:'music',loop:true});}
 document.addEventListener('pointerdown',startBgm,{once:true});
 document.addEventListener('keydown',startBgm,{once:true});
 const velocities=new Map();const playscript=new Map();const api={
 getAll:(tag='')=>objects.filter(o=>!tag||String(o.tags||'').split(',').map(s=>s.trim()).includes(tag)),
 getByTag:tag=>objects.find(o=>String(o.tags||'').split(',').map(s=>s.trim()).includes(tag)),
 distance:(a,b)=>a&&b?Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0),(a.z||0)-(b.z||0)):Infinity,
 overlap:(a,b)=>isColliding(a,b),
 addScore,score:()=>score,
 getHealth:()=>health,setHealth,damage:(amount=10)=>setHealth(health-Math.abs(Number(amount)||0)),
 heal:(amount=10)=>setHealth(health+Math.abs(Number(amount)||0)),
 message:showMessage,
 cameraShake:(intensity=5)=>{cameraShake=Math.min(30,Math.max(0,Number(intensity)||0));},
 setCameraZoom:zoom=>camera2d.zoom=clamp(Number(zoom),.35,3),
 saveData:(key,value)=>{try{localStorage.setItem('aurenix-save-'+scene.id+'-'+String(key).slice(0,50),JSON.stringify(value));return true;}catch{return false;}},
 loadData:(key,fallback=null)=>{try{const x=localStorage.getItem('aurenix-save-'+scene.id+'-'+String(key).slice(0,50));return x===null?fallback:JSON.parse(x);}catch{return fallback;}},
 emitParticles:(x,y,count=8,color='#73e2ce')=>spawnParticles(x,y,count,color),
 respawn:()=>setHealth(0),
 get:(name)=>objects.find(o=>o.id===name||o.name===name),spawn:(type,props={})=>{const n=makeObj(type,props);objects.push(n);return n;},remove:id=>{const i=objects.findIndex(o=>o.id===id||o.name===id);if(i>=0)objects.splice(i,1);},collides:(a,b)=>a&&b&&intersect2d(a,b),isKeyDown:k=>keys.has(String(k).toLowerCase()),get input(){return {...controls};},
 get sceneName(){return (scene.scenes||[]).find(s=>s.id===scene.activeSceneId)?.name||'Cena 1';},
 loadScene:name=>requestScene(name),nextScene:()=>nextScene(),
 getTile:(x,y)=>scene.tilemap?.cells?.[Math.floor(x)+','+Math.floor(y)]||null,
 setTile:(x,y,color='#5aa78b',solid=false)=>{scene.tilemap||={size:32,cells:{}};scene.tilemap.cells[Math.floor(x)+','+Math.floor(y)]={color,solid:!!solid};},
 playAnimation:(o,name)=>{const target=typeof o==='string'?objects.find(x=>x.id===o||x.name===o):o;if(!target)return false;if(target.type==='character3d'){const doc=characterAsset((scene.assets||[]).find(a=>a.id===target.assetId));const rig=doc?.animations.find(c=>c.name===name||c.id===name);if(!rig)return false;if(target.rigClip===rig.id&&target.rigPlaying!==false)return true;target.rigClip=rig.id;target.rigTime=0;target.rigPlaying=true;return true;}const clip=(target.animations||[]).find(c=>c.id===name||c.name===name);if(!clip)return false;const current=animClocks.get(target.id);if(current?.playing&&current.clipId===clip.id)return true;target.activeAnimation=clip.id;animClocks.set(target.id,{clipId:clip.id,time:0,playing:true});return true;},
 stopAnimation:o=>{const target=typeof o==='string'?objects.find(x=>x.id===o||x.name===o):o;if(!target)return false;if(target.type==='character3d'){target.rigPlaying=false;return true;}const st=animClocks.get(target.id);if(st)st.playing=false;return true;},
 playSound:(name,options={})=>playAsset(name,options),stopMusic:()=>{bgMusic?.pause();bgMusic=null;},sound:(freq=440,duration=.1)=>{try{const ac=api.audio||(api.audio=new (window.AudioContext||window.webkitAudioContext)());const osc=ac.createOscillator(),gain=ac.createGain();osc.frequency.value=Number(freq)||440;osc.connect(gain);gain.connect(ac.destination);gain.gain.setValueAtTime(.06,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+Math.max(.03,duration));osc.start();osc.stop(ac.currentTime+Math.max(.03,duration));}catch(e){}}};
 function scriptTick(o,dt){if(!o.script)return;let entry=playscript.get(o.id);if(!entry||entry.code!==o.script){try{entry={code:o.script,fn:new Function('self','scene','api','dt',`'use strict';\n${o.script}`)};playscript.set(o.id,entry);}catch(e){showError(`${o.name}: ${e.message}`);return;}}try{entry.fn(o,scene,api,dt);}catch(e){if(!scriptErrors.has(o.id)){showError(`${o.name}: ${e.message}`);scriptErrors.add(o.id);}}}
 function showError(s){let el=document.querySelector('.gameerror');if(!el){el=document.createElement('div');el.className='gameerror';document.body.appendChild(el);}el.textContent='Erro no script: '+s;}
 window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key===' '||e.key==='ArrowUp')controls.jump=true;});window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(e.key===' ')controls.jump=false;});window.addEventListener('blur',()=>{keys.clear();controls.x=0;controls.y=0;controls.jump=false;});
 const joy=document.getElementById('joystick'),stick=document.getElementById('stick');if(joy&&stick){let touchId=null;const move=(e)=>{const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;const radius=Math.max(26,r.width*.4),dx=clamp((e.clientX-cx)/radius,-1,1),dy=clamp((e.clientY-cy)/radius,-1,1);const len=Math.hypot(dx,dy),m=len>1?1/len:1;controls.x=dx*m;controls.y=dy*m;stick.style.transform=`translate(${controls.x*(r.width*.29)}px,${controls.y*(r.width*.29)}px)`;};joy.addEventListener('pointerdown',e=>{touchId=e.pointerId;joy.setPointerCapture(e.pointerId);move(e);});joy.addEventListener('pointermove',e=>{if(touchId===e.pointerId)move(e);});const end=e=>{if(e.pointerId!==touchId)return;touchId=null;controls.x=controls.y=0;stick.style.transform='';};joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);}
 const jumpButton=document.getElementById('jumpBtn'),actionButton=document.getElementById('actionBtn');if(jumpButton){for(const ev of ['pointerdown','pointerup','pointercancel'])jumpButton.addEventListener(ev,e=>{e.preventDefault();controls.jump=ev==='pointerdown';});}if(actionButton){for(const ev of ['pointerdown','pointerup','pointercancel'])actionButton.addEventListener(ev,e=>{e.preventDefault();controls.action=ev==='pointerdown';});}
 if(is3d){let drag=null;canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.clientX<innerWidth*.35)return;drag={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;camera3d.yaw-=(e.clientX-drag.x)*.006;camera3d.pitch=clamp(camera3d.pitch+(e.clientY-drag.y)*.005,.08,1.4);drag.x=e.clientX;drag.y=e.clientY;});canvas.addEventListener('pointerup',()=>drag=null);}
 function tick(now){if(dead)return;const dt=clamp((now-time)/1000,0,.045);time=now;const kx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);const ky=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);let dx=clamp(kx+controls.x,-1,1),dy=clamp(ky+controls.y,-1,1);
 const jumpNow=!!(controls.jump||keys.has(' ')||(!is3d&&keys.has('w'))),actionNow=!!(controls.action||keys.has('f'));
 if(jumpNow&&!lastJump&&audioConfig.jumpAssetId)playAsset(audioConfig.jumpAssetId);
 if(actionNow&&!lastAction&&audioConfig.actionAssetId)playAsset(audioConfig.actionAssetId);
 lastJump=jumpNow;lastAction=actionNow;
 if(Math.hypot(dx,dy)>1){const mag=Math.hypot(dx,dy);dx/=mag;dy/=mag;}
 if(player&&!player.anchored){if(is3d){const yaw=camera3d.yaw;const vel=velocities.get(player.id)||{vy:0,ground:false};const vx=(Math.cos(yaw)*dx+Math.sin(yaw)*dy)*(player.speed||5)*dt,vz=(-Math.sin(yaw)*dx+Math.cos(yaw)*dy)*(player.speed||5)*dt;
 const solids=objects.filter(o=>o.solid&&o!==player);const hit3=(px,py,pz,s)=>Math.abs(px-s.x)<(player.w+s.w)/2&&Math.abs(py-s.y)<(player.h+s.h)/2&&Math.abs(pz-s.z)<(player.d+s.d)/2;
 const tryAxis=(axis,v)=>{player[axis]+=v;if(solids.some(o=>hit3(player.x,player.y,player.z,o)))player[axis]-=v;};tryAxis('x',vx);tryAxis('z',vz);
 if((controls.jump||keys.has(' '))&&vel.ground){vel.vy=player.jump||7;vel.ground=false;}vel.vy-=(scene.gravity3d||18)*dt;const oldY=player.y;player.y+=vel.vy*dt;vel.ground=false;for(const o of solids){const top=o.y+o.h/2;const withinXZ=Math.abs(player.x-o.x)<(player.w+o.w)/2&&Math.abs(player.z-o.z)<(player.d+o.d)/2;if(withinXZ&&oldY-player.h/2>=top-.12&&player.y-player.h/2<=top&&vel.vy<=0){player.y=top+player.h/2;vel.vy=0;vel.ground=true;}}
 if(player.y< -40){player.x=0;player.y=5;player.z=0;vel.vy=0;}velocities.set(player.id,vel);camera3d.target[0]+=(player.x-camera3d.target[0])*clamp(settings.cameraSmoothing??.09,0,1);camera3d.target[1]+=(player.y-camera3d.target[1])*clamp(settings.cameraSmoothing??.09,0,1);camera3d.target[2]+=(player.z-camera3d.target[2])*clamp(settings.cameraSmoothing??.09,0,1);
 }else if(scene.genre==='topdown'){const speed=(player.speed||230)*dt;const solids=objects.filter(o=>o.solid&&o.visible&&o!==player).concat(solidTilesNear(player));const mov=(axis,v)=>{player[axis]+=v;if(solids.some(o=>intersect2d(player,o)))player[axis]-=v;};mov('x',dx*speed);mov('y',dy*speed);camera2d.x+=(player.x-camera2d.x)*clamp(settings.cameraSmoothing??.09,0,1);camera2d.y+=(player.y-camera2d.y)*clamp(settings.cameraSmoothing??.09,0,1);
 }else{const v=velocities.get(player.id)||{vy:0,ground:false};const solids=objects.filter(o=>o.solid&&o.visible&&o!==player).concat(solidTilesNear(player));player.x+=dx*(player.speed||230)*dt;for(const o of solids)if(intersect2d(player,o)){if(dx>0)player.x=o.x-o.w/2-player.w/2;else if(dx<0)player.x=o.x+o.w/2+player.w/2;}if((controls.jump||keys.has('w')||keys.has('arrowup'))&&v.ground){v.vy=-(player.jump||430);v.ground=false;}v.vy+=(scene.gravity||1100)*dt;player.y+=v.vy*dt;v.ground=false;for(const o of solids){if(intersect2d(player,o)){if(v.vy>=0){player.y=o.y-o.h/2-player.h/2;v.ground=true;}else player.y=o.y+o.h/2+player.h/2;v.vy=0;}}if(player.y>4000){player.x=0;player.y=0;v.vy=0;}velocities.set(player.id,v);camera2d.x+=(player.x-camera2d.x)*clamp(settings.cameraSmoothing??.09,0,1);camera2d.y+=(player.y-camera2d.y)*clamp(settings.cameraSmoothing??.09,0,1);}}
 for(const o of objects){if(o.physics&&!o.anchored&&o!==player&&!is3d&&o.type!=='text'){const v=velocities.get(o.id)||{vy:0};v.vy+=(scene.gravity||1100)*dt;const y0=o.y;o.y+=v.vy*dt;for(const s of [...objects,...solidTilesNear(o)])if(s.solid&&s!==o&&intersect2d(o,s)&&y0+o.h/2<=s.y-s.h/2+8){o.y=s.y-s.h/2-o.h/2;v.vy=0;}velocities.set(o.id,v);}animateObject(o,dt);scriptTick(o,dt);}updateComponents(dt);if(scene.script){scriptTick({_id:'scene',id:'scene',name:'Cena',script:scene.script},dt);}changeSceneNow();
 if(is3d)renderer.render(scene,camera3d,{grid:false});
 else {if(cameraShake>.03){camera2d.x+=(Math.random()-.5)*cameraShake;camera2d.y+=(Math.random()-.5)*cameraShake;cameraShake*=.86;}
   draw2D(canvas,scene,camera2d,{grid:false,images});drawParticles(dt);
 }
 fpsFrames++;if(debugOverlay&&now-fpsTime>=500){debugOverlay.textContent=Math.round(fpsFrames*1000/(now-fpsTime))+' FPS • '+objects.length+' objetos • '+api.sceneName;fpsFrames=0;fpsTime=now;}
 requestAnimationFrame(tick);}
 if(renderer?.error){showError(renderer.error);return;}requestAnimationFrame(tick);return ()=>{dead=true;for(const snd of audioPlaying)snd.pause();audioPlaying.clear();clearTimeout(messageTimeout);hudBox?.remove();gameMessage?.remove();};
}
const Runtime={makeTemplate,makeObj,draw2D,Renderer3D,parseOBJ,createGeometry,gameHTML,startGame,imgMap,clamp,uid,expandedSceneObjects,characterAsset};global.AurenixRuntime=Runtime;if(global.__AURENIX_GAME__)document.addEventListener('DOMContentLoaded',()=>startGame(global.__AURENIX_GAME__));
})(window);
