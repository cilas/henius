# T10 - Integração cliente-servidor (StateListener + input)

## Contexto
O cliente tem as scenes e entidades (T06/T07) e o servidor tem a simulação (T08/T09). Esta task conecta os dois: o cliente reage a mudanças de estado do servidor e envia ações do jogador.

## Objetivo
Jogo PvP jogável end-to-end: dois jogadores em browsers diferentes veem o mesmo estado, podem colocar torres, enviar unidades, e assistir ao combate em tempo real.

## Escopo
- `StateListener` class:
  - `room.state.units.onAdd(unit)` → cria PvPUnit sprite, inicia interpolação
  - `room.state.units.onRemove(unit)` → destrói sprite com efeito de morte
  - `unit.listen("x")` / `unit.listen("y")` → atualiza posição alvo para interpolação
  - `unit.listen("hp")` → atualiza HP bar
  - `player.towers.onAdd(tower)` → cria PvPTower sprite
  - `player.towers.onRemove(tower)` → destrói torre com efeito
  - `player.listen("gold")` → emite evento para PvPUIScene
  - `player.listen("castleHp")` → atualiza Castle HP bar
  - `state.listen("phase")` → transições de fase (setup→battle→ended)
- Input → server:
  - Click em tower slot → `room.send("place_tower", { slotId, towerType })`
  - Click em botão de unidade → `room.send("send_unit", { unitType, count: 1 })`
  - Click surrender → `room.send("surrender")`
- Interpolação:
  - Unidades interpolam entre posição atual e posição do servidor (lerp por frame)
  - Smooth movement a 60fps baseado em updates de 10Hz
- LobbyScene → PvPGameScene passa room reference via scene data
- PvPGameScene recebe room no `init()` e inicializa StateListener

## Fora de Escopo
- Reconexão automática (T11)
- Polish visual (T12)
- Efeitos sonoros

## Dependências
- T03 (NetworkManager)
- T07 (PvPGameScene + PvPUIScene)
- T08 (GameSimulation — server-side)

## Parallel Group
- None (ponto de convergência)

## Critérios de Aceite
- [ ] Dois browsers: criar sala, entrar, ready → ambos veem PvPGameScene
- [ ] Player 1 coloca torre → ambos veem torre aparecer
- [ ] Player 1 envia unidade → ambos veem unidade se movendo suavemente
- [ ] Unidades de lados opostos se encontram → combate visível, HP decresce
- [ ] Unidade chega ao castelo → HP do castelo decresce visualmente
- [ ] Gold atualiza em tempo real no HUD
- [ ] Castelo destruído → tela de game over (pode ser simples)
- [ ] Movimento de unidades é suave (interpolação funcional)

## Entregáveis
- `game/src/network/StateListener.ts`
- Edição em `game/src/scenes/PvPGameScene.ts` (integração com StateListener)
- Edição em `game/src/scenes/PvPUIScene.ts` (bind a eventos de state)
- Edição em `game/src/scenes/LobbyScene.ts` (passar room para PvPGameScene)

## Validação
- Abrir dois browsers, jogar partida completa do início ao fim
- Ações de um jogador são visíveis pelo outro em < 200ms
- Partida termina com tela de resultado

## Estimativa
- Tamanho: L (4-8h)
