# T02 - KingdomWarsRoom + schemas + lobby flow

## Contexto
O servidor precisa gerenciar salas de jogo com estado tipado. O Colyseus usa Schemas para sincronizar estado automaticamente com os clientes.

## Objetivo
Room funcional com schemas de estado completos e fluxo de lobby (criar sala com código, entrar com código, marcar ready, iniciar partida).

## Escopo
- Schemas Colyseus: `GameState`, `PlayerState`, `TowerState`, `UnitState`
- `GameState` com fields: `phase` (waiting/setup/battle/ended), `tick`, `seed`, `players` (MapSchema), `units` (ArraySchema)
- `PlayerState` com: `id`, `name`, `ready`, `gold`, `castleHp`, `side` (left/right), `towers` (ArraySchema)
- Lifecycle do room: `onCreate`, `onJoin` (max 2 players), `onLeave`
- Message handlers: `ready` → se ambos ready, phase = "setup"
- Geração de room code (6 chars alfanumérico) para compartilhar
- Filtrar rooms por `roomCode` para join

## Fora de Escopo
- GameSimulation tick loop (T08)
- Message handlers de gameplay (place_tower, send_unit) (T08)
- Cliente/UI (T03)

## Dependências
- T01 (shared types, server setup)

## Parallel Group
- None (sequencial após T01, paralelo com T03)

## Critérios de Aceite
- [ ] Schemas compilam e são registrados no room
- [ ] Player 1 cria sala → recebe `roomCode`
- [ ] Player 2 entra com `roomCode` → ambos veem 2 players na sala
- [ ] Ambos enviam `ready` → `phase` muda para "setup"
- [ ] Terceiro player tenta entrar → rejeitado (max 2)
- [ ] Player sai → `onLeave` loga e notifica o outro

## Entregáveis
- `server/src/rooms/KingdomWarsRoom.ts` (lifecycle completo)
- `server/src/schemas/GameState.ts`, `PlayerState.ts`, `UnitState.ts`, `TowerState.ts`

## Validação
- Abrir Colyseus playground (`localhost:2567`), criar room, ver estado
- Segundo tab entra com roomCode, ambos marcam ready, phase muda

## Estimativa
- Tamanho: L (4-8h)
