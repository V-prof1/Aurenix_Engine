const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('Indicador XYZ projeta os três eixos sem depender de WebGL',()=>{
 const win={};vm.runInNewContext(fs.readFileSync('js/axis3d.js','utf8'),{window:win});
 const axes=win.AurenixAxis3D.projectAxes({yaw:.7,pitch:.63});
 assert.deepEqual(Array.from(axes.map(a=>a.key)),['X','Y','Z']);
 assert.ok(axes.every(a=>Number.isFinite(a.screenX)&&Number.isFinite(a.screenY)));
});
test('Paleta responsiva possui grid auto-fit e swatches sem largura mínima',()=>{
 const html=fs.readFileSync('pixelstudio.html','utf8');
 assert.match(html,/\.ps-card \.ps-swatches\s*\{/);
 assert.match(html,/grid-template-columns:repeat\(auto-fit,minmax\(40px,1fr\)\)/);
 assert.match(html,/min-width:0!important;max-width:100%!important;width:100%!important/);
});
test('Ferramentas de cena e XYZ são legíveis e visíveis no mobile',()=>{
 const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('style.css','utf8');
 for(const label of ['Selecionar','Câmera','Escalar','Mover XYZ','Girar','Grade','Encaixar'])assert.ok(html.includes('<span>'+label+'</span>'));
 assert.match(html,/id="axisCanvas"/);assert.match(html,/aria-label="Indicador dos eixos X Y Z/);
 assert.match(css,/\.workspace-toolbar \.tools button span\{display:inline!important/);
 assert.match(css,/\.axis-gizmo canvas\{/);
});
