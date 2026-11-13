/* Aurenix Engine 0.2 — Editor visual de blocos, sem dependências. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => 'b' + Math.random().toString(36).slice(2,10);
  const num = (v,limit=100000) => Math.max(-limit,Math.min(limit,Number(v)||0));
  const js = v => JSON.stringify(String(v ?? '').slice(0,180));
  const actionDefs = {
    moveX: ['Mover X por segundo','Número', '120'],
    moveY: ['Mover Y por segundo','Número', '-80'],
    moveZ: ['Mover Z por segundo (3D)','Número', '1'],
    setX: ['Definir posição X','Número','0'],
    setY: ['Definir posição Y','Número','0'],
    setZ: ['Definir posição Z','Número','0'],
    rotate: ['Girar por segundo (graus)','Número','90'],
    size: ['Definir largura','Número','64'],
    height: ['Definir altura','Número','64'],
    speed: ['Definir velocidade','Número','250'],
    color: ['Mudar cor','Cor','#ffcc66'],
    bg: ['Cor de fundo da cena','Cor','#15283e'],
    gravity: ['Definir gravidade da cena','Número','1100'],
    show: ['Mostrar objeto','Nenhum',''],
    hide: ['Esconder objeto','Nenhum',''],
    sound: ['Tocar som (Hz)','Número','560'],
    text: ['Escrever texto','Texto','Olá!'],
    spawn: ['Criar objeto (rect/circle/cube/sphere)','Texto','circle'],
    remove: ['Apagar este objeto','Nenhum',''],
    reset: ['Voltar à origem','Nenhum',''],
    loadScene: ['Abrir cena pelo nome','Texto','Cena 2'],
    nextScene: ['Ir para próxima cena','Nenhum',''],
    playAnimation: ['Executar animação','Texto','Animação'],
    stopAnimation: ['Parar animação','Nenhum',''],
    playSound: ['Reproduzir áudio do projeto','Texto','Som.wav']
  };
  const eventDefs = {
    always: '♾ A cada quadro',
    start: '⚑ Uma vez ao iniciar',
    key: '⌨ Enquanto tecla pressionada',
    action: '◉ Enquanto botão Ação pressionado',
    jump: '↑ Enquanto botão Pular pressionado',
    collide: '◈ Ao encostar em objeto (2D)',
    timer: '◷ A cada N segundos'
  };
  const eventInput = { key: ['Tecla','e'], collide: ['Nome do objeto','Cristal'], timer: ['Segundos','1'] };
  function actionCode(a,actor) {
    const op=a?.op || 'moveX', v=a?.value ?? '';
    switch(op) {
      case 'moveX': return actor+'.x = ('+actor+'.x||0) + ('+num(v)+' * dt);';
      case 'moveY': return actor+'.y = ('+actor+'.y||0) + ('+num(v)+' * dt);';
      case 'moveZ': return actor+'.z = ('+actor+'.z||0) + ('+num(v)+' * dt);';
      case 'setX': return actor+'.x = '+num(v)+';';
      case 'setY': return actor+'.y = '+num(v)+';';
      case 'setZ': return actor+'.z = '+num(v)+';';
      case 'rotate': return actor+'.rotation = ('+actor+'.rotation||0) + ('+num(v)+' * dt); '+actor+'.ry = ('+actor+'.ry||0) + ('+num(v)+' * dt);';
      case 'size': return actor+'.w = '+Math.max(.1,num(v))+';';
      case 'height': return actor+'.h = '+Math.max(.1,num(v))+';';
      case 'speed': return actor+'.speed = '+num(v)+';';
      case 'color': return actor+'.color = '+js(v)+';';
      case 'bg': return 'scene.background = '+js(v)+';';
      case 'gravity': return 'scene.gravity = '+num(v)+';';
      case 'show': return actor+'.visible = true;';
      case 'hide': return actor+'.visible = false;';
      case 'sound': return 'api.sound('+Math.max(1,num(v))+',.12);';
      case 'text': return actor+'.text = '+js(v)+';';
      case 'spawn': {const type = ['rect','circle','cube','sphere','cylinder','plane','text'].includes(v) ? v : 'circle';return 'api.spawn('+js(type)+',{x:('+actor+'.x||0),y:('+actor+'.y||0),z:('+actor+'.z||0),w:40,h:40,color:"#ffd26c"});';}
      case 'remove': return 'api.remove('+actor+'.id);';
      case 'reset': return actor+'.x=0;'+actor+'.y=0;'+actor+'.z=0;';
      case 'loadScene': return 'api.loadScene('+js(v)+');';
      case 'nextScene': return 'api.nextScene();';
      case 'playAnimation': return 'api.playAnimation('+actor+','+js(v)+');';
      case 'stopAnimation': return 'api.stopAnimation('+actor+');';
      case 'playSound': return 'api.playSound('+js(v)+');';
      default: return '';
    }
  }
  function compile(target,isScene) {
    const actor = isScene ? 'scene' : 'self';
    const rules=Array.isArray(target.blocks)?target.blocks:[];
    const out=['// Gerado automaticamente pelos blocos da Aurenix. Não edite.','const __axState='+actor+';'];
    for (const rule of rules.slice(0,100)) {
      if (!rule || !Array.isArray(rule.actions)) continue;
      const ev=eventDefs[rule.event] ? rule.event : 'always';
      const id=js(rule.id || uid());
      const body=rule.actions.slice(0,100).map(a=>actionCode(a,actor)).join('\n');
      if (ev==='always') out.push('{'+body+'}');
      if (ev==='key') out.push('if(api.isKeyDown('+js(rule.value||'e')+')){'+body+'}');
      if (ev==='action') out.push('if(api.input.action){'+body+'}');
      if (ev==='jump') out.push('if(api.input.jump){'+body+'}');
      if (ev==='collide') out.push('if(api.collides('+actor+',api.get('+js(rule.value||'')+'))){'+body+'}');
      if (ev==='start') out.push('__axState.__axOnce ||= {}; if(!__axState.__axOnce['+id+']){__axState.__axOnce['+id+']=true;'+body+'}');
      if (ev==='timer') out.push('__axState.__axTimers ||= {}; if(!__axState.__axTimers['+id+'] || Date.now()-__axState.__axTimers['+id+']>='+Math.max(0.1,num(rule.value||1))*1000+'){__axState.__axTimers['+id+']=Date.now();'+body+'}');
    }
    return out.join('\n');
  }
  function compileAll(project) {
    if(!project || project.programming!=='blocks' || project.mode==='html5') return;
    project.script=compile(project,true);
    for(const obj of project.objects||[]) obj.script=compile(obj,false);
    if(Array.isArray(project.scenes)){
      for(const scene of project.scenes){
        // A cena ativa será sincronizada após compilar o projeto raiz.
        if(scene.id===project.activeSceneId)continue;
        scene.script=compile(scene,true);
        for(const obj of scene.objects||[])obj.script=compile(obj,false);
      }
    }
  }
  let context=null,active=false;
  function toggle(isActive,options) {
    const editor=$('scriptEditor'), apply=$('applyScriptBtn'),help=$('apiHelpBtn'),txt=$('codeTarget');
    if(!editor) return;
    let root=$('axBlocks');
    if(!root){root=document.createElement('div');root.id='axBlocks';root.className='ax-blocks';editor.insertAdjacentElement('beforebegin',root);}
    active=!!isActive;
    root.hidden=!active;
    editor.hidden=active;apply.hidden=active;help.hidden=active;
    document.querySelectorAll('[data-tab="code"] span,[data-mobile="code"] span').forEach(e=>e.textContent=active?'Blocos':'Código');
    if(!active){context=null;return;}
    context=options;
    render();
  }
  function render() {
    if(!active||!context) return;
    const root=$('axBlocks'), obj=context.target||context.project, rules=obj.blocks ||= [];
    const title=context.target?'Objeto: '+context.target.name:'Cena inteira';
    root.innerHTML='<div class="ax-heading"><strong>🧱 '+esc(title)+'</strong><small>Projeto exclusivo de blocos • ações rodam ao testar</small></div>'+
      '<div class="ax-tip">Monte comportamentos por eventos. Use os botões grandes para organizar; alterações são salvas no projeto.</div>'+
      rules.map((rule,i) => {
        const evOpts=Object.entries(eventDefs).map(([value,label])=>'<option value="'+value+'" '+(rule.event===value?'selected':'')+'>'+esc(label)+'</option>').join('');
        const ed=eventInput[rule.event];
        const head='<div class="ax-event"><div class="ax-field"><label>QUANDO</label><select data-e="'+i+'" data-key="event">'+evOpts+'</select></div>'+
            (ed?'<div class="ax-field"><label>'+esc(ed[0])+'</label><input data-e="'+i+'" data-key="value" value="'+esc(rule.value??ed[1])+'" type="'+(rule.event==='timer'?'number':'text')+'" '+(rule.event==='timer'?'min="0.1" step="0.1"':'')+'></div>':'')+
            '<button class="ax-mini danger" data-del-event="'+i+'" title="Excluir evento">✕</button></div>';
        const actions=(rule.actions||[]).map((a,j)=>{
          const label=actionDefs[a.op]||actionDefs.moveX;
          return '<div class="ax-action"><span class="ax-handle">▦</span><select aria-label="Tipo de ação" data-e="'+i+'" data-a="'+j+'" data-key="op">'+
            Object.entries(actionDefs).map(([v,def])=>'<option value="'+v+'" '+(v===a.op?'selected':'')+'>'+esc(def[0])+'</option>').join('')+'</select>'+
            (label[1]==='Nenhum'?'':'<input aria-label="Valor do bloco" data-e="'+i+'" data-a="'+j+'" data-key="value" '+(label[1]==='Cor'?'type="color"':label[1]==='Número'?'type="number" step="any"':'type="text"')+' value="'+esc(a.value??label[2])+'">')+
            '<div class="ax-rowbuttons"><button class="ax-mini" data-move="'+i+':'+j+':-1" aria-label="Subir">↑</button><button class="ax-mini" data-move="'+i+':'+j+':1" aria-label="Descer">↓</button><button class="ax-mini danger" data-del-action="'+i+':'+j+'" aria-label="Excluir">✕</button></div></div>';
        }).join('');
        return '<article class="ax-stack">'+head+actions+'<button class="ax-add-action" data-add-action="'+i+'">＋ Adicionar ação</button></article>';
      }).join('')+'<button id="axAddEvent" class="ax-add-event">＋ Adicionar evento</button><p class="ax-tip">Os blocos não permitem escrever JavaScript. No modo Scripts, o editor visual de blocos fica indisponível.</p>';
  }
  function change() {
    if(!context) return;
    compileAll(context.project);
    context.onChange?.();
  }
  document.addEventListener('click',e=>{
    if(!active||!context)return;
    const b=e.target.closest('#axBlocks button');if(!b)return;
    const rules=(context.target||context.project).blocks||[];
    if(b.id==='axAddEvent')rules.push({id:uid(),event:'always',value:'',actions:[{op:'moveX',value:120}]});
    if(b.hasAttribute('data-del-event'))rules.splice(+b.dataset.delEvent,1);
    if(b.hasAttribute('data-add-action'))rules[+b.dataset.addAction]?.actions.push({op:'moveX',value:120});
    if(b.hasAttribute('data-del-action')){const [i,j]=b.dataset.delAction.split(':').map(Number);rules[i]?.actions.splice(j,1);}
    if(b.hasAttribute('data-move')){const [i,j,d]=b.dataset.move.split(':').map(Number);const arr=rules[i]?.actions;if(arr&&j+d>=0&&j+d<arr.length){[arr[j],arr[j+d]]=[arr[j+d],arr[j]];}}
    change();render();
  });
  document.addEventListener('change',e=>{
    if(!active||!context||!e.target.closest('#axBlocks'))return;
    const el=e.target, i=Number(el.dataset.e),j=Number(el.dataset.a),rule=(context.target||context.project).blocks?.[i];
    if(!rule)return;
    if(Number.isInteger(j)&&el.dataset.a!==undefined){
      const a=rule.actions[j];if(!a)return;
      a[el.dataset.key]=el.value;
      if(el.dataset.key==='op')a.value=(actionDefs[el.value]||actionDefs.moveX)[2];
    }else{
      rule[el.dataset.key]=el.value;
      if(el.dataset.key==='event')rule.value=(eventInput[el.value]||['',''])[1];
    }
    change();render();
  });
  window.AurenixBlocks={compile,compileAll,toggle,eventDefs,actionDefs};
})();