/* Aurenix Engine • academia interativa (aulas opt-in). */
(function(w){
'use strict';
const s=(target,help,event='click',verify='',tab='')=>({target,help,event,verify,tab});
const courses=[];
const add=(id,group,title,track,steps,desc='')=>courses.push({id,group,title,track,steps,desc});
/* Cada trilha usa um único projeto de treinamento persistente, separado dos jogos pessoais. */
add('primeiro-projeto','Primeiros passos','Criar um projeto do zero','2d',[
 s('#newProjectBtn','Abra a criação de projetos. Aqui ficam seus jogos locais.','click','','projects'),
 s('#newProgrammingChoice','Escolha Blocos (mais fácil) ou Scripts JavaScript. A linguagem é definida por projeto.','change'),
 s('[data-template="platformer"]','Selecione Plataforma 2D: já vem com jogador, chão e física. Existem também modelos 3D, pixel/top-down e cenas vazias.'),
 s('#projectName','Dê um nome ao seu jogo de treinamento.','change'),
 s('#saveBtn','Salve para manter o projeto no aparelho.')
],'Entenda modos, modelos iniciais e programação ao criar um jogo.');
add('navegacao','Primeiros passos','Conhecer o editor 2D','2d',[
 s('#mode2d','Veja que o modo 2D é o editor de objetos planos.'),
 s('#addObjectBtn','Abra o catálogo de objetos.','click','','objects'),
 s('[data-newobject="circle"]','Acrescente um círculo à cena.'),
 s('#playBtn','Execute seu jogo em uma área isolada.'),
 s('#stopBtn','Saia do teste para voltar a editar.')
],'Veja os painéis e teste suas mudanças.');
add('salvamento','Primeiros passos','Salvar e proteger o trabalho','2d',[
 s('#projectName','Digite um nome diferente e confirme.','change'),
 s('#saveBtn','Salve as alterações no aparelho.'),
 s('#topMoreBtn','Abra o menu para conhecer exportação e backup.'),
 s('#menuExportJson','Exporte um backup JSON para não depender só do armazenamento local.')
]);
add('objetos2d','Jogo 2D','Inserir formas e elementos','2d',[
 s('#addObjectBtn','Escolha Adicionar objeto.','click','','objects'),
 s('[data-newobject="rect"]','Crie um retângulo — ele pode virar plataforma, parede ou decoração.'),
 s('#objectList [data-id]','Selecione o objeto na hierarquia.')
]);
add('inspector2d','Jogo 2D','Editar posição, tamanho e cor','2d',[
 s('#objectList [data-id]','Escolha um objeto pela hierarquia.','click','','objects'),
 s('#inspector [data-prop="x"]','Troque a coordenada X e confirme a alteração.','change','','inspector'),
 s('#inspector [data-prop="color"]','Escolha uma cor para o objeto.','change','','inspector')
]);
add('colisao','Jogo 2D','Colisões e física','2d',[
 s('#objectList [data-id]','Selecione uma forma.','click','','objects'),
 s('#inspector [data-prop="solid"]','Ative ou desative a colisão sólida.','change','','inspector'),
 s('#inspector [data-prop="physics"]','Explore a física da forma.','change','','inspector')
]);
add('camera2d','Jogo 2D','Mover câmera e zoom','2d',[
 s('#zoomInBtn','Aproxime o enquadramento.'),
 s('#zoomOutBtn','Afaste o enquadramento.'),
 s('#resetCameraBtn','Centralize a câmera.')
]);
add('grade','Jogo 2D','Grade e encaixe','2d',[
 s('#gridBtn','Mostre ou oculte a grade.'),
 s('#snapBtn','Ative ou desative o encaixe para posicionar com precisão.')
]);
add('duplicar','Jogo 2D','Duplicar objetos','2d',[
 s('#objectList [data-id]','Selecione o objeto que deseja copiar.','click','','objects'),
 s('#axQuickDuplicate','Duplique sem precisar recriá-lo.','click','','objects')
]);
add('componentes','Jogo 2D','Comportamentos sem código','2d',[
 s('#objectList [data-id]','Selecione um objeto.','click','','objects'),
 s('#axQuickComponents','Abra Componentes para dar comportamento à forma.','click','','objects'),
 s('#ax08NewComponent','Escolha um comportamento, como girar, perseguir ou coletar.','change','','components'),
 s('#axComponents [data-ax08="add"]','Adicione o componente selecionado.','click','','components')
]);
add('codigo','Jogo 2D','Programação em JavaScript','2d',[
 s('[data-tab="code"]','Abra a aba Código para ver scripts.','click','','objects'),
 s('#scriptEditor','Escreva, por exemplo: self.rotation += dt * 50;','input','','code'),
 s('#applyScriptBtn','Aplique o código ao objeto selecionado.','click','','code')
],'Para projetos do tipo Scripts.');
add('blocos','Jogo 2D','Programação visual em blocos','2d',[
 s('[data-tab="code"]','Abra Código — em projetos com programação Blocos, aparece o editor visual.','click','','objects'),
 s('#axAddEvent','Adicione um evento (disponível em projetos do tipo Blocos).','click','','code')
],'Crie seu primeiro evento sem digitar JS.');
add('cenas','Jogo 2D','Criar uma segunda fase','2d',[
 s('[data-tab="scenes"]','Abra Cenas.','click','','objects'),
 s('#axScenes [data-action="newScene"]','Crie a segunda cena do jogo.','click','','scenes')
]);
add('mapa2d','Jogo 2D','Pintar mapa com tiles','2d',[
 s('[data-tab="tiles"]','Abra o editor de mapa.','click','','objects'),
 s('#axTileColor','Escolha a cor do terreno.','change','','tiles'),
 s('#viewport','Pinte um tile na cena para construir seu mapa.','pointerup','','tiles')
]);
add('personagem2d','Jogo 2D','Controlar um personagem','2d',[
 s('#objectList [data-id]','Selecione um personagem da cena.','click','','objects'),
 s('#inspector [data-prop="speed"]','Ajuste a velocidade do personagem.','change','','inspector'),
 s('#playBtn','Teste como o personagem se move.')
]);
add('hud','Jogo 2D','HUD e controles mobile','2d',[
 s('[data-tab="gameSettings"]','Abra as configurações do jogo.','click','','objects'),
 s('#axGameSettings input, #axGameSettings select','Ajuste um parâmetro de controle, câmera ou interface.','change','','gameSettings')
]);
add('audio','Jogo 2D','Sons e efeitos','2d',[
 s('[data-tab="audio"]','Abra o painel de áudio.','click','','objects'),
 s('#audioPanel button','Explore um comando de áudio.','click','','audio')
]);
add('assets','Jogo 2D','Imagens e arquivos','2d',[
 s('[data-tab="assets"]','Abra o gerenciador de arquivos.','click','','objects'),
 s('#assetPicker','Selecione uma imagem ou áudio para importar.','change','','assets')
]);
add('prefabs','Jogo 2D','Salvar um objeto reutilizável','2d',[
 s('#objectList [data-id]','Selecione um objeto.','click','','objects'),
 s('[data-tab="prefabs"]','Abra Prefabs.','click','','objects'),
 s('#axPrefabs [data-action="savePrefab"]','Grave o objeto para reutilizá-lo.','click','','prefabs')
]);
add('animacao2d','Animação 2D','Criar animação por keyframes','2d',[
 s('#objectList [data-id]','Selecione o objeto que vai animar.','click','','objects'),
 s('[data-tab="animation"]','Abra a timeline de animação.','click','','objects'),
 s('#axAnimations [data-action="addClip"]','Crie um novo clipe de animação.','click','','animation'),
 s('#axKeyTime','Escolha um instante para o quadro-chave.','change','','animation'),
 s('#axAnimations [data-action="captureKey"]','Capture a pose do objeto neste instante.','click','','animation'),
 s('#axAnimations [data-action="playPreview"]','Veja a animação rodando.','click','','animation')
]);
add('animacao2d-loop','Animação 2D','Loop e velocidade','2d',[
 s('[data-tab="animation"]','Abra a timeline.','click','','objects'),
 s('#axClipLoop','Ative ou desative a repetição.','change','','animation'),
 s('#axClipSpeed','Troque a velocidade.','change','','animation'),
 s('#axAnimations [data-action="playPreview"]','Veja o efeito das mudanças.','click','','animation')
]);
add('publicar','Publicar','Backup e exportação do jogo','2d',[
 s('#topMoreBtn','Abra o menu de exportação.'),
 s('#menuExportJson','Salve um backup JSON do projeto.')
]);
add('exportar-html','Publicar','Exportar jogo HTML5','2d',[
 s('#topMoreBtn','Abra o menu de ferramentas.'),
 s('#menuExportGame','Exporte um ZIP HTML5 para testar ou publicar seu jogo.')
]);
add('exportar-apk','Publicar','Preparar APK do seu jogo','2d',[
 s('#topMoreBtn','Abra o menu de exportação.'),
 s('#menuExportApk','Gere o template Android: a compilação do APK acontece posteriormente no GitHub.')
]);
add('projeto3d','Jogo 3D','Explorar a primeira cena 3D','3d',[
 s('#mode3d','Confira que você está em modo tridimensional.'),
 s('#resetCameraBtn','Centralize a câmera.'),
 s('#playBtn','Rode a cena e conheça a movimentação 3D.'),
 s('#stopBtn','Volte ao editor.')
]);
add('objetos3d','Jogo 3D','Cubos, esferas e obstáculos','3d',[
 s('#addObjectBtn','Abra os objetos tridimensionais.','click','','objects'),
 s('[data-newobject="cube"]','Crie um cubo e adicione-o à cena.'),
 s('#objectList [data-id]','Selecione o objeto pela hierarquia.','click','','objects')
]);
add('transform3d','Jogo 3D','Mover e redimensionar em XYZ','3d',[
 s('#objectList [data-id]','Selecione o objeto 3D.','click','','objects'),
 s('#inspector [data-prop="z"]','Altere a profundidade Z.','change','','inspector'),
 s('#inspector [data-prop="w"]','Ajuste o tamanho do objeto.','change','','inspector')
]);
add('rotacionar3d','Jogo 3D','Girar objetos 3D','3d',[
 s('#objectList [data-id]','Selecione uma peça na hierarquia.','click','','objects'),
 s('#inspector [data-prop="ry"]','Mude o ângulo de rotação no eixo Y.','change','','inspector'),
 s('[data-tool="rotate"]','Ative o gizmo de rotação 3D.')
]);
add('materiais3d','Jogo 3D','Cor e transparência 3D','3d',[
 s('#objectList [data-id]','Selecione um objeto.','click','','objects'),
 s('#inspector [data-prop="color"]','Mude sua cor.','change','','inspector'),
 s('#inspector [data-prop="opacity"]','Teste a transparência de 0 a 1.','change','','inspector')
]);
add('gizmo3d','Jogo 3D','Ferramentas de manipulação','3d',[
 s('[data-tool="translate"]','Ative Mover XYZ para usar os eixos.'),
 s('[data-tool="rotate"]','Troque para Girar.'),
 s('[data-tool="resize"]','Troque para Escalar.')
]);
add('componente3d','Jogo 3D','Adicionar comportamento em 3D','3d',[
 s('#objectList [data-id]','Selecione uma forma 3D.','click','','objects'),
 s('[data-tab="components"]','Abra os Componentes.','click','','objects'),
 s('#axComponents [data-ax08="add"]','Aplique o comportamento selecionado.','click','','components')
]);
add('jogador3d','Jogo 3D','Jogador 3D e movimentação','3d',[
 s('#objectList [data-id]','Selecione um objeto da cena.','click','','objects'),
 s('#inspector [data-prop="speed"]','Se for jogador, ajuste a velocidade.','change','','inspector'),
 s('#playBtn','Teste a cena 3D.')
]);
add('camera3d','Jogo 3D','Enquadrar objetos 3D','3d',[
 s('#objectList [data-id]','Selecione o objeto a focar.','click','','objects'),
 s('#axQuickFocus','Centralize a câmera neste objeto.','click','','objects'),
 s('#zoomOutBtn','Afaste a câmera.')
]);
/* Pixel Studio é um documento próprio. Um mesmo desenho de laboratório persiste entre aulas. */
add('pixel-inicio','Pixel Art','Criar o primeiro sprite','pixel',[
 s('#artName','Nomeie o sprite de treinamento.','change'),
 s('#tools [data-tool="pen"]','Selecione a ferramenta Lápis.'),
 s('#canvas','Desenhe pixels no quadro com o dedo ou mouse.','pointerup','',''),
 s('#save','Salve a arte no aparelho.')
]);
add('pixel-formas','Pixel Art','Formas e preenchimento','pixel',[
 s('#tools [data-tool="rect"]','Escolha Retângulo.'),
 s('#canvas','Arraste para desenhar um retângulo.','pointerup'),
 s('#tools [data-tool="fill"]','Escolha Balde.'),
 s('#canvas','Preencha uma região.','pointerup')
]);
add('pixel-cores','Pixel Art','Paleta de cores','pixel',[
 s('#color','Selecione uma nova cor.','change'),
 s('#addPalette','Adicione-a à sua paleta.'),
 s('#tools [data-tool="pick"]','Use o conta-gotas para copiar uma cor do desenho.')
]);
add('pixel-camadas','Pixel Art','Camadas e profundidade','pixel',[
 s('#addLayer','Crie outra camada.'),
 s('#dupLayer','Duplique a camada selecionada.'),
 s('#layers button','Selecione uma camada na lista.')
]);
add('pixel-simetria','Pixel Art','Espelhamento e simetria','pixel',[
 s('#mirrorX','Ative o espelho horizontal.','change'),
 s('#tools [data-tool="pen"]','Pegue o Lápis.'),
 s('#canvas','Faça um desenho simétrico.','pointerup')
]);
add('pixel-tamanho','Pixel Art','Resolução, grade e zoom','pixel',[
 s('#size','Escolha uma resolução de sprite.','change'),
 s('#grid','Oculte ou mostre a grade.'),
 s('#zoomIn','Aproxime a arte.')
]);
add('pixel-frames','Pixel Art','Criar quadros de animação','pixel',[
 s('#addFrame','Acrescente um quadro de animação.'),
 s('#dupFrame','Duplique um quadro para manter o desenho anterior.'),
 s('#frames button','Selecione um quadro na timeline.')
]);
add('pixel-onion','Pixel Art','Onion skin e FPS','pixel',[
 s('#onion','Ative onion skin para ver quadros anteriores.'),
 s('#fps','Ajuste a velocidade dos quadros por segundo.','change'),
 s('#play','Reproduza sua animação.')
]);
add('pixel-exportar','Pixel Art','PNG, spritesheet e projeto','pixel',[
 s('#save','Salve o desenho primeiro.'),
 s('#sheet','Gere uma spritesheet com os quadros.'),
 s('#exportPNG','Exporte uma imagem PNG.')
]);
add('pixel-edicao','Pixel Art','Desfazer, copiar e girar','pixel',[
 s('#tools [data-tool="pen"]','Selecione o Lápis.'),
 s('#canvas','Faça alguma marca no desenho.','pointerup'),
 s('#undo','Desfaça o último traço.'),
 s('#rotate','Gire o desenho em 90 graus.')
]);
/* Model Studio: TODAS as aulas reutilizam "Tutorial • Animações 3D". */
add('model-inicio','Modelagem 3D','Criar personagem quadradinho','model',[
 s('#preset','Escolha um avatar ou uma criatura de base.','change'),
 s('#newPreset','Crie o personagem para treino.'),
 s('#addPart','Acrescente uma peça articulada.'),
 s('#save','Salve o modelo.')
]);
add('model-pecas','Modelagem 3D','Selecionar e editar peças','model',[
 s('#openParts','Abra o painel de peças (mobile).'),
 s('#tree [data-part]','Escolha uma peça na hierarquia.'),
 s('#openProps','Abra o inspetor (mobile).'),
 s('#inspector [data-field="size0"]','Mude a largura da peça.','change')
]);
add('model-acessorios','Modelagem 3D','Cabelo, óculos e acessórios','model',[
 s('#openParts','Abra o painel Peças.'),
 s('[data-kit="hair"]','Adicione cabelo estilizado.'),
 s('[data-kit="glasses"]','Coloque óculos no personagem.'),
 s('#save','Salve seu novo visual.')
]);
add('model-espelho','Modelagem 3D','Espelhar partes do corpo','model',[
 s('#openParts','Abra Peças.'),
 s('#tree [data-part]','Escolha uma peça.'),
 s('#mirrorPart','Faça uma peça espelhada.')
]);
add('model-tools','Modelagem 3D','Mover, girar e escalar','model',[
 s('[data-tool14="select"]','Ative Selecionar.'),
 s('[data-tool14="move"]','Ative Mover.'),
 s('[data-tool14="rotate"]','Ative Girar.'),
 s('[data-tool14="scale"]','Ative Escalar.')
]);
add('model-rosto','Animação 3D','Criar e editar expressões faciais','model',[
 s('#openParts','Abra o painel de peças.'),
 s('#addFace','Prepare sobrancelhas e elementos do rosto.'),
 s('[data-expression="happy"]','Selecione uma expressão feliz.'),
 s('[data-expression="angry"]','Agora transforme a emoção em raiva.')
]);
add('olhos-piscar','Animação 3D','Animar olhos: piscar','model',[
 s('#newClip','Crie uma animação de piscar.'),
 s('#openParts','Abra o menu de expressões.'),
 s('[data-expression="blink"]','Feche os olhos usando a expressão Piscar.'),
 s('#capture','Grave o primeiro keyframe com os olhos fechados.'),
 s('#scrub','Arraste o tempo para outra posição.','input'),
 s('[data-expression="neutral"]','Abra os olhos com a expressão Neutro.'),
 s('#capture','Grave o segundo quadro-chave com os olhos abertos.'),
 s('#play','Veja os olhos piscando.')
]);
add('olhos-piscadela','Animação 3D','Animar olhos: piscadela','model',[
 s('#newClip','Abra uma animação para piscadela.'),
 s('#openParts','Abra as expressões.'),
 s('[data-expression="wink"]','Escolha Piscadela.'),
 s('#capture','Capture a pose assimétrica dos olhos.'),
 s('#play','Reproduza a animação de rosto.')
]);
add('sobrancelhas','Animação 3D','Sobrancelhas e emoções','model',[
 s('#openParts','Abra expressões faciais.'),
 s('[data-expression="suspicious"]','Teste uma sobrancelha levantada.'),
 s('[data-expression="surprised"]','Agora faça uma expressão de surpresa.'),
 s('[data-expression="sad"]','Explore a expressão de tristeza.')
]);
add('falar','Animação 3D','Animar boca e fala','model',[
 s('#openParts','Abra a categoria Rosto.'),
 s('[data-auto="talk"]','Crie a animação de boca falando.'),
 s('#play','Reproduza para ver o movimento.')
]);
add('animacao-corpo','Animação 3D','Keyframes de corpo e articulações','model',[
 s('#newClip','Crie uma animação manual.'),
 s('#openParts','Abra a hierarquia de peças.'),
 s('#tree [data-part]','Selecione uma peça articulada.'),
 s('#openProps','Abra as propriedades.'),
 s('#inspector [data-field="rotation0"]','Gire uma articulação no eixo X.','change'),
 s('#capture','Grave esta pose na timeline.'),
 s('#play','Reproduza a animação.')
]);
add('animacao-andar','Animação 3D','Criar animação de caminhada','model',[
 s('#openParts','Abra o painel de animações prontas.'),
 s('[data-auto="walk"]','Gere o movimento de andar.'),
 s('#play','Veja a caminhada.')
]);
add('animacao-correr','Animação 3D','Criar animação de corrida','model',[
 s('#openParts','Abra animações prontas.'),
 s('[data-auto="run"]','Crie um ciclo de corrida.'),
 s('#play','Reproduza a corrida.')
]);
add('animacao-atacar','Animação 3D','Ataque e impacto','model',[
 s('#openParts','Abra os movimentos prontos.'),
 s('[data-auto="attack"]','Gere a ação de ataque.'),
 s('#play','Veja como o golpe termina.')
]);
add('animacao-pular','Animação 3D','Pulo e aterrissagem','model',[
 s('#openParts','Abra os movimentos.'),
 s('[data-auto="jump"]','Gere a sequência de salto.'),
 s('#play','Visualize o salto.')
]);
add('animacao-idle','Animação 3D','Respiração e repouso','model',[
 s('#openParts','Abra as animações.'),
 s('[data-auto="idle"]','Crie uma respiração cíclica.'),
 s('#play','Reproduza o idle.')
]);
add('animacao-dancar','Animação 3D','Dançar e movimentos expressivos','model',[
 s('#openParts','Abra a lista de movimentos.'),
 s('[data-auto="dance"]','Gere a dança.'),
 s('#play','Assista à dança.')
]);
add('animacao-dano','Animação 3D','Reação ao receber dano','model',[
 s('#openParts','Abra os movimentos.'),
 s('[data-auto="hit"]','Gere a reação de dano.'),
 s('#play','Veja a reação.')
]);
add('animacao-timeline','Animação 3D','Timeline e quadros-chave','model',[
 s('#newClip','Crie uma timeline manual.'),
 s('#capture','Grave a pose no tempo inicial.'),
 s('#scrub','Mova o marcador de tempo.','input'),
 s('#capture','Grave uma segunda pose.'),
 s('#play','Reproduza os keyframes.')
]);
add('modelo-exportar','Modelagem 3D','Salvar e exportar personagem','model',[
 s('#save','Salve o personagem de laboratório.'),
 s('#export','Exporte o arquivo do modelo (.aurenix3d).')
]);
w.AurenixCourses=courses;
})(window);