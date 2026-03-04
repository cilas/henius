# T06 - Entidades PvP (Castle, PvPTower, PvPUnit)

## Contexto
O modo PvP precisa de entidades diferentes do single-player: castelos com HP, torres destruíveis, e unidades ofensivas que se movem e lutam.

## Objetivo
Três novas entidades Phaser que renderizam sprites, HP bars e respondem a mudanças de estado (preparadas para receber state updates do Colyseus).

## Escopo
- `Castle` entity (Phaser.Container):
  - Sprite do castelo (Blue/Red Buildings)
  - HP bar (BigBar_Base/BigBar_Fill, reutiliza padrão do single-player)
  - Método `updateHp(hp, maxHp)` para atualizar barra
  - Efeito visual ao receber dano (shake/flash)
- `PvPTower` entity (Phaser.Container):
  - Sprite da construção (Archery/Barracks/Tower/Monastery)
  - HP bar acima da torre
  - Sprite do unit na torre (como no single-player)
  - Método `updateHp(hp, maxHp)`
  - Efeito visual de destruição (explosão + fade)
  - Diferença do Tower single-player: tem HP, não dispara projectiles localmente (server-driven)
- `PvPUnit` entity (Phaser.Sprite):
  - Sprite animado (run/idle/attack anims dos Red/Blue Units)
  - HP bar acima da unidade
  - Método `moveTo(x, y)` para interpolação suave
  - Método `updateHp(hp, maxHp)`
  - Flip baseado na direção de movimento
  - Depth sorting por Y
  - Efeito de morte (dust/explosion particle)

## Fora de Escopo
- Lógica de combate (T08, T10)
- Targeting e disparo de projectiles (server-driven)
- Conexão com Colyseus state (T10)
- Renderização do mapa (T07)

## Dependências
- T05 (config de unidades para stats e sprite keys)

## Parallel Group
- A (paralelo com T05, mas depende dele)

## Critérios de Aceite
- [ ] `Castle` renderiza sprite + HP bar, `updateHp()` funciona visualmente
- [ ] `PvPTower` renderiza building sprite + unit sprite + HP bar, destruição animada
- [ ] `PvPUnit` renderiza sprite animado, move suavemente, HP bar funcional
- [ ] Todas as entidades usam sprites existentes do asset pack (sem novos assets)
- [ ] Entidades são independentes de networking (recebem dados, não buscam)
- [ ] Nenhuma entidade single-player alterada

## Entregáveis
- `game/src/entities/Castle.ts`
- `game/src/entities/PvPTower.ts`
- `game/src/entities/PvPUnit.ts`

## Validação
- Instanciar cada entidade em uma scene de teste com dados mock
- Chamar `updateHp()` e `moveTo()` e verificar que animações funcionam

## Estimativa
- Tamanho: L (4-8h)
