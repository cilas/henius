# T09 - Economia PvP + condição de vitória

## Contexto
O jogo precisa de um ciclo econômico (ganhar e gastar ouro) e condições claras de fim de partida para funcionar como jogo competitivo.

## Objetivo
Sistema de economia funcional (renda passiva, kill rewards, custos) e todas as condições de vitória implementadas (castelo destruído, timeout, surrender).

## Escopo
- Economia no `GameSimulation`:
  - Renda passiva: +5 gold a cada 10 segundos para cada jogador
  - Kill rewards: matar unidade inimiga → +gold (baseado no tipo da unidade)
  - Tower destroy reward: destruir torre → +gold (baseado no tipo)
  - Custo de deploy de unidade (debitar gold ao enviar)
  - Custo de construção de torre (debitar gold ao colocar)
  - Validação server-side: rejeitar ação se gold insuficiente
- Condições de vitória:
  - Castelo inimigo HP ≤ 0 → phase = "ended", broadcast `game_over` com winnerId
  - Timeout 10 minutos → phase = "ended", maior HP restante vence (empate se igual)
  - Surrender → phase = "ended", oponente vence
- Timer de partida no `GameState` (decresce durante battle phase)
- Balanceamento inicial (valores do PRD):
  - Pawn: 30g custo, 15g reward | Warrior: 60g/30g | Lancer: 80g/40g | Monk: 70g/35g
  - Passive income: 5g/10s | Starting gold: 200g

## Fora de Escopo
- Anti-spam scaling de custos (feature futura)
- UI de economia (T10)
- Balanceamento fino (T12)

## Dependências
- T08 (GameSimulation base)

## Parallel Group
- B (sequencial após T08)

## Critérios de Aceite
- [ ] Jogadores recebem renda passiva a cada 10 segundos (gold incrementa no schema)
- [ ] Matar unidade inimiga adiciona gold ao matador
- [ ] Destruir torre inimiga adiciona gold
- [ ] Ação rejeitada se gold insuficiente (mensagem de erro ao client)
- [ ] Castelo HP ≤ 0 → game_over broadcast com winner correto
- [ ] Timer de 10 min esgota → game_over com winner por HP
- [ ] Surrender → game_over imediato
- [ ] Gold nunca fica negativo

## Entregáveis
- Edição em `server/src/GameSimulation.ts` (economia + victory)
- Edição em `server/src/rooms/KingdomWarsRoom.ts` (surrender handler, timer)
- `server/src/config/balance.ts` (constantes de balanceamento)

## Validação
- Observar gold incrementando a cada 10s no Colyseus playground
- Enviar unidade, ver gold debitar; unidade morre, ver gold do oponente incrementar
- Causar dano suficiente ao castelo → game_over aparece no state

## Estimativa
- Tamanho: M (2-4h)
