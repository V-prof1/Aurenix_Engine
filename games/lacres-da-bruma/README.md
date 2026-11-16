# 🏮 Lacres da Bruma — A Última Batida | V1.2.1

**Jogo original editável com o motor nativo da Aurenix Engine.** Preserva compatibilidade com os salvamentos locais da versão 1.0, quando o armazenamento da WebView/navegador permite.

> Quando o Grande Sino tocou 13 vezes, o mundo esqueceu seus nomes. Os lacres espalhados por Orval guardam as memórias que faltam.

## Como instalar e editar
1. Baixe `lacres-da-bruma.aurenix.json` desta pasta.
2. Na Aurenix Engine, toque em **Importar projeto** e escolha esse arquivo.
3. Abra o jogo e pressione **▶ Testar**.
4. Edite as quatro cenas, os cenários, as animações, os sprites ou o script principal. A lógica central é replicada no script de cada cena para que o motor reconheça eventos após mudar de área.
5. Para exportar para Android: **🐙 Publicar no GitHub e gerar APK**, preferencialmente usando um repositório do jogo separado.

## Controles (1.2.1)
- **Celular:** analógico esquerdo para movimentação, **analógico direito para mirar e atacar enquanto segura**, botão **✦** para interagir, **🌀** para esquivar.
- **Celular:** botões pequenos **❤️, 💥, 🛡️** no canto superior direito para usar consumíveis comprados na loja.
- **Teclado:** **WASD/setas** mover, **IJKL** escolher direção de ataque, **Espaço** golpear, **F** interagir, **Shift** esquiva, **1/2/3** consomem poção/bomba/escudo.
- Os ataques respeitam a direção do analógico direito mesmo enquanto o personagem anda numa direção diferente.

## Como gastar moedas e ecos
- **⚒ Oficina de Mira:** cinco melhorias permanentes (espada, velocidade, vida, sorte e mochila).
- **🛒 Bazar dos Perdidos:** poções de cura, bombas de área, proteção temporária, bússolas que mostram o baú mais próximo e chaves que garantem raridade Rara ou superior.
- **🔮 Mesa das Runas (ecos):** aprimoramento permanente de dano, ouro de baús e resistência. Forja de relíquias Raras ou melhores.
- **🎨 Atelier das Lanternas:** desbloqueio de cores para a aura e o ataque.
- **📜 Quadro de Contratos:** selecione objetivos por expedição, como abrir baús ou derrotar guardiões, e receba moedas/ecos extras ao voltar vivo.

## Conteúdo e progressão
- 4 áreas: Refúgio do Farol, Bosque dos Sussurros, Forja Silenciosa, Torre do Décimo Terceiro Sino.
- 6 capítulos de lore e batalha contra o Regente do Silêncio.
- 5 níveis de raridade de baús, relíquias colecionáveis, proteção contra sequências longas de azar e recompensas repetíveis.
- Upgrades de mochila fazem surgir novos baús, distribuídos fora de obstáculos sólidos. Entre 8 e 17 baús conforme a região e mochila.
- Inimigos corpo a corpo e atiradores, ataque direcionado contínuo, esquiva com invulnerabilidade breve, consumíveis táticos.
- Ao retornar vivo, guarda o saque e pode receber recompensa do contrato. Ao morrer, perde metade das moedas/ecos da expedição, mas mantém as relíquias coletadas.
- Perfil salvo por `api.saveData` e `api.loadData`, conforme a disponibilidade de armazenamento local.

## Preview web
https://v-prof1.github.io/Aurenix_Engine/games/lacres-da-bruma/?v=1.2.1

O preview usa o mesmo JSON e `js/runtime.js` da engine. Os testes do projeto são simulados; a execução gráfica e o toque real dependem do navegador/Android.

## Limitações
A Aurenix Alpha 0.10 tem física e colisões simplificadas. As entidades de baús e inimigos são criadas ao executar a cena via scripts. Não há multiplayer nem geração de mapas totalmente procedural. O APK gerado pelo fluxo de GitHub é para debug até configurar assinatura de release. Antes de atualizar/desinstalar uma versão da engine, exporte seus projetos.
