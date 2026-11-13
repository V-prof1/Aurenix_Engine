const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('Todos os módulos da alpha 0.5 têm JavaScript válido',()=>{
 for(const file of ['js/editor.js','js/runtime.js','js/home.js','js/theme.js','js/audio.js','js/back.js','js/android-ui.js','js/blocks.js']){
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(file,'utf8'),{filename:file}),file);
 }
 const pixel=fs.readFileSync('pixelstudio.html','utf8');
 const start=pixel.indexOf('<script>'),end=pixel.lastIndexOf('</script>');
 assert.ok(start>0&&end>start);
 assert.doesNotThrow(()=>new vm.Script(pixel.slice(start+8,end),{filename:'pixelstudio.inline.js'}));
});
test('Os 17 temas personalizam duas cores e o tamanho dos controles',()=>{
 const values={};
 const window={dispatchEvent(){}};
 const document={documentElement:{style:{setProperty:(key,value)=>values[key]=value},dataset:{}},querySelector:()=>null};
 const storage={getItem:()=>null,setItem(){}};
 vm.runInNewContext(fs.readFileSync('js/theme.js','utf8'),{window,document,localStorage:storage,CustomEvent:function(){}});
 assert.equal(window.AurenixTheme.palettes.length,17);
 window.AurenixTheme.choose(3);
 assert.equal(values['--ax-primary'],window.AurenixTheme.palettes[3][1]);
 assert.equal(values['--ax-secondary'],window.AurenixTheme.palettes[3][2]);
});
test('Gerador de WAV produz áudio PCM válido sem serviços externos',()=>{
 const window={};
 const document={getElementById:()=>null};
 const btoa=s=>Buffer.from(s,'binary').toString('base64');
 vm.runInNewContext(fs.readFileSync('js/audio.js','utf8'),{window,document,btoa,Audio:function(){}});
 const url=window.AurenixAudio.generateWave('coin','sine',540,.2);
 const bytes=Buffer.from(url.split(',')[1],'base64');
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WAVE');
 assert.equal(bytes.readUInt16LE(22),1);
 assert.ok(bytes.length>3000);
});
test('UI e build Android têm áudio, Pixel Studio e retorno de teste',()=>{
 const page=fs.readFileSync('index.html','utf8');
 const pixel=fs.readFileSync('pixelstudio.html','utf8');
 const editor=fs.readFileSync('js/editor.js','utf8');
 const app=JSON.parse(fs.readFileSync('capacitor.config.json','utf8'));
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 assert.match(page,/id="audioPanel"/);
 assert.match(page,/js\/back\.js/);
 assert.match(pixel,/ps-quicknav/);
 assert.match(pixel,/\.ps-stage\{width:100%;height:100%;min-height:0/);
 assert.ok(editor.includes('AURENIX_EXIT_PLAY'));
 assert.equal(app.appId,'com.aurenix.engine.alpha05');
 assert.ok(pkg.dependencies['@capacitor/app']);
});
