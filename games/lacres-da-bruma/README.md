# 🏮 Lacres da Bruma: A Última Batida — V2.0.0

Jogo original criado na **Aurenix Engine** (motor JavaScript nativo, 2D top-down). Campanha de 15 capítulos, 7 mapas, inimigos, colecionáveis e habilidades. Todo o jogo permanece num projeto Aurenix JSON editável, não é um HTML externo.

## 📜 Campanha narrativa: 15 capítulos
A Décima Terceira Batida apagou memórias do mundo de Orval. O Catador de Ecos parte do Farol de Eira, encontra Kael, Dara, Nim, Orin e Cid, recupera lacres de memória, decifra o nome proibido e confronta o Regente do Silêncio. A história se revela aos poucos; cada capítulo oferece um objetivo simples, diálogo e recompensa. O diário preserva os capítulos concluídos.

**Missões da campanha:**
1. Conversar com Mira no Refúgio.
2. Abrir 3 baús no Bosque.
3. Encontrar Kael.
4. Derrotar 4 guardiões no Bosque.
5. Abrir 4 baús na Forja.
6. Conversar com Dara.
7. Abrir 3 baús no Lago dos Reflexos.
8. Encontrar Nim.
9. Ler os 3 obeliscos da Cripta das Letras.
10. Derrotar 5 guardiões no Jardim dos Nomes.
11. Abrir 5 lacres no Jardim.
12. Conversar com Eira no Refúgio.
13. Abrir 3 lacres na Torre.
14. Derrotar o Regente do Silêncio.
15. Voltar a conversar com Eira e concluir a história.

## 🌍 Mapas
- Refúgio do Farol: início, portais, melhorias, NPCs, diário e lojas.
- Bosque dos Sussurros: exploração e a história do cartógrafo Kael.
- Forja Silenciosa: máquinas e história de Dara.
- Lago dos Reflexos: segredo submerso, Nim e novos lacres.
- Cripta das Letras: obeliscos e pistas do nome verdadeiro.
- Jardim dos Nomes: guardiões, flores e sementes de memória.
- Torre do Décimo Terceiro Sino: batalha contra o Regente.

## ⚔️ Controles
O jogo é fácil de aprender, independentemente da arma:
- **Android:** analógico esquerdo para andar; analógico direito para mirar e atacar segurando; botão ✦ para interagir; 🌀 para esquivar. Botões❤️💥🛡️ usam consumíveis.
- **PC:** WASD/setas para andar, IJKL para direcionar, Espaço para atacar, F para interagir, Shift para esquivar, 1/2/3 para consumíveis.

## 🧰 Sistemas e atividades
- **Três armas**, mesmo controle: ⚔️ espada rápida, 🔨 martelo poderoso (atordoa), ✨ cajado de longo alcance.
- Economia com moedas (oficina, armas, bazar, cosméticos), ecos (runas e forja de relíquias), contratos repetíveis.
- Expedições curtas com baús aleatórios, 5 raridades, proteção contra sequências de azar, recompensas extras e chance de inimigo-surpresa.
- Segredos regionais com ecos especiais, santuários de cura, coleção de relíquias, cenário com colisões e sprites.
- Progresso narrativo, equipamentos e coleção salvos localmente via API da Aurenix, conforme as permissões do dispositivo.
- Uma única regra para todas as missões: **andar, atacar, interagir**. Nenhuma tela de comandos complexos ou árvore de missões obrigatória.

## Abrir e editar na Aurenix
1. Baixe `lacres-da-bruma.aurenix.json` neste diretório.
2. Na Aurenix Engine, use **Importar projeto** e escolha o JSON.
3. Pressione **▶ Testar**; personalize arte, objetos, cenas e scripts.
4. Para publicar APK de teste, use o fluxo gratuito de GitHub Actions da engine em um repositório separado.

## Jogar no navegador
https://v-prof1.github.io/Aurenix_Engine/games/lacres-da-bruma/?v=2.0.0

A página de preview carrega o mesmo runtime `js/runtime.js` e o mesmo JSON do projeto.

## Compatibilidade e limitações
O perfil usa a mesma chave de salvamento das versões antigas e os novos campos são inicializados automaticamente; mantenha backup dos projetos. A engine está em Alpha, com física e inteligência artificial simplificadas. Os testes automatizados disponíveis foram simulados; desempenho real, layout e multitoque devem ser validados num Android. GitHub Pages pode demorar para atualizar por causa da publicação e do cache. O projeto não inclui multiplayer, áudio profissional ou geração procedural completa.
