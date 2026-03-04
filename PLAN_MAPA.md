# Plano de Reestruturação do Mapa (Padrão Tiny Swords)

Este documento detalha o plano de ação para reformular o mapa do jogo, garantindo que atinja o mesmo nível de fidelidade visual do kit *Tiny Swords* e ganhe o aspecto focado de uma "Ilha".

## Análise do Estado Atual vs. Regras do Guia
- **Como está atualmente (`GameScene.ts` e `map.ts`):** O jogo usa os tiles demarcados na constante de caminhada (`PATH_TILES`) e simplesmente "recorta" o gramado, revelando a água no fundo como se os personagens andassem sobre a água ou em desfiladeiros submersos.
- **Como o Guia da Pixel Frog ensina:** A visualização em perspectiva correta exige sobreposição em camadas baseada em altimetria: o fundo é sempre água (`BG Color`), as beiradas da ilha formam praias próximas da água (`Flat Ground`), são colocados blocos de sombra (`Shadow` deslocado 1 tile para baixo), e, por fim, cria-se a parte principal e alta da ilha sobre tudo isso (`Elevated Ground`).

---

## O Plano de Modificação Passo a Passo

### 1. Reestruturação do Layout do Mapa (Ilha Autêntica)
Em vez de a grama ocupar a tela inteira desde as coordenadas `0,0`, modificaremos o grid lógico (`map.ts`) para que seja uma ilha delimitada.
* **Perímetro de Água:** O cenário jogável terá bordas (uma ou duas colunas/linhas em torno da tela) compostas puramente de água.
* **O Caminho (Path):** O caminho por onde os inimigos andam não será mais "vazio de terreno". Utilizaremos outro tileset (ex: `Tilemap_color2.png` para areia ou terra batida) servindo de trilha *em cima* da ilha, mantendo os inimigos em terra firme.
* **Posição dos Spawns e do Castelo:** Garantiremos que o ponto de saída dos inimigos (Spawn) inicie na beira da ilha (conectado à água) com pontes ou docas, e o Castelo (Destino) fique na segurança do interior elevado.

### 2. Recriando as Camadas (Layers) no Phaser
Alteraremos a ordem do render na função visual (`renderMap` em `GameScene.ts`) seguindo estritamente o *Z-index* abaixo:
1. **Fundo Base:** Água pura preenchendo 100% da tela (`BG Color`).
2. **Espuma (Water Foam):** Identificaremos algoritmicamente quais blocos de terra fazem fronteira com a água, criando os sprites animados de espumas com *offsets* aleatórios, para que o movimento pareça natural e descompassado.
3. **Praia/Base (Flat Ground):** A orla externa e as partes "baixas" da ilha (ao invés de preencher a tela inteira).
4. **Sombras de Elevação (Shadows):** Inseridas sob todo plano alto. Como os arquivos de sombra têm 128x128px, eles "vazam" suavemente sobre os tiles inferiores. Devem ser renderizados sempre um tile (64px) abaixo do terreno elevado.
5. **Interior da Ilha (Elevated Ground):** Os terrenos altos que incluirão os barrancos texturizados (Cliff rock face) nas direções corretas (virados pro mar ou para terra na parte jogável).

### 3. Tamanhos e Distribuição de Personagens e Elementos
Para resolver problemas de alinhamento visual oriundos da proporção das sprites no *Tiny Swords* (onde muitos frames têm 192x192px ou 320x320px para um grid de apenas 64x64px):
* **Fixação de Eixo (Anchoring):** Ajustaremos o eixo (`setOrigin`) de arqueiros, guerreiros, casas e torres para que `.y: 1.0` ou próximo disso ancore "os pés" da unidade na base do seu tile físico (64x64).
* **Escalas Visuais (Scales):** Balancearemos visualmente o tamanho do castelo e torres (atualmente com uma escala solta de `0.5`) para fazerem sentido anatômico de acordo com a estatura das unidades invasoras.
* **Profundidade Dinâmica (Y-Sort / Depth Sorting):** Estruturas e personagens que ficam em posições (Y) mais abaixo na tela devem aparecer à frente dos que estão mais acima. Incluiremos um *manager* de update em tempo-real ordenando as profundidades (`setDepth()`) com base na coordenada Y.

### 4. Expansão do Autotiling (Tilemap Procedural)
Expandiremos o algoritmo de *autotiling* atualmente feito nas funções `getGrassTile()` e `getCliffTile()` no `GameScene.ts`:
* Haverá suporte para agrupar múltiplos "Tipos de Terreno".
* Teremos mapeamento bidimensional considerando: Água Livre, Terreno de Nível 0 (Praia/Caminho) e Terreno Elevado Nível 1.
* A elevação gerará automaticamente os blocos apropriados de face rochosa quando ocorrer a transição de um nível de z-index mais alto para o mais baixo.

---
**Status:** Criado e aguardando confirmação do usuário para iniciar os trabalhos no passo 1.
