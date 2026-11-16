# 🏮 Lacres da Bruma — A Última Batida

**Jogo original feito com o motor nativo da Aurenix Engine, não é uma importação HTML5.**

> Quando o Grande Sino tocou 13 vezes, o mundo esqueceu seus nomes. Agora os lacres espalhados por Orval guardam as memórias que faltam.

## Como jogar na Aurenix Engine
1. Baixe `lacres-da-bruma.aurenix.json` deste diretório.
2. Abra Aurenix Engine → **Importar projeto** → escolha o arquivo JSON.
3. Toque em **▶ Testar**.
4. Edite cenas, objetos, tiles, artes, animações e script central dentro da Aurenix.
5. Se quiser um APK, no editor acesse **🐙 Publicar no GitHub e gerar APK** e use um repositório exclusivo para o jogo.

## Controles
- Android: analógico movimenta; **⚔ A** ataca; **✦ B** interage/abre baús.
- PC: **WASD/setas**, **Espaço** atacar, **F** interagir.
- Menu superior: escolher regiões, voltar, oficina, códice, coleção e ajuda.

## Loop de exploração
- Abre 8–9 baús escolhidos aleatoriamente por expedição.
- 5 níveis de raridade, moedas, ecos, relíquias únicas, baú com bônus a cada 5 aberturas.
- Salve o saque ao retornar ao refúgio; ao morrer, preserva metade das moedas e ecos, e mantém relíquias.
- 5 linhas de upgrade (espada, velocidade, vida, sorte, capacidade).
- 4 áreas (refúgio, bosque, forja, torre), inimigos perseguidores e atiradores.
- Regente do Silêncio com ataques radiais; epílogo e continuação para colecionar.
- 6 capítulos de lore desbloqueados pelo progresso.
- Perfil persistido com `api.saveData`/`api.loadData` quando permitido pelo ambiente.

## Preview
Se o GitHub Pages estiver ativo na branch main, visite:
https://v-prof1.github.io/Aurenix_Engine/games/lacres-da-bruma/

O preview carrega o mesmo JSON e o mesmo `js/runtime.js` do editor. Não exige bibliotecas externas ou API paga.

## Limitações técnicas
Projeto para a Aurenix Alpha 0.10, com mapas 2D, física simples e scripts JavaScript. O HUD avançado é criado por script durante o teste e as construções de cada baú são dinâmicas via API da engine: código e sprites editáveis, mas os baús sorteados aparecem quando o teste roda. Salvamento local pode variar por navegador/WebView; faça backup.