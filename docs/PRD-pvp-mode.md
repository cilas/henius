# PRD: Modo PvP Multiplayer — Kingdom Wars

## 1. Visão Geral

Novo modo de jogo **Kingdom Wars** onde dois jogadores se enfrentam em tempo real via WebSocket. Cada jogador controla um reino e deve destruir o reino adversário enviando combatentes e construindo defesas. O modo single-player existente (Tower Defense) permanece intacto.

### 1.1 Objetivos
- Adicionar modo PvP 1v1 multiplayer ao jogo existente
- Sistema de salas com convite por link/código
- Manter o codebase modular e manutenível
- Reutilizar ao máximo entidades e assets existentes

### 1.2 Escopo
- **In scope:** Lobby, matchmaking por convite, gameplay PvP, servidor WebSocket
- **Out of scope:** Ranking/leaderboard, matchmaking automático, chat in-game, replay system

---

## 2. Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────┐
│                   Cliente (Phaser 3)             │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │MenuScene  │→ │LobbyScene│→ │PvPGameScene   │  │
│  │(+PvP btn) │  │(salas)   │  │(split view)   │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                                   ↕              │
│                          ┌────────────────┐      │
│                          │ NetworkManager │      │
│                          │ (WebSocket)    │      │
│                          └────────────────┘      │
└──────────────────────────────────────────────────┘
                           ↕ WebSocket
┌──────────────────────────────────────────────────┐
│              Servidor (Node.js)                   │
│                                                   │
│  ┌────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │RoomManager │  │GameSimulation│  │AuthManager│  │
│  │(salas)     │  │(estado/tick) │  │(sessões)  │  │
│  └────────────┘  └─────────────┘  └───────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 3. Modelo de Jogo PvP

### 3.1 Conceito

O mapa é dividido em dois reinos (esquerdo e direito) conectados por um caminho central. Cada jogador:
- **Defende** seu reino construindo torres/construções
- **Ataca** enviando combatentes pelo caminho em direção ao reino inimigo
- **Ganha pontos** ao destruir combatentes e construções inimigas
- **Usa pontos** para comprar mais combatentes e construções

### 3.2 Layout do Mapa

```
┌──────────────────────────────────────────────────────┐
│  REINO AZUL (Player 1)    │    REINO VERMELHO (P2)   │
│                            │                          │
│   🏰 Castelo              │              Castelo 🏰  │
│   ├─ Slots de torre       │       Slots de torre ─┤  │
│   │                       │                      │   │
│   │  ═══════ CAMINHO CENTRAL ═══════════════     │   │
│   │                       │                      │   │
│   ├─ Slots de torre       │       Slots de torre ─┤  │
│   🏰                      │                    🏰    │
│                            │                          │
└──────────────────────────────────────────────────────┘
```

- Grid expandido: **40×12** tiles (2560×768px) ou **20×12** com scroll/camera split
- Cada reino ocupa metade do mapa com layout espelhado
- Caminho central conecta os dois castelos
- Tower slots posicionados ao longo do caminho dentro de cada reino

### 3.3 Fluxo de Jogo

```
1. Fase Inicial (Setup Phase) — 30 segundos
   → Cada jogador recebe ouro inicial (200g)
   → Posiciona torres iniciais em seus slots

2. Fase de Batalha (contínua)
   → Jogadores podem a qualquer momento:
     a) Construir/melhorar torres (defesa)
     b) Enviar combatentes (ataque) — gasta ouro
     c) Usar habilidades especiais (futuro)

   → Combatentes enviados seguem o caminho até o reino inimigo
   → Torres atacam combatentes inimigos que passam
   → Combatentes atacam torres inimigas no caminho
   → Combatentes que chegam ao castelo causam dano

3. Condição de Vitória
   → Castelo inimigo destruído (HP = 0)
   → Timeout (10 min): maior HP restante vence
   → Desistência do oponente
```

### 3.4 Sistema de Economia PvP

| Ação | Efeito |
|------|--------|
| Matar combatente inimigo | +ouro (baseado no tipo) |
| Destruir torre inimiga | +ouro + pontos |
| Combatente atinge castelo | +pontos ao atacante |
| Renda passiva | +5 ouro a cada 10 segundos |
| Enviar combatente | -ouro (custo por tipo) |
| Construir torre | -ouro (custo por tipo) |

### 3.5 Combatentes (Unidades Ofensivas)

Reutilizam as sprites e configs de `Red Units` / `Blue Units`:

| Unidade | Custo | HP | Dano | Velocidade | Especial |
|---------|-------|----|------|------------|----------|
| Pawn | 30g | 60 | 8 | 70px/s | Barato, em massa |
| Warrior | 60g | 150 | 20 | 50px/s | Tanque, splash |
| Lancer | 80g | 100 | 30 | 90px/s | Rápido, pierce |
| Monk | 70g | 80 | 5 | 55px/s | Cura aliados próximos |

### 3.6 Torres (Construções Defensivas)

Reutilizam configs de `towers.ts`:

| Torre | Custo | Range | Dano | Especial |
|-------|-------|-------|------|----------|
| Archery | 80g | 176px | 14 | Flechas piercing |
| Barracks | 120g | 80px | 33 | Splash damage |
| Tower | 150g | 120px | 26 | Pierce 2 alvos |
| Monastery | 130g | 144px | 4/s | Aura de dano contínuo |

Torres possuem HP e podem ser destruídas por combatentes inimigos.

---

## 4. Networking

### 4.1 Stack do Servidor

- **Runtime:** Node.js + TypeScript
- **Framework:** Colyseus (game rooms, state sync automático, reconexão built-in)
- **Protocolo:** Colyseus schema (binary, eficiente) — state sync nativo do framework
- **Hospedagem:** Local durante desenvolvimento (decidir produção depois)

### 4.2 Modelo de Autoridade

**Servidor autoritativo** — o servidor é a fonte de verdade para:
- Estado de HP de castelos, torres e combatentes
- Validação de economia (ouro suficiente para ação)
- Resolução de combate (dano, morte)
- Condição de vitória

**Cliente preditivo** — o cliente executa simulação local e corrige com snapshots do servidor:
- Movimento de combatentes (interpolação)
- Animações de ataque (imediatas no cliente)
- Posicionamento de torre (confirmação do servidor)

### 4.3 Colyseus State Schema

O Colyseus sincroniza estado automaticamente via schemas. O estado do room:

```typescript
// Colyseus Schema — sincronizado automaticamente
class GameState extends Schema {
  @type("string") phase: "waiting" | "setup" | "battle" | "ended"
  @type("number") tick: number
  @type("number") seed: number
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>()
  @type([UnitState]) units = new ArraySchema<UnitState>()
}

class PlayerState extends Schema {
  @type("string") id: string
  @type("string") name: string
  @type("boolean") ready: boolean
  @type("number") gold: number
  @type("number") castleHp: number
  @type("string") side: "left" | "right"
  @type([TowerState]) towers = new ArraySchema<TowerState>()
}

class UnitState extends Schema {
  @type("string") id: string
  @type("string") ownerId: string
  @type("string") unitType: string
  @type("number") x: number
  @type("number") y: number
  @type("number") hp: number
  @type("number") maxHp: number
  @type("number") waypointIndex: number
}

class TowerState extends Schema {
  @type("string") id: string
  @type("number") slotId: number
  @type("string") towerType: string
  @type("number") hp: number
  @type("number") maxHp: number
}
```

#### Cliente → Servidor (Messages)
```typescript
// Ações do jogador (enviadas via room.send())
room.send("place_tower", { slotId: number, towerType: TowerType })
room.send("send_unit",   { unitType: UnitType, count: number })
room.send("surrender")
room.send("ready")
```

#### Servidor → Cliente (Broadcasts)
```typescript
// Eventos discretos (além do state sync automático)
room.broadcast("unit_died",       { unitId, killedBy, reward })
room.broadcast("tower_destroyed", { towerId, destroyedBy, reward })
room.broadcast("damage_dealt",    { sourceId, targetId, damage })
room.broadcast("game_over",       { winnerId, reason })
```

### 4.4 Tick Rate e Sincronização

- **Server tick:** 10 Hz (100ms) — Colyseus envia patches delta automaticamente
- **Client render:** 60 Hz — interpola entre patches recebidos
- **Latência alvo:** < 200ms round-trip
- **RNG:** seed compartilhada no `GameState.seed` para determinismo
- **Reconexão:** Colyseus `allowReconnection(client, 30)` — 30s para reconectar

---

## 5. Modularização do Codebase

### 5.1 Estrutura de Diretórios Proposta

```
game_helena_2/
├── game/                          # Cliente Phaser (existente)
│   └── src/
│       ├── main.ts
│       ├── config.ts
│       ├── config/                # Configs compartilhados
│       │   ├── map.ts             # Mapa single-player (inalterado)
│       │   ├── pvp-map.ts         # Mapa PvP (novo)
│       │   ├── towers.ts          # (inalterado)
│       │   ├── enemies.ts         # (inalterado)
│       │   ├── waves.ts           # (inalterado)
│       │   └── units.ts           # Config de unidades ofensivas PvP (novo)
│       │
│       ├── scenes/
│       │   ├── BootScene.ts       # (inalterado)
│       │   ├── MenuScene.ts       # Adicionar botão "Kingdom Wars"
│       │   ├── GameScene.ts       # (inalterado — single-player)
│       │   ├── UIScene.ts         # (inalterado — single-player)
│       │   ├── LobbyScene.ts      # (novo) Criar/entrar sala
│       │   ├── PvPGameScene.ts    # (novo) Cena principal PvP
│       │   └── PvPUIScene.ts      # (novo) HUD PvP
│       │
│       ├── entities/
│       │   ├── Tower.ts           # Refatorar: extrair lógica base
│       │   ├── Enemy.ts           # Refatorar: extrair lógica base
│       │   ├── Projectile.ts      # (inalterado)
│       │   ├── PvPTower.ts        # (novo) Torre com HP, destruível
│       │   ├── PvPUnit.ts         # (novo) Unidade ofensiva
│       │   └── Castle.ts          # (novo) Entidade castelo com HP
│       │
│       ├── systems/
│       │   ├── WaveManager.ts     # (inalterado — single-player)
│       │   ├── TowerManager.ts    # (inalterado — single-player)
│       │   ├── EconomyManager.ts  # (inalterado — single-player)
│       │   ├── PvPUnitManager.ts  # (novo) Gerencia unidades de ambos jogadores
│       │   ├── PvPTowerManager.ts # (novo) Torres PvP com HP
│       │   ├── PvPEconomyManager.ts # (novo) Economia PvP (renda passiva + kills)
│       │   └── CombatResolver.ts  # (novo) Resolução de combate unit vs tower/unit
│       │
│       ├── network/
│       │   ├── NetworkManager.ts  # (novo) Colyseus Client wrapper
│       │   ├── StateListener.ts   # (novo) Listen to state changes, update sprites
│       │   └── RoomClient.ts      # (novo) Join/create room helpers
│       │
│       └── utils/
│           ├── animations.ts      # (inalterado)
│           └── SeededRandom.ts    # (novo) RNG determinístico
│
├── server/                        # Servidor WebSocket (novo)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               # Entry point, Colyseus Server
│       ├── rooms/
│       │   └── KingdomWarsRoom.ts # Colyseus Room (lifecycle + message handlers)
│       ├── schemas/
│       │   ├── GameState.ts       # Root state schema
│       │   ├── PlayerState.ts     # Player sub-schema
│       │   ├── UnitState.ts       # Unit sub-schema
│       │   └── TowerState.ts      # Tower sub-schema
│       ├── GameSimulation.ts      # Simulação server-side (tick)
│       └── config/                # Configs espelhados do cliente
│           ├── towers.ts
│           ├── units.ts
│           └── balance.ts         # Constantes de balanceamento
│
├── shared/                        # Tipos compartilhados (novo)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── MessageTypes.ts        # Interfaces de mensagens
│       ├── GameTypes.ts           # TowerType, UnitType, etc.
│       └── Constants.ts           # Valores compartilhados
│
└── docs/
    └── PRD-pvp-mode.md            # Este documento
```

### 5.2 Princípios de Modularização

1. **Zero impacto no single-player** — Nenhum arquivo existente é removido ou tem comportamento alterado
2. **Composição sobre herança** — `PvPTower` e `PvPUnit` compõem lógica base, não estendem `Tower`/`Enemy`
3. **Shared types** — Pacote `shared/` com tipos usados por cliente e servidor
4. **Network como camada** — `NetworkManager` é injetado nas scenes PvP, não é global
5. **Configs separados** — `pvp-map.ts`, `units.ts` não poluem configs single-player

---

## 6. Scenes e Fluxo de Navegação

```
                    ┌─────────────┐
                    │  MenuScene   │
                    │              │
                    │ [Tower Def]  │──→ GameScene (existente)
                    │ [Kingdom Wars]│
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  LobbyScene  │
                    │              │
                    │ [Criar Sala] │──→ Gera código, aguarda oponente
                    │ [Entrar]     │──→ Digita código, entra na sala
                    │              │
                    │ Sala: ABC123 │
                    │ Player 1: ✓  │
                    │ Player 2: ✓  │
                    │ [INICIAR]    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │PvPGameScene  │
                    │+ PvPUIScene  │
                    │              │
                    │ Split view:  │
                    │ Meu reino |  │
                    │ caminho   |  │
                    │ Reino ini |  │
                    └──────────────┘
```

---

## 7. PvPGameScene — Detalhamento

### 7.1 Câmera e Viewport

**Mapa completo visível (decidido):**
- Mapa 40×12 tiles (2560×768)
- Câmera mostra tudo, escala ajustada para caber na tela (1280×768 viewport)
- Ambos reinos sempre visíveis — jogador tem visão estratégica completa
- Sem scroll, sem minimap — implementação simples

### 7.2 Renderização do Mapa PvP

- Reutiliza sistema de tilemap existente (autotiling, water foam, shadows)
- Layout espelhado: reino esquerdo usa grass_color1, direito usa grass_color2
- Caminho central conecta os dois castelos
- Tower slots distribuídos ao longo do caminho em cada lado

### 7.3 Game Loop PvP (Client-side)

O cliente é **state-driven**: o Colyseus sincroniza o estado automaticamente,
e o cliente interpola posições e atualiza sprites com base nos callbacks de mudança.

```
// Setup (uma vez, no create()):
room.state.units.onAdd((unit) => createUnitSprite(unit))
room.state.units.onRemove((unit) => destroyUnitSprite(unit))
room.state.players.forEach(player => {
  player.towers.onAdd((tower) => createTowerSprite(tower))
  player.listen("gold", (value) => updateGoldUI(value))
  player.listen("castleHp", (value) => updateCastleHpUI(value))
})

// Update (cada frame):
PvPGameScene.update(time, delta):
  // 1. Input local
  handleTowerPlacement()    → room.send("place_tower", {...})
  handleUnitDeployment()    → room.send("send_unit", {...})

  // 2. Interpolar posições de unidades entre server ticks
  interpolateUnitPositions(delta)

  // 3. Atualizar visuais (HP bars, efeitos)
  updateVisuals()
```

---

## 8. Server — Detalhamento

### 8.1 KingdomWarsRoom Lifecycle (Colyseus)

```typescript
class KingdomWarsRoom extends Room<GameState> {
  // Colyseus lifecycle hooks:

  onCreate(options) {
    // Inicializa GameState, seta phase = "waiting"
    // Configura setSimulationInterval(100ms) para game tick
  }

  onJoin(client, options) {
    // Adiciona PlayerState ao state.players
    // Se 2 jogadores: phase = "waiting" (aguarda ready)
  }

  onMessage("ready", (client, data)) {
    // Marca player.ready = true
    // Se ambos ready: phase = "setup", inicia timer 30s
  }

  onMessage("place_tower", (client, data)) {
    // Valida: slot pertence ao jogador? Ouro suficiente? Slot vazio?
    // Debita ouro, cria TowerState no player.towers
  }

  onMessage("send_unit", (client, data)) {
    // Valida: tipo válido? Ouro suficiente? Cooldown respeitado?
    // Debita ouro, cria UnitState no state.units
  }

  onMessage("surrender", (client)) {
    // phase = "ended", broadcast game_over
  }

  onLeave(client, consented) {
    // allowReconnection(client, 30) — 30s para reconectar
    // Se não reconectar: forfeit automático
  }

  // Tick loop (100ms):
  simulationTick(deltaMs) {
    if (phase !== "battle") return
    simulation.update(deltaMs)  // move, combat, economy, victory check
    // Colyseus envia patches delta automaticamente
  }
}
```

### 8.2 Simulação Server-side

```typescript
class GameSimulation {
  constructor(private state: GameState) {}

  update(deltaMs: number): void {
    this.moveUnits(deltaMs)       // waypoint pathfinding
    this.resolveCombat(deltaMs)   // unit vs unit, unit vs tower, unit vs castle
    this.updateEconomy(deltaMs)   // passive income every 10s
    this.checkVictory()           // castle HP <= 0 or timeout
    this.state.tick++
  }
}
```

### 8.3 Validações Server-side

- **PLACE_TOWER:** slot válido? Ouro suficiente? Slot vazio? Slot pertence ao jogador?
- **SEND_UNIT:** tipo válido? Ouro suficiente? Cooldown respeitado?
- **Rate limiting:** máximo 10 ações por segundo por jogador
- **Anti-cheat:** estado do cliente nunca é confiável

---

## 9. Combate PvP — Regras

### 9.1 Unidades vs Torres
- Unidades atacam a torre inimiga mais próxima no caminho
- Unidades param para atacar, depois seguem caminho
- Torre destruída: atacante ganha ouro + pontos

### 9.2 Unidades vs Unidades
- Unidades de reinos opostos se enfrentam quando se encontram no caminho
- Combate automático: ambas atacam até uma morrer
- Monk cura aliados próximos durante combate

### 9.3 Unidades vs Castelo
- Unidades que chegam ao castelo inimigo causam dano baseado no HP restante
- Dano ao castelo = HP restante da unidade × multiplicador (0.5)
- Castelo HP: 500

