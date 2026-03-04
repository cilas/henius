# T05 - Mapa PvP espelhado + config

## Contexto
O modo PvP precisa de um mapa diferente do single-player: espelhado, com dois reinos, caminho central, e tower slots para ambos os lados.

## Objetivo
Arquivo `pvp-map.ts` com toda a configuração do mapa PvP: grid expandido, elevation grid, path tiles, waypoints (ambas direções), tower slots por lado, posições dos castelos.

## Escopo
- Grid 40×12 tiles (2560×768)
- `PVP_ELEVATION_GRID[12][40]`: layout espelhado (reino esquerdo = grass_color1, direito = grass_color2, centro = path/water)
- `PVP_PATH_TILES`: tiles do caminho central conectando os dois castelos
- `PVP_WAYPOINTS_LEFT_TO_RIGHT`: waypoints para unidades indo da esquerda para direita
- `PVP_WAYPOINTS_RIGHT_TO_LEFT`: waypoints invertidos
- `PVP_TOWER_SLOTS_LEFT`: slots de torre do reino esquerdo (adjacentes ao caminho)
- `PVP_TOWER_SLOTS_RIGHT`: slots de torre do reino direito
- `PVP_CASTLE_LEFT`: posição do castelo esquerdo
- `PVP_CASTLE_RIGHT`: posição do castelo direito
- Constantes: `PVP_STARTING_GOLD`, `PVP_CASTLE_HP`, `PVP_PASSIVE_INCOME`, `PVP_INCOME_INTERVAL`
- `units.ts`: config de unidades ofensivas (Pawn, Warrior, Lancer, Monk) com custo, HP, dano, velocidade

## Fora de Escopo
- Renderização do mapa (T07)
- Entidades PvP (T06)
- Lógica server-side (T08)

## Dependências
- T01 (shared types para UnitType)

## Parallel Group
- A (paralelo com T06)

## Critérios de Aceite
- [ ] `pvp-map.ts` exporta todas as constantes listadas no escopo
- [ ] Mapa é simétrico (espelhado horizontalmente)
- [ ] Waypoints formam caminho válido do castelo esquerdo ao direito e vice-versa
- [ ] Tower slots estão adjacentes ao caminho e dentro do respectivo reino
- [ ] Castelos estão nas extremidades do mapa
- [ ] `units.ts` exporta config para 4 tipos de unidade com valores balanceados
- [ ] Nenhum arquivo single-player alterado

## Entregáveis
- `game/src/config/pvp-map.ts`
- `game/src/config/units.ts`

## Validação
- Importar configs e verificar que waypoints[0] está perto do castelo esquerdo e waypoints[last] perto do direito
- Verificar simetria: slot[i] do lado esquerdo espelha slot[i] do lado direito

## Estimativa
- Tamanho: M (2-4h)
