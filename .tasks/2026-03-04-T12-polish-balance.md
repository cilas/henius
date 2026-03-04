# T12 - Polish visual + tela de resultado + balanceamento

## Contexto
Com o jogo funcional end-to-end, esta task foca em tornar a experiência agradável: efeitos visuais, feedback claro de ações, tela de resultado, e ajuste de valores de balanceamento.

## Objetivo
Experiência de jogo polida com feedback visual claro, tela de resultado informativa, e valores de balanceamento testados.

## Escopo
- Efeitos visuais:
  - Morte de unidade: dust (pawn/warrior) ou explosion (lancer) — reutiliza particles do single-player
  - Torre atacando: flash/projectile visual (pode ser simplificado vs single-player)
  - Torre destruída: explosion + debris
  - Castelo recebendo dano: screen shake leve + flash vermelho
  - Unidade enviada: spawn animation (fade in + dust)
- Feedback de ações:
  - Torre colocada: som + flash verde no slot
  - Ouro insuficiente: flash vermelho no botão + mensagem "Ouro insuficiente"
  - Unidade enviada: flash no botão + counter visual
- Tela de resultado:
  - Overlay ao final: "VITÓRIA" ou "DERROTA" em destaque
  - Stats: unidades enviadas, unidades mortas, torres construídas, torres destruídas, dano ao castelo
  - Botão "Voltar ao Menu"
- Balanceamento:
  - Testar partidas e ajustar: custos, HP, dano, velocidade, renda passiva
  - Garantir que partidas durem 5-10 minutos
  - Garantir que "turtle" (só defender) não seja dominante
  - Documentar valores finais em `balance.ts`

## Fora de Escopo
- Efeitos sonoros / música
- Ranking / leaderboard
- Replay system
- Upgrade de torres

## Dependências
- T10 (jogo funcional end-to-end)

## Parallel Group
- None

## Critérios de Aceite
- [ ] Morte de unidade tem efeito visual (particle)
- [ ] Torres mostram ataque visual (projectile ou flash)
- [ ] Tela de resultado mostra winner + stats + botão voltar
- [ ] Feedback de "ouro insuficiente" aparece ao tentar ação sem gold
- [ ] Partida teste dura entre 5-10 minutos com jogo ativo de ambos lados
- [ ] Valores de balanceamento documentados em `balance.ts`
- [ ] Experiência visual consistente com o tema medieval do single-player

## Entregáveis
- Edições em `PvPGameScene.ts`, `PvPUIScene.ts` (efeitos, feedback, tela de resultado)
- Edições em `PvPUnit.ts`, `PvPTower.ts`, `Castle.ts` (efeitos visuais)
- `server/src/config/balance.ts` atualizado com valores finais

## Validação
- Jogar partida completa → efeitos visuais funcionam em todos os eventos
- Tela de resultado aparece com stats corretos
- Voltar ao menu após resultado funciona

## Estimativa
- Tamanho: L (4-8h)