### 9.4 Balanceamento
- Renda passiva evita "turtle" (apenas defender)
- Custo de unidades escala com quantidade enviada (anti-spam)
- Torres possuem HP para serem destruíveis (não invencíveis)

---

## 10. Fases de Implementação

### Fase 1 — Fundação Colyseus + Lobby
- [ ] Setup do pacote `shared/` com tipos compartilhados
- [ ] Setup do pacote `server/` com Colyseus (`npm create colyseus-app`)
- [ ] `KingdomWarsRoom` com schemas básicos (`GameState`, `PlayerState`)
- [ ] `NetworkManager` no cliente (Colyseus client, connect/join/create)
- [ ] `LobbyScene` — criar sala (gera código), entrar sala (digita código), status ready
- [ ] `MenuScene` — adicionar botão "Kingdom Wars" → LobbyScene
- [ ] Teste: dois browsers conectam na mesma sala e veem status um do outro

### Fase 2 — Mapa e Entidades PvP
- [ ] `pvp-map.ts` — mapa espelhado 40×12, waypoints para ambos lados, tower slots por reino
- [ ] `Castle` entity — sprite do castelo, HP bar, receber dano
- [ ] `PvPTower` entity — torre com HP (destruível), reutiliza sprites de Buildings
- [ ] `PvPUnit` entity — unidade ofensiva com waypoint movement, HP bar, combate
- [ ] `PvPGameScene` — renderiza mapa completo (2560×768), câmera com zoom para caber em 1280×768
- [ ] `PvPUIScene` — HUD: gold, castle HP (ambos), botões de enviar unidade e construir torre

### Fase 3 — Simulação e Combate no Servidor
- [ ] `GameSimulation` — tick loop 100ms no `KingdomWarsRoom`
- [ ] Schemas: `UnitState`, `TowerState` com posição, HP, tipo
- [ ] Movimento de unidades server-side (waypoints fixos)
- [ ] Resolução de combate: unit vs unit, unit vs tower, unit vs castle
- [ ] Economia: renda passiva (5g/10s), kill rewards, custo de deploy
- [ ] Condição de vitória: castle HP ≤ 0, timeout 10min, surrender

### Fase 4 — Integração Cliente-Servidor
- [ ] `StateListener` — Colyseus `onAdd`/`onRemove`/`listen` para criar/destruir sprites
- [ ] Interpolação de posição de unidades entre ticks (smooth movement)
- [ ] Input → `room.send()` para tower placement e unit deployment
- [ ] Reconexão automática (`allowReconnection`, 30s timeout)
- [ ] Forfeit automático se jogador não reconectar

### Fase 5 — Polish
- [ ] Efeitos visuais: morte de unidades (dust/explosion), ataque de torres
- [ ] Feedback visual: torre colocada, unidade enviada, dano recebido
- [ ] Tela de resultado (vitória/derrota) com stats da partida
- [ ] Balanceamento de custos, HP, dano, renda passiva
- [ ] Teste com latência simulada (tc netem ou similar)

---

## 11. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Latência alta prejudica gameplay | Alto | Client-side prediction + interpolação |
| Dessincronia entre clientes | Alto | Servidor autoritativo, snapshots frequentes |
| Cheating/hacking | Médio | Toda lógica validada no servidor |
| Complexidade do codebase | Médio | Separação clara client/server/shared |
| Balanceamento quebrado | Médio | Config externalizado, fácil de ajustar |
| Desconexão durante partida | Médio | Reconexão automática com state replay |

---

## 12. Métricas de Sucesso

- Partida funcional com < 200ms de latência percebida
- Zero impacto no modo single-player existente
- Codebase mantém separação clara de responsabilidades
- Partida completa em 5-10 minutos
- Reconexão bem-sucedida em < 5 segundos

---

## 13. Decisões Resolvidas

| # | Decisão | Escolha | Justificativa |
|---|---------|---------|---------------|
| 1 | Câmera/Viewport | **Mapa completo** (40 tiles) | Ambos reinos visíveis, sem scroll, implementação simples |
| 2 | Framework WS | **Colyseus** | State sync automático, rooms built-in, reconexão nativa |
| 3 | Hospedagem | **Local** (dev) | Foco no desenvolvimento primeiro, decidir produção depois |
| 4 | Pathfinding | **Waypoints fixos** | Determinístico, fácil de sincronizar, como o single-player |
| 5 | Upgrade de torres | **Feature futura** | MVP só com placement + destruição, reduz complexidade |
| 6 | Espectadores | **Ignorar** | Não considerar na arquitetura, implementar se necessário |
