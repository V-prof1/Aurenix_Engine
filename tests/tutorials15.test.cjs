const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function courses(){
 const sandbox={window:{}};
 vm.runInNewContext(fs.readFileSync('js/tutorials-data.js','utf8'),sandbox,{filename:'tutorials-data.js'});
 return sandbox.window.AurenixCourses;
}
test('Aurenix Academy: pelo menos 60 aulas práticas com alvos e etapas',()=>{
 const lessons=courses();
 assert.ok(lessons.length>=60,'A academia deve ser abrangente');
 assert.equal(new Set(lessons.map(x=>x.id)).size,lessons.length,'IDs únicos');
 for(const lesson of lessons){
  assert.ok(lesson.title&&lesson.group&&lesson.track,lesson.id);
  assert.ok(lesson.steps.length>=2,lesson.id+' exige passos');
  for(const step of lesson.steps){
   assert.ok(step.target&&step.help,lesson.id+' alvo e explicação');
   assert.ok(['click','change','input','pointerup'].includes(step.event),lesson.id+' evento');
  }
 }
});
test('Tópicos essenciais e laboratórios compartilhados',()=>{
 const lessons=courses();
 for(const term of ['primeiro-projeto','codigo','blocos','animacao2d','animacao2d-loop','olhos-piscar','olhos-piscadela','sobrancelhas','falar','animacao-corpo','pixel-frames','pixel-onion','model-inicio','exportar-apk'])
  assert.ok(lessons.some(x=>x.id===term),term);
 const labs=new Set(lessons.map(x=>x.track));
 for(const lab of ['2d','3d','pixel','model','animation2d'])assert.ok(labs.has(lab),lab);
 assert.ok(lessons.filter(x=>x.group==='Animação 3D').length>=10);
 assert.ok(lessons.filter(x=>x.track==='pixel').length>=8);
});
test('Todas as telas incluem o tutor e os dados',()=>{
 for(const file of ['index.html','studio.html','pixelstudio.html','modelstudio.html']){
  const html=fs.readFileSync(file,'utf8');
  for(const path of ['js/tutorials.css','js/tutorials-data.js','js/tutorials.js'])assert.ok(html.includes(path),file+' deve carregar '+path);
 }
 const home=fs.readFileSync('js/home.js','utf8');
 assert.ok(home.includes('data-home="tutorials"'),'botão de tutoriais na tela inicial');
 const editor=fs.readFileSync('js/editor.js','utf8');
 assert.ok(editor.includes('window.AurenixTutorialBridge'),'integração de laboratórios');
 const model=fs.readFileSync('js/modelstudio.js','utf8');
 assert.ok(model.includes('window.AurenixModelTutorialBridge'),'personagem de treinamento');
 const pixel=fs.readFileSync('pixelstudio.html','utf8');
 assert.ok(pixel.includes('window.AurenixPixelTutorialBridge'),'projeto pixel de treinamento');
});