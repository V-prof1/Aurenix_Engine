# Aurenix Engine — Alpha 0.3 🕹️
Engine experimental mobile-first para criar jogos **2D, pixel art e 3D** com editor visual, scripts JS, blocos de eventos, teste HTML5 e exportação para Android. Sem login, IA, mensalidades ou APIs pagas.

## Abra no seu celular
No GitHub, ative **Settings → Pages → Deploy from a branch → main / (root)** e abra o endereço gerado. O arquivo **index.html** é o editor principal. **studio.html** é a versão modular com o mesmo editor, adequada a desenvolvimento. O site também pode ser instalado como PWA.

## Correções da Alpha 0.3
- Arraste qualquer uma das seis alças (+/- X, +/- Z, +/- Y) de um objeto selecionado para mudar dimensões sem digitar números.
- A face oposta fica fixa; objetos rotacionados usam seus eixos locais.
- Interface de celular horizontal usa palco em tela cheia e painéis acessados pela barra inferior.
- Em Android, o plugin StatusBar tenta ocultar a barra do sistema para não bloquear os botões. Há fallback de área segura se não conseguir.
- IMPORTANTE: a assinatura debug do APK Alpha 0.2 foi gerada por um runner descartável do GitHub. Não foi preservada, portanto a Alpha 0.3 provavelmente **não poderá atualizar a 0.2 diretamente**; faça backup dos projetos ANTES de desinstalar. Para atualizações futuras sem desinstalar, configure uma chave de assinatura persistente em GitHub Actions Secrets (nunca publique a chave).

## Atualização Alpha 0.4 — Menu inicial, objetos e Pixel Studio
- Ao abrir o aplicativo, aparece uma tela inicial com biblioteca de jogos salvos, busca, filtros, duplicar, renomear, excluir, fazer backup e continuar no editor.
- **Seleção persistente:** toque em um objeto para selecioná-lo. Ele fica selecionado mesmo que toque no vazio. Toque novamente sem arrastar para desmarcar.
- **🔒 Bloqueio na cena:** um objeto bloqueado não responde a toque de seleção/manipulação na cena. Ainda pode ser selecionado pela hierarquia Objetos e desbloqueado no inspetor/lista.
- **⚓ Ancoragem:** objetos ancorados não são movidos pelo sistema de física/gravid​ade nem pelos controles de jogador; scripts podem modificar posições explicitamente. Independente de bloquear edição.
- **Pixel Studio:** `pixelstudio.html` possui desenho por toque, camadas, quadro-a-quadro, onion skin, formas, balde, seleção/cópia/colar, paleta, transparência, espelhamento, zoom, importação PNG e exportação PNG, JSON e spritesheet.
- Os desenhos ficam salvos em IndexedDB do aplicativo; `Guardar PNG/Projeto` tenta Documents/Aurenix no Android com plugin grátis, e oferece compartilhar/baixar como alternativa.
- **Assinatura Android:** o APK 0.3 foi assinado com chave de debug temporária do runner. A 0.4 não pode atualizar a 0.3 por cima sem a chave privada original. Este APK usa o identificador `com.aurenix.engine.alpha04` e instala ao lado do 0.3. Exporte os projetos do 0.3 em JSON e importe no 0.4. Não desinstale o 0.3 até confirmar seus backups.

## Criando jogos
1. Toque em **⋮ → Novo projeto** (ou **Projetos → Novo projeto**).
2. **Escolha Blocos ou Scripts ANTES** de tocar no modelo. A escolha fica salva com o projeto e não pode ser alterada no editor.
3. Escolha 2D plataforma, RPG top-down, 3D, 2D vazio ou 3D vazio.
4. Edite objetos no palco/hierarquia, ajuste propriedades no inspetor, desenhe sprites na aba Pixel, importe imagens ou áudio em Arquivos.
5. Em **Blocos**, escolha um objeto/cena na aba Código (renomeada Blocos), adicione eventos e ações. Em **Scripts**, use o código JavaScript e a API.
6. Toque em **▶ Testar**. Salve em IndexedDB e use **⋮ → Exportar projeto (.json)** como backup.
7. Exporte o jogo HTML5 ZIP ou template para gerar APK.

### Blocos disponíveis
- Eventos: sempre, início, tecla, botão de ação, botão de pular, colisão 2D, temporizador.
- Ações: movimento e posição X/Y/Z, rotação, largura/altura, velocidade, cores de objetos e cena, gravidade, mostrar/esconder, tocar tom, alterar texto, criar/apagar objeto e voltar à origem.
- O motor **compila blocos internamente para JavaScript** para executar no runtime HTML5. O editor não expõe a edição desse código em projetos Blocos.
- Eventos e ações podem ser adicionados, reordenados e excluídos com botões de toque. Esta versão usa pilhas de eventos, não conexões livres tipo Scratch; não há funções, variáveis personalizadas, loops aninhados ou debugger visual.
- Um projeto escolhido como Scripts **não pode acessar blocos**; se escolher Blocos, não pode editar scripts via interface. JSONs antigos são tratados como projetos Scripts.

## Jogos HTML5 e outras linguagens
É possível importar **HTML5** (.html/.zip) e editar seus arquivos de texto. Projetos C++, Rust, C#, Lua, Python ou Godot precisam **estar previamente exportados para HTML5/WebAssembly**: a engine não compila essas linguagens nem importa seus formatos originais. Algumas exportações WebAssembly exigem servidor e não rodarão no iframe interno.

## APK da engine
Em **Actions → APK da Aurenix Engine → Run workflow**, o GitHub Actions instala Node 22, Java 21, Android SDK, Capacitor 8 e compila um **app-debug.apk**. Baixe o artifact **Aurenix-Engine-APK-debug**. O processo precisa de internet no runner e respeita cotas do GitHub Actions. **A compilação ainda deve ser verificada no runner**.

