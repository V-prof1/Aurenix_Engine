/* Injeta suporte a blocos no editor standalone original sem alterar a engine 2D/3D. */
(function(global){
  'use strict';
  global.AurenixPatch=function(source){
    let patched=source;
    const change=(from,to,label)=>{
      if(!patched.includes(from)){console.warn('[Aurenix 0.2] Patch não aplicado:',label);return;}
      patched=patched.replace(from,to);
    };
    change("function setProject(p){project=p;","function setProject(p){project=p;project.programming=project.programming==='blocks'?'blocks':'script';if(project.programming==='blocks')window.AurenixBlocks?.compileAll(project);","carregar modo do projeto");
    change("function updateScriptUI(){const o=selected(),isHtml=project.mode==='html5';",
      "function updateScriptUI(){const o=selected(),isHtml=project.mode==='html5';if(window.AurenixBlocks){const blockMode=project.programming==='blocks'&&!isHtml;window.AurenixBlocks.toggle(blockMode,{project,target:o,onChange:()=>{markDirty();renderSummary();}});if(blockMode){$('codeTarget').textContent=o?'🧱 '+o.name+' • BLOCOS':'🧱 Cena • BLOCOS';$('externalFileBar').classList.add('hidden');return;}}",
      "interface de blocos");
    change("setProject(R.makeTemplate(tem.dataset.template));",
      "const p=R.makeTemplate(tem.dataset.template);p.programming=$('newProgrammingChoice')?.value==='blocks'?'blocks':'script';if(p.programming==='blocks'){p.script='';for(const o of p.objects){o.script='';o.blocks=[];}window.AurenixBlocks?.compileAll(p);}setProject(p);",
      "escolha exclusiva ao criar");
    change("function saveProject(){","function saveProject(){","não utilizado");
    change("async function saveProject(){try{",
      "async function saveProject(){window.AurenixBlocks?.compileAll(project);try{",
      "compilar antes de salvar");
    change("function exportProject(){download(",
      "function exportProject(){window.AurenixBlocks?.compileAll(project);download(",
      "compilar backup");
    change("function gameFiles(){if(project.mode==='html5')",
      "function gameFiles(){window.AurenixBlocks?.compileAll(project);if(project.mode==='html5')",
      "compilar exportação HTML");
    change("function play(){if(project.mode==='html5'",
      "function play(){window.AurenixBlocks?.compileAll(project);if(project.mode==='html5'",
      "compilar teste");
    change("⌘ Editar script JS",
      "${project.programming==='blocks'?'🧱 Programar por blocos':'⌘ Editar script JS'}",
      "botão programação por modo");
    change("${esc(p.mode)} • ${new Date(p.updated||Date.now()).toLocaleDateString('pt-BR')}",
      "${esc(p.mode)} • ${p.programming==='blocks'?'Blocos':'Scripts'} • ${new Date(p.updated||Date.now()).toLocaleDateString('pt-BR')}",
      "lista de projetos");
    const init = `
const oldNewProjectModal = newProjectModal;
newProjectModal = function(){
  oldNewProjectModal();
  $('modalContent').insertAdjacentHTML('afterbegin',
    '<div class="ax-choice"><label for="newProgrammingChoice">COMO VOCÊ VAI PROGRAMAR?</label>'+
    '<select id="newProgrammingChoice" aria-label="Escolha a programação do projeto">'+
    '<option value="blocks">🧱 Blocos — visual, sem digitar código</option>'+
    '<option value="script">💻 Scripts — escrever JavaScript</option></select>'+
    '<small>Escolha definitiva para este projeto. Depois de criado, não poderá mudar o tipo sem criar outro projeto.</small></div>');
};
project.programming='script';
`;
    change("start().catch(e=>{",init+"start().catch(e=>{","criação de projetos");
    change('      - name: Configurar Android SDK\n        uses: android-actions/setup-android@v3', '      - name: Configurar Android SDK\n        run: sdkmanager "platforms;android-36" "build-tools;36.0.0"', 'SDK dos APKs exportados');
    return patched;
  };
})(window);