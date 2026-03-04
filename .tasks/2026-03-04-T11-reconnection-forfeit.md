# T11 - Reconexão + forfeit automático

## Contexto
Em jogos multiplayer, desconexões são inevitáveis. O jogador precisa poder reconectar sem perder a partida, mas o oponente não deve ficar esperando indefinidamente.

## Objetivo
Reconexão automática funcional (30s timeout) e forfeit automático se o jogador não reconectar.

## Escopo
- Server-side (`KingdomWarsRoom`):
  - `onLeave`: chamar `allowReconnection(client, 30)` — 30 segundos para reconectar
  - Se reconectar: restaurar player state, continuar partida
  - Se não reconectar: forfeit automático, oponente vence
  - Pausar simulação enquanto jogador está desconectado (opcional, decidir durante implementação)
- Client-side (`NetworkManager`):
  - Detectar desconexão (WebSocket close event)
  - Tentar reconectar automaticamente com `client.reconnect(roomId, sessionId)`
  - UI: mostrar overlay "Reconectando..." com countdown
  - Se reconectar: remover overlay, continuar jogando
  - Se falhar: mostrar "Desconectado" e botão voltar ao menu
- Guardar `sessionId` e `roomId` em sessionStorage para sobreviver a refresh

## Fora de Escopo
- Reconexão após fechar o browser completamente
- Persistência de partida em banco de dados
- Spectator mode

## Dependências
- T10 (integração cliente-servidor funcionando)

## Parallel Group
- None

## Critérios de Aceite
- [ ] Desconectar um client (fechar tab) → servidor aguarda 30s
- [ ] Reabrir tab dentro de 30s → reconecta e partida continua
- [ ] Não reconectar em 30s → oponente recebe vitória automática
- [ ] Client mostra overlay "Reconectando..." durante tentativa
- [ ] Refresh da página (F5) reconecta via sessionStorage
- [ ] Oponente vê indicação de que o adversário desconectou

## Entregáveis
- Edição em `server/src/rooms/KingdomWarsRoom.ts` (allowReconnection + forfeit)
- Edição em `game/src/network/NetworkManager.ts` (reconnect logic)
- Overlay de reconexão no PvPGameScene ou PvPUIScene

## Validação
- Jogar partida, fechar uma tab, reabrir → partida continua
- Fechar tab e esperar 30s → oponente vê tela de vitória

## Estimativa
- Tamanho: M (2-4h)
