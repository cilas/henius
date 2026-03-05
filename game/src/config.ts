import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from './config/map.ts'
import { BootScene } from './scenes/BootScene.ts'
import { MenuScene } from './scenes/MenuScene.ts'
import { GameScene } from './scenes/GameScene.ts'
import { UIScene } from './scenes/UIScene.ts'
import { LobbyScene } from './scenes/LobbyScene.ts'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  scene: [BootScene, MenuScene, GameScene, UIScene, LobbyScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}
