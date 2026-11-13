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
