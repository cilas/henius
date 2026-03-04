# Roadmap — Kingdom Wars (Modo PvP)

## Visão Geral

```
FASE 1          FASE 2 (paralelo)              FASE 3          FASE 4     FASE 5
Fundação        Client-side  |  Server-side     Convergência   Resiliência Polish
────────        ─────────────┼──────────────    ────────────   ─────────── ──────
T01             T02  T05     │  T08             T10            T11         T12
Setup     ──┬─→ Room  Mapa  ─┤─→ Simulation ──→ Integração ──→ Reconexão ──→ Polish
shared/       │  T03  T06   │    T09             end-to-end
server/       └─→ Net  Ent  │─→ Economia
                  T04  T07  │
                  Menu Scene │
```

---

## P0 — Fundação (começar aqui)

### T01 · Setup shared types + server Colyseus · M (2-4h)
> Alicerce que desbloqueia todas as outras tasks.

- Pacote `shared/` com tipos TypeScript (`TowerType`, `UnitType`, `MessageTypes`)
- Pacote `server/` com Colyseus rodando em `localhost:2567`
- Room placeholder que aceita conexões

**Entregáveis:** `shared/src/`, `server/src/index.ts`, `server/src/rooms/KingdomWarsRoom.ts`

---

## P0 — Lobby (paralelo entre si, após T01)

### T02 · KingdomWarsRoom + schemas + lobby flow · L (4-8h)
> Server-side: schemas Colyseus e fluxo de lobby completo.

- Schemas: `GameState`, `PlayerState`, `TowerState`, `UnitState`
- Criar sala com código de 6 chars; entrar por código
- Fase: `waiting → setup` quando ambos marcam ready
- Max 2 jogadores por sala

**Deps:** T01

---

### T03 · NetworkManager + LobbyScene no cliente · L (4-8h)
> Client-side: conexão Colyseus e UI de lobby.

- `NetworkManager`: connect, createRoom, joinRoom, send, disconnect
- `LobbyScene`: criar sala, entrar com código, status ready, botão voltar
- Tratamento de erros (sala cheia, não encontrada, offline)

**Deps:** T01

---

### T04 · MenuScene botão Kingdom Wars · S (1-2h)
> Adicionar entrada para o modo PvP no menu principal.

- Botão "Kingdom Wars" → navega para `LobbyScene`
- Layout visual consistente com botão existente

**Deps:** T03

---

## P1 — Client-side (Grupo A, paralelo com Grupo B)

### T05 · Mapa PvP espelhado + config · M (2-4h)
> Configuração de dados do mapa 40×12 para o modo PvP.

- `pvp-map.ts`: grid espelhado, waypoints (ambas direções), tower slots, posições dos castelos
- `units.ts`: config de Pawn, Warrior, Lancer, Monk (custo, HP, dano, velocidade)

**Deps:** T01 · **Parallel:** Grupo A

---

### T06 · Entidades PvP (Castle, PvPTower, PvPUnit) · L (4-8h)
> Entidades Phaser que renderizam sprites e HP bars, prontas para receber state updates.

- `Castle`: sprite + HP bar + efeito de dano
- `PvPTower`: building sprite + HP + efeito de destruição
- `PvPUnit`: sprite animado + movimento suave + HP bar + morte

**Deps:** T05 · **Parallel:** Grupo A

---

### T07 · PvPGameScene + PvPUIScene · L (4-8h)
> Scenes completas: mapa renderizado, câmera com zoom, HUD de ambos jogadores.

- Mapa 40×12 com zoom para 1280×768
- Tower slots clicáveis por reino
- HUD: gold, castle HP (ambos), botões de unidade/torre, timer

**Deps:** T05, T06

---

## P1 — Server-side (Grupo B, paralelo com Grupo A)

### T08 · GameSimulation server-side · L (4-8h)
> Tick loop 100ms: movimento, combate, message handlers.

- Unidades se movem por waypoints
- Combate: unit vs unit, unit vs tower, unit vs castle
- Torres atacam unidades em range
- `place_tower` e `send_unit` com validações

**Deps:** T02 · **Parallel:** Grupo B

---

### T09 · Economia PvP + condição de vitória · M (2-4h)
> Ciclo econômico e fim de partida.

- Renda passiva: +5g a cada 10s
- Kill rewards por tipo de unidade/torre
- Vitória: castelo destruído | timeout 10min | surrender

**Deps:** T08 · **Parallel:** Grupo B

---

## P1 — Convergência (após Grupos A e B)

### T10 · Integração cliente-servidor · L (4-8h)
> Conecta tudo: StateListener + input → server. Jogo jogável end-to-end.

- `StateListener`: Colyseus `onAdd`/`onRemove`/`listen` → cria/destrói/atualiza sprites
- Interpolação de posição de unidades entre ticks (60fps smooth)
- Input do jogador → `room.send()`

**Deps:** T03, T07, T08

---

## P1 — Resiliência

### T11 · Reconexão + forfeit automático · M (2-4h)
> Desconexões inevitáveis tratadas com graciosidade.

- Server: `allowReconnection(client, 30s)` → forfeit se não reconectar
- Client: overlay "Reconectando...", reconexão via `sessionStorage`

**Deps:** T10

---

## P2 — Polish

### T12 · Polish visual + tela de resultado + balanceamento · L (4-8h)
> Experiência polida e valores ajustados.

- Particles de morte, efeitos de ataque, shake de castelo
- Feedback: ouro insuficiente, ações confirmadas
- Tela de resultado com stats + botão voltar ao menu
- Balanceamento testado (partidas 5-10min)

**Deps:** T10

---

## Grafo de Dependências

```
T01
 ├──→ T02 ──→ T08 ──→ T09 ──┐
 ├──→ T03 ──→ T04             ├──→ T10 ──→ T11 ──→ T12
 └──→ T05 ──→ T06 ──→ T07 ──┘
```

---

## Resumo de Estimativas

| Fase | Tasks | Total estimado |
|------|-------|----------------|
| Fundação | T01 | 2-4h |
| Lobby | T02, T03, T04 | 9-17h |
| Mapa + Entidades | T05, T06, T07 | 10-18h |
| Simulação + Economia | T08, T09 | 6-12h |
| Integração | T10 | 4-8h |
| Resiliência | T11 | 2-4h |
| Polish | T12 | 4-8h |
| **Total** | **12 tasks** | **~37-71h** |