## APK dos jogos
No editor, **⋮ → Exportar template de APK** cria um ZIP com os arquivos HTML5 e o próprio workflow de APK do jogo. Publique em um repositório GitHub do jogo e rode a action.
Para usar este mesmo repositório, exporte o ZIP HTML5 do jogo e substitua os arquivos em **game-web/**, então execute **Actions → APK do jogo (game-web)**. Antes de distribuir, altere o appId `com.aurenix.meujogo`.

APKs debug **não são builds release assinados para publicação**. Nunca envie chaves privadas para um repositório público.

## Arquivos
- `index.html`: HTML standalone da interface + extensão externa de blocos.
- `studio.html`: editor equivalente com arquivos JS/CSS separados.
- `js/runtime.js`: Canvas/WebGL, controles e física simples.
- `js/editor.js`: editor modular com integração de programação.
- `js/blocks.js`: compilador e UI de blocos, sem libs de terceiros.
- `js/editor-patch.js`: camada de compatibilidade para `index.html` standalone.
- `js/zip.js`: criador e leitor ZIP.
- `game-web/`: demo HTML5 e alvo da action de APK de jogo.
- `.github/workflows/`: APK da engine, APK de jogo e testes.

## Limites da Alpha 0.2
**Ainda não é uma substituta do Godot/Unity.** Faltam animações com timeline, multiplayer, sistema complexo de tileset, partículas avançadas, editor de shaders, importação glTF/FBX e exportação release assinada. O motor 3D atual tem geometrias primitivas e física simplificada. Colisões dos blocos são 2D. Edição local depende do armazenamento do navegador; exporte backups. Execute apenas código de projetos confiáveis.

**Licença e custos:** todo o editor é gratuito. Capacitor e GitHub Actions têm licenças e políticas próprias; GitHub Actions pode ter limites de uso conforme sua conta. Não é exigida IA ou API paga.

## Assinatura e atualização real
Uma atualização Android precisa ter o mesmo **appId e certificado de assinatura**. A chave privada do APK 0.3 não foi preservada e não pode ser extraída do APK. A Alpha 0.4 instala lado a lado por segurança. Para lançar atualizações sobre a mesma instalação, configure uma chave de assinatura duradoura e privada nas GitHub Actions Secrets. Nunca publique a chave em commits ou artifacts públicos.

### Salvamento e backup no Android
A partir desta versão, o botão de exportar JSON, ZIP e outros arquivos tenta usar a pasta pública Documents/Aurenix pelo plugin Filesystem. Se o dispositivo não permitir, o aplicativo tenta abrir a folha de compartilhamento do Android para escolher onde salvar. Confirme a existência do arquivo no aplicativo Arquivos antes de desinstalar versões antigas.

## Alpha 0.5 — Pixel Studio, temas, navegação Android e áudio
- Pixel Studio: o canvas passou a ficar dentro da área visível, sem encobrir os botões; há atalhos para Ferramentas, Quadros, Camadas e Cores, e rolagem quando o celular está em paisagem.
- Android: o plugin @capacitor/app intercepta Voltar para fechar primeiramente a tela de teste e janelas; o segundo Voltar na tela inicial minimiza o aplicativo, sem fechar acidentalmente. Um botão de sair aparece na própria tela de teste.
- Aparência: 17 pares de cores primária/secundária, seleção manual e controles em tamanho compacto, confortável ou grande, persistidos no aparelho. Acesse por 🎨 na tela inicial/editor/Pixel Studio.
- Áudio: aba ♫ Estúdio de áudio; importação MP3/WAV/OGG, prévias, volumes de música/efeitos/geral, loop, velocidade, efeitos WAV gerados localmente, designação de música de fundo e sons de Pulo/Ação, e `api.playSound('nomeDoArquivo')` em JavaScript. No Android, o primeiro toque libera o som para jogos.
- Sem serviços pagos nem assistente IA. Os arquivos de som devem ser fornecidos pelo criador ou gerados localmente. Não é uma DAW multitrilha, nem possui equalização profissional.
- **Proteção de dados:** APK 0.5 usa `com.aurenix.engine.alpha05`, e por isso instala ao lado das versões 0.3/0.4. Não é possível atualizar por cima das versões antigas porque as chaves privadas debug anteriores não foram preservadas pelo GitHub Actions. Exporte os projetos JSON e confirme seus backups antes de desinstalar a versão antiga.

## Alpha 0.6 — ajustes de usabilidade reportados em Android
- Painel de paleta do Pixel Studio: grade responsiva com células de tamanho adequado ao toque, sem ultrapassar a coluna.
- Editor 3D: controles Selecionar, Câmera, Escala, Grade e Encaixar possuem textos visíveis e botões maiores. A fileira de ferramentas rola horizontalmente em telas estreitas.
- Indicador 3D XYZ: substituído por widget com os três eixos X vermelho, Y verde e Z azul, que acompanha a orientação da câmera. É possível tocar em cada eixo para alinhar a câmera.
- Esta alpha usa `com.aurenix.engine.alpha06` para instalar separadamente e evitar perder projetos das versões anteriores, pois as assinaturas debug não foram preservadas. Exporte JSON para migrar.

## Alpha 0.7 — Sistema completo de cenas, tiles, animação e prefabs

**Novos sistemas funcionais e gratuitos**
- **🎬 Cenas:** crie até 50 cenas por projeto, troque, duplique, renomeie, reordene e exclua. Cada uma armazena seus próprios objetos, scripts/blocos, cores de fundo, física e tiles. O tipo 2D/3D e a programação escolhida no projeto são preservados.
- **🧱 Mapa por tiles (2D e Pixel):** pincel/borracha, 12 cores rápidas, cor personalizada, tamanho 8–128 px, até 10 mil tiles e opção *sólido*. Tiles sólidos bloqueiam o jogador nos modos top-down e plataforma. Os tiles aparecem no editor, no HTML5 e no APK exportado.
- **🎞️ Animações por keyframes (2D e 3D):** cada objeto pode ter até 24 clipes; capture poses e configure tempo, duração, loop, autoplay e prévia. Anima posição, rotação, escala/tamanho e opacidade, interpolando valores. Execute via `api.playAnimation(self,'Nome')` e `api.stopAnimation(self)`.
- **▣ Prefabs:** salve objetos reutilizáveis no dispositivo e instancie em outros projetos compatíveis com o mesmo modo Blocos/Scripts.
- **📊 Contador FPS:** ative no menu ⋮ e teste o desempenho dentro do jogo.
- **Blocos:** ações para ir à próxima cena, abrir cena pelo nome, iniciar/parar animação e reproduzir som de arquivo.
- **Script:** `api.loadScene('Cena 2')`, `api.nextScene()`, `api.sceneName`, `api.getTile(x,y)`, `api.setTile(x,y,cor,solido)`, `api.playAnimation(self,'Nome')` e `api.stopAnimation(self)`.
- **Mobile:** abas de Cenas, Mapa, Animação e Prefabs também na navegação inferior; ferramentas com áreas grandes para toque e painéis adaptados ao celular.

**Como usar**
1. Abra um projeto e toque em **🎬 Cenas** para criar novos níveis. Os objetos da cena atual são preservados ao trocar.
2. Em 2D, toque em **Mapa → ▦ Pintar mapa**. Escolha cor e colisão e arraste sobre a cena.
3. Selecione um objeto, abra **🎞️ Animar**, crie o clipe, ajuste a posição ou tamanho, capture keyframes em tempos diferentes e teste com ▶.
4. Selecione um objeto e abra **Prefabs → Salvar objeto** para reutilizar o modelo.
5. No menu ⋮ ative **FPS durante teste** para conferir desempenho.

**Limites desta alpha:** sistema 3D ainda usa geometrias básicas, não há importação glTF/FBX, engine de shaders profissionais, networking multiplayer ou simulação física avançada. Tiles são células coloridas (spritesheet e autotile ainda não implementados). A prévia de animações não é uma timeline multifaixa.

**Instalação:** o pacote 0.7 é `com.aurenix.engine.alpha07`, portanto instala **ao lado da 0.6**, sem apagá-la. Isso é necessário enquanto não existe uma chave privada de assinatura persistente. Transfira projetos por backup JSON antes de remover a versão antiga.

## Alpha 0.8 — Componentes, 3D, gameplay e experiência mobile

Atualização focada no editor móvel, em recursos que funcionam offline e em mecânicas que antes exigiam escrever código.

### Novidades
- **Componentes sem script:** girar, flutuar, patrulhar, perseguir o jogador, coletável com pontuação/respawn, dano, portal entre cenas, impulso, partículas 2D e checkpoints. Compatível com projetos de Blocos e Scripts.
- **Vida e HUD:** barra de vida, pontos, mensagens de jogo, renascimento e checkpoint. Configure em 🎮 Jogo. Suporte a zoom inicial, suavização da câmera, nitidez pixel, tamanho e transparência dos botões mobile.
- **Script API:** `api.addScore(n)`, `api.score()`, `api.getHealth()`, `api.setHealth(n)`, `api.damage(n)`, `api.heal(n)`, `api.message(t)`, `api.cameraShake(n)`, `api.getByTag(t)`, `api.getAll(t)`, `api.distance(a,b)`, `api.overlap(a,b)`, `api.saveData(k,v)`, `api.loadData(k,padrão)`, `api.emitParticles(x,y,n,cor)`, `api.respawn()`. O armazenamento `saveData/loadData` depende de permissões da WebView e pode não persistir em prévias isoladas.
- **Modelagem 3D:** mais primitivas — pirâmide, cone, toro e cápsula. Importação de arquivos OBJ leves, renderização WebGL com fallback por canvas quando suportado. Triângulos limitados para proteger celulares. Materiais PBR, glTF, rigging, skeletal animation e FBX ainda não estão implementados.
- **Mapas 2D:** tiles podem utilizar imagens locais importadas em vez de somente cores.
- **Pixel Studio:** desenhos salvos na instalação atual podem ser convertidos em PNG e importados diretamente nos Arquivos da engine.
- **Usabilidade:** central 🧰 Ferramentas com busca e botões grandes; pesquisa na lista de objetos e arquivos; atalhos para focar, duplicar e criar; inspector com tags/vida/opacidade, opções renomear/exportar arquivo, diagnóstico de sintaxe e melhor rolagem mobile.
- **Proteção de projetos:** troca de modo 2D ↔ Pixel preserva objetos e cenas existentes. Ainda há limitações ao trocar 2D ↔ 3D; exporte backups antes de fazer conversões.
- **Sem IA paga**, sem assinaturas e sem necessidade de conta.

### Como usar
1. Abra 🧰 **Ferramentas** na navegação inferior e procure qualquer função por nome.
2. Selecione um objeto → ⚡ **Componentes** → escolha um comportamento e toque em Adicionar.
3. Configure vida, pontuação e controles em **🎮 Jogo**.
4. Para um modelo 3D, importe um arquivo **.OBJ** em Arquivos e toque em ⬟ para colocá-lo na cena.
5. No Mapa 2D, use **Imagem do tile** e escolha uma imagem do projeto.
6. Em **Sprites salvos**, escolha um desenho previamente salvo no Pixel Studio.

### Limites / segurança
- A engine continua uma **Alpha** e não substitui Godot/Unity. A física e colisões ainda são simplificadas, e não há PBR, rigging, multiplayer ou compilação nativa de Python/C#/Lua.
- Projetos importados HTML5 seguem sendo executados isoladamente; código HTML5 externo não é transformado em nós editáveis.
- **A versão 0.8 instala ao lado da 0.7** porque as versões debug antigas não possuem uma chave de assinatura persistente. Exportar JSON e importar na nova instalação é o caminho seguro para migrar jogos; não desinstale versões antigas antes de verificar os backups.

## Alpha 0.9 — Edição 3D, timeline de animação e estabilidade Android

### Edição 3D por toque
- Novas ferramentas **Mover XYZ**, **Girar** e **Escalar** com alças coloridas e áreas de toque de 70px (35px de raio). A ferramenta Selecionar mantém as alças de escala para quem usava a interface anterior.
- Manipulação pelo eixo local, mantendo a face oposta fixa ao redimensionar. A opção Encaixar oferece incrementos de 0,25 unidades para tamanho e movimento e de 5° para rotação.
- O centro amarelo **XZ** permite deslocar objetos pelo chão. A opção Câmera permite orbitar a visão, e o gesto de pinça continua ajustando o zoom.
- Operações de manipulação são registradas uma única vez no histórico e podem ser desfeitas ou refeitas. Ponteiros presos são limpos ao sair da tela ou trocar de aplicativo.

### Animação por keyframes
- Timeline com controle de tempo por toque, marcadores de keyframes e ações **Reproduzir**, **Pausar** e **Restaurar**.
- Modos de interpolação: linear, suave, acelerar, desacelerar e quadros discretos; velocidade de reprodução de 0,25× a 3×.
- O motor de jogo HTML5 e o teste incorporado reproduzem velocidade e interpolação. Alterações temporárias de prévia não são gravadas inadvertidamente como posição de origem do objeto.
- Corrigida a navegação para as keyframes e o botão de exclusão, antes inacessíveis por um retorno prematuro no evento.

### Android e interfaces
- Novo módulo de adaptação ao `visualViewport`: calcula altura útil com o teclado virtual, melhora o foco em campos de formulário e atualiza o layout ao girar o aparelho.
- Barra de ferramentas 3D com alças legíveis, barra inferior rolável e painéis com rolagem independente. Botão Voltar fecha uma animação em prévia antes de sair do editor.
- Telas e projetos antigos permanecem compatíveis. Backups JSON continuam recomendados.

**Limitações e instalação:** não inclui rigging ou editor de esqueleto 3D, cinemática inversa ou física de corpos rígidos. O pacote `com.aurenix.engine.alpha09` instala ao lado das alphas anteriores porque a assinatura debug antiga não foi preservada. Exporte projetos antes de desinstalar qualquer versão.

## Alpha 0.10 — Publicação GitHub → APK diretamente do celular

Acesse **⋮ → 🐙 Publicar no GitHub e gerar APK** ou **🧰 Ferramentas → Gerar APK no GitHub**.

1. **Conecte seu GitHub**. A conexão por token já funciona: use um personal access token (preferencialmente fine-grained) com acesso apenas aos repositórios necessários. O token é mantido **somente na memória** da sessão; nunca é salvo em localStorage, IndexedDB, projetos, ZIP ou commits. Ao fechar o aplicativo, conecte-se novamente.
2. **Selecione repositório** da própria conta ou crie outro automaticamente, privado por padrão.
3. Escolha **nome, versão (1.0.0), orientação (auto/horizontal/vertical)** e ícone opcional de uma imagem do projeto.
4. Leia a confirmação e toque **Publicar e gerar APK**. Os arquivos do jogo são enviados a `www/`, com configuração Capacitor, workflow do GitHub Actions e scripts de compilação. O envio cria um commit na branch padrão do repositório.
5. Toque em **Verificar compilação**. Quando o GitHub Actions terminar, use o link do **APK direto (Releases)** ou o **ZIP de artefatos** (Actions), se a publicação em Releases não estiver disponível.

### Conexão GitHub e permissões
- **Modo pronto nesta Alpha:** token de acesso GitHub. Token clássico requer escopos `repo` e `workflow`; tokens fine-grained podem requerer `Contents: write`, `Workflows: write`, `Actions: read` e permissão de criação de repositórios. Token com seleção restrita a repositórios pode não conseguir criar repositórios novos.
- **OAuth Device Flow para login simplificado:** o código está preparado, mas a Aurenix precisa de **um OAuth App GitHub registrado pelo mantenedor**, com Device Flow ativado e seu **Client ID público** configurado em `js/github-oauth-config.js`. Não coloque Client Secret nesse arquivo. Sem isso, o botão de login GitHub fica desativado, mas a conexão por token permanece utilizável.
- Repositórios privados e GitHub Actions têm cotas/regras de acesso definidas pelo próprio GitHub. A Aurenix não cobra pelo serviço, mas não garante compilações ilimitadas.
- Na exportação para um repositório existente, os arquivos do jogo em `www/`, `package.json`, `capacitor.config.json`, `aurenix-export.json`, `scripts/configure_android.py`, `README-AURENIX.md` e `.github/workflows/aurenix-apk.yml` são atualizados. Prefira um repositório exclusivo.
- O workflow gera **APK debug** sem chave de assinatura permanente. Atualizações por cima da instalação antiga podem exigir uma configuração posterior de assinatura Android estável. Nunca envie keystores privados ao repositório.
- Para jogos HTML5 externos, arquivos e dependências remotas ou recursos que exijam servidor podem precisar de adaptações para funcionar offline no Android.

**Segurança:** toda autenticação usa HTTPS no GitHub. Os tokens nunca são escritos no Git do usuário. O fluxo de envio inclui confirmação e validação de caminhos. Se a publicação falhar, a cópia local do projeto Aurenix não é apagada. GitHub OAuth Client ID não é uma credencial secreta, mas precisa de registro oficial antes do login por dispositivo ficar ativo.
