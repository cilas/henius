# T01 - Setup shared types + server Colyseus

## Contexto
O modo PvP Kingdom Wars precisa de um servidor Colyseus e tipos compartilhados entre cliente e servidor. Este é o alicerce que desbloqueia todo o trabalho subsequente.

## Objetivo
Ter o pacote `shared/` com tipos TypeScript e o pacote `server/` com Colyseus rodando localmente, com um room vazio que aceita conexões.

## Escopo
- Criar pacote `shared/` com `package.json`, `tsconfig.json`
- Definir tipos em `shared/src/`: `GameTypes.ts` (TowerType, UnitType), `MessageTypes.ts` (mensagens client→server), `Constants.ts` (valores de balanceamento)
- Criar pacote `server/` com Colyseus app (`npm create colyseus-app` ou setup manual)
- Room placeholder `KingdomWarsRoom` que aceita conexões e loga join/leave
- Script `npm run dev` no server que sobe o Colyseus em localhost
- Configurar referência entre pacotes (workspace ou path imports)

## Fora de Escopo
- Schemas de estado do jogo (T02)
- Cliente Phaser (T03)
- Lógica de gameplay

## Dependências
- Nenhuma

## Parallel Group
- None (é o ponto de partida)

## Critérios de Aceite
- [ ] `shared/` compila sem erros e exporta tipos `TowerType`, `UnitType`, `MessageTypes`
- [ ] `server/` sobe com `npm run dev` e loga "Colyseus listening on ws://localhost:2567"
- [ ] `KingdomWarsRoom` registrado e acessível (testável via Colyseus playground ou wscat)
- [ ] Cliente Phaser existente continua funcionando sem alterações (`npm run dev` no `game/`)

## Entregáveis
- `shared/package.json`, `shared/tsconfig.json`, `shared/src/*.ts`
- `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`, `server/src/rooms/KingdomWarsRoom.ts`

## Validação
- `cd server && npm run dev` → servidor sobe sem erros
- Conectar via WebSocket em `ws://localhost:2567` → conexão aceita

## Estimativa
- Tamanho: M (2-4h)
