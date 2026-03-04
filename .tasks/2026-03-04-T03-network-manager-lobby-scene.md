# T03 - NetworkManager + LobbyScene no cliente

## Contexto
O cliente Phaser precisa se conectar ao servidor Colyseus e oferecer uma UI de lobby onde jogadores criam/entram em salas.

## Objetivo
`NetworkManager` funcional que conecta ao Colyseus e `LobbyScene` com UI completa de lobby (criar sala, entrar com código, ver status dos jogadores, botão ready).

## Escopo
- Instalar `colyseus.js` no pacote `game/`
- `NetworkManager` class: connect to server, create room, join room by code, send messages, listen to state changes, disconnect
- `RoomClient` helper: wrappers para create/join com tratamento de erro
- `LobbyScene` Phaser scene:
  - Botão "Criar Sala" → chama NetworkManager.createRoom() → mostra código da sala
  - Input de texto "Código da Sala" + botão "Entrar"
  - Lista de jogadores na sala (Player 1: ready/not ready, Player 2: ready/not ready)
  - Botão "Ready" → envia message "ready"
  - Quando ambos ready → transição para PvPGameScene (placeholder por enquanto)
- Botão "Voltar" → retorna ao MenuScene
- Tratamento de erros: sala não encontrada, sala cheia, servidor offline

## Fora de Escopo
- PvPGameScene (T07)
- StateListener para gameplay (T10)
- Reconexão automática (T11)

## Dependências
- T01 (shared types para mensagens)

## Parallel Group
- None (paralelo com T02 após T01)

## Critérios de Aceite
- [ ] `colyseus.js` instalado e importável no cliente
- [ ] `NetworkManager` conecta ao servidor local e expõe room state
- [ ] LobbyScene renderiza com botões Criar/Entrar/Ready/Voltar
- [ ] Criar sala mostra código de 6 caracteres na tela
- [ ] Entrar com código conecta à sala existente
- [ ] Status dos jogadores atualiza em tempo real (ready/not ready)
- [ ] Ambos ready → scene transition (pode ser para scene placeholder)
- [ ] Erro de conexão mostra mensagem amigável

## Entregáveis
- `game/src/network/NetworkManager.ts`
- `game/src/network/RoomClient.ts`
- `game/src/scenes/LobbyScene.ts`

## Validação
- Abrir dois browsers, criar sala em um, copiar código, entrar no outro
- Ambos marcam ready → ambos transicionam para próxima scene

## Estimativa
- Tamanho: L (4-8h)
