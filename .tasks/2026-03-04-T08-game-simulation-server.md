# T08 - GameSimulation server-side (tick + combate)

## Contexto
O servidor Colyseus precisa executar a simulação do jogo: mover unidades, resolver combate, e atualizar o estado que é sincronizado automaticamente com os clientes.

## Objetivo
`GameSimulation` funcional que roda a 10Hz no `KingdomWarsRoom`, movendo unidades por waypoints, resolvendo combate (unit vs unit, unit vs tower, unit vs castle), e atualizando schemas.

## Escopo
- `GameSimulation` class:
  - `update(deltaMs)` chamado a cada 100ms via `setSimulationInterval`
  - Move unidades ao longo dos waypoints (velocidade por tipo)
  - Detecta colisão unit vs unit (reinos opostos se encontrando)
  - Resolve combate: ambos atacam, HP decresce, unidade morre quando HP ≤ 0
  - Detecta unit vs tower inimiga (unidade para, ataca torre, torre perde HP)
  - Detecta unit chegando ao castelo inimigo (causa dano = HP restante × 0.5)
  - Torres atacam unidades inimigas em range (reutiliza lógica de targeting)
- Message handlers no `KingdomWarsRoom`:
  - `place_tower`: valida slot, ouro, cria TowerState
  - `send_unit`: valida tipo, ouro, cooldown, cria UnitState no spawn point
- Phase transitions:
  - `setup` → timer 30s → `battle`
  - `battle` → tick loop ativo
- `SeededRandom` utility para RNG determinístico

## Fora de Escopo
- Condição de vitória e economia (T09)
- Renderização cliente (T07, T10)
- Reconexão (T11)

## Dependências
- T02 (schemas e room lifecycle)

## Parallel Group
- B (paralelo com Grupo A — client-side map/entities)

## Critérios de Aceite
- [ ] Simulation tick roda a 10Hz e atualiza UnitState positions nos schemas
- [ ] Unidades se movem ao longo dos waypoints corretos (esquerda→direita ou direita→esquerda)
- [ ] Unidades de reinos opostos param e lutam quando se encontram
- [ ] Torres atacam unidades inimigas em range, decrementando HP
- [ ] Unidades atacam torres inimigas, decrementando HP da torre
- [ ] Unidade que chega ao castelo causa dano e é removida
- [ ] `place_tower` valida e cria tower no schema
- [ ] `send_unit` valida e cria unit no schema
- [ ] `SeededRandom` produz mesma sequência para mesma seed

## Entregáveis
- `server/src/GameSimulation.ts`
- `server/src/utils/SeededRandom.ts`
- Edição em `server/src/rooms/KingdomWarsRoom.ts` (message handlers + simulation interval)

## Validação
- Conectar dois clients via Colyseus playground
- Enviar `send_unit` → ver UnitState aparecer e posição mudar a cada tick
- Enviar `place_tower` → ver TowerState aparecer
- Unidades opostas se encontram → HP decresce → uma morre (removida do array)

## Estimativa
- Tamanho: L (4-8h)
