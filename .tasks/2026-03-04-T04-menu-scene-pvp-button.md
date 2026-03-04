# T04 - MenuScene botão Kingdom Wars

## Contexto
O MenuScene existente só tem o botão de Tower Defense. Precisa de um segundo botão para acessar o modo PvP Kingdom Wars.

## Objetivo
Adicionar botão "Kingdom Wars" ao MenuScene que navega para LobbyScene, sem alterar o fluxo existente de Tower Defense.

## Escopo
- Adicionar botão "Kingdom Wars" abaixo do botão existente "Start" no MenuScene
- Estilizar com mesmo padrão visual (nineslice BigBlueButton, medieval theme)
- Click → `this.scene.start('LobbyScene')`
- Registrar LobbyScene na lista de scenes do Phaser config (`config.ts`)
- Ajustar layout do menu para acomodar dois botões (espaçamento vertical)

## Fora de Escopo
- LobbyScene em si (T03)
- Qualquer alteração no fluxo Tower Defense

## Dependências
- T03 (LobbyScene precisa existir para a navegação funcionar)

## Parallel Group
- None

## Critérios de Aceite
- [ ] MenuScene mostra dois botões: "Tower Defense" e "Kingdom Wars"
- [ ] "Tower Defense" continua funcionando como antes
- [ ] "Kingdom Wars" navega para LobbyScene
- [ ] Layout visual consistente entre os dois botões
- [ ] LobbyScene registrada no Phaser config

## Entregáveis
- Edição em `game/src/scenes/MenuScene.ts`
- Edição em `game/src/config.ts` (adicionar LobbyScene)

## Validação
- Abrir jogo → menu mostra dois botões → clicar "Kingdom Wars" → LobbyScene aparece
- Clicar "Tower Defense" → jogo single-player funciona normalmente

## Estimativa
- Tamanho: S (1-2h)
