# T07 - PvPGameScene + PvPUIScene

## Contexto
O modo PvP precisa de scenes próprias para renderizar o mapa espelhado, os castelos, e o HUD com informações de ambos jogadores.

## Objetivo
Duas scenes funcionais que renderizam o mapa PvP completo (40×12) com zoom, castelos, slots de torre, e HUD com gold, castle HP, botões de ação.

## Escopo
- `PvPGameScene`:
  - Renderiza mapa 40×12 usando tilemap system existente (autotiling, water, foam, shadows)
  - Câmera com zoom para caber 2560×768 no viewport 1280×768
  - Reino esquerdo: grass_color1, reino direito: grass_color2
  - Posiciona Castle entity em cada extremidade
  - Renderiza tower slots (zonas clicáveis) em ambos os lados
  - Click em slot do próprio reino → selecionar tipo de torre → placeholder visual
  - Caminho central com water foam animado
  - Gerencia sprites de PvPUnit e PvPTower (criar/destruir/atualizar)
- `PvPUIScene`:
  - Painel inferior estilo HUD (WoodTable background)
  - Gold display do jogador
  - Castle HP de ambos jogadores (meu HP à esquerda, inimigo à direita)
  - Botões de enviar unidade: Pawn, Warrior, Lancer, Monk (com custo)
  - Botões de construir torre: Archery, Barracks, Tower, Monastery (com custo)
  - Botão Surrender
  - Timer da partida
- Registrar ambas scenes no Phaser config

## Fora de Escopo
- Conexão com Colyseus (T10)
- Simulação de combate (T08)
- Reconexão (T11)

## Dependências
- T05 (pvp-map.ts para layout)
- T06 (entidades Castle, PvPTower, PvPUnit)

## Parallel Group
- None (depende de A)

## Critérios de Aceite
- [ ] PvPGameScene renderiza mapa completo 40×12 com zoom correto
- [ ] Dois castelos visíveis nas extremidades com HP bars
- [ ] Tower slots clicáveis no lado do jogador
- [ ] Caminho central renderizado com water foam
- [ ] PvPUIScene mostra gold, castle HP de ambos, botões de unidade e torre
- [ ] Botões mostram custo e são clicáveis (emitem eventos, não precisam funcionar end-to-end)
- [ ] Timer visível
- [ ] Scene transition de LobbyScene → PvPGameScene funciona

## Entregáveis
- `game/src/scenes/PvPGameScene.ts`
- `game/src/scenes/PvPUIScene.ts`
- Edição em `game/src/config.ts` (registrar scenes)

## Validação
- Navegar: Menu → Kingdom Wars → Lobby (mock) → PvPGameScene
- Mapa renderiza corretamente com dois reinos visíveis
- HUD mostra todas informações e botões são responsivos

## Estimativa
- Tamanho: L (4-8h)
