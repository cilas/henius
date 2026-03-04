import Phaser from 'phaser'
import {
  TILE_SIZE, GRID_COLS, GRID_ROWS,
  GAME_WIDTH, GAME_HEIGHT,
  PATH_TILES, TOWER_SLOTS,
  CASTLE_POSITION, SPAWN_POINT,
  ELEVATION_GRID
} from '../config/map.ts'
import type { TowerType } from '../config/towers.ts'
import { WaveManager } from '../systems/WaveManager.ts'
import { TowerManager } from '../systems/TowerManager.ts'
import { EconomyManager } from '../systems/EconomyManager.ts'

export class GameScene extends Phaser.Scene {
  private waveManager!: WaveManager
  private towerManager!: TowerManager
  private economy!: EconomyManager
  private isGameOver: boolean = false
  private isVictory: boolean = false

  // Keyboard
  private keySpace!: Phaser.Input.Keyboard.Key
  private key1!: Phaser.Input.Keyboard.Key
  private key2!: Phaser.Input.Keyboard.Key
  private key3!: Phaser.Input.Keyboard.Key
  private key4!: Phaser.Input.Keyboard.Key
  private keyEsc!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    this.isGameOver = false
    this.isVictory = false

    // ── Map rendering ──────────────────────────────────────────────────────
    this.renderMap()

    // ── Economy ────────────────────────────────────────────────────────────
    this.economy = new EconomyManager(
      (gold) => this.game.events.emit('hud-gold', gold),
      (lives) => this.game.events.emit('hud-lives', lives),
    )

    // ── Tower Manager ──────────────────────────────────────────────────────
    this.towerManager = new TowerManager(
      this,
      this.economy,
      (_type, _col, _row) => {
        this.game.events.emit('hud-gold', this.economy.gold)
      },
    )

    // ── Wave Manager ───────────────────────────────────────────────────────
    this.waveManager = new WaveManager(
      this,
      (reward) => {
        this.economy.addGold(reward)
        this.showFloatingText(
          `+${reward}g`,
          Phaser.Math.Between(100, GAME_WIDTH - 100),
          Phaser.Math.Between(100, GAME_HEIGHT - 200),
          0xffdd00,
        )
      },
      () => {
        const gameOver = this.economy.loseLife()
        if (gameOver) {
          this.triggerGameOver()
        }
        return gameOver
      },
      (wave) => {
        this.game.events.emit('hud-wave', wave)
        this.game.events.emit('hud-state', 'wave')
      },
      (_wave) => {
        this.game.events.emit('hud-state', 'between')
        this.game.events.emit('hud-between-timer', this.waveManager.betweenTimer)
      },
      () => {
        this.triggerVictory()
      },
    )

    // ── Keyboard ───────────────────────────────────────────────────────────
    const kbd = this.input.keyboard!
    this.keySpace = kbd.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.key1 = kbd.addKey(Phaser.Input.Keyboard.KeyCodes.ONE)
    this.key2 = kbd.addKey(Phaser.Input.Keyboard.KeyCodes.TWO)
    this.key3 = kbd.addKey(Phaser.Input.Keyboard.KeyCodes.THREE)
    this.key4 = kbd.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR)
    this.keyEsc = kbd.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

    // ── Listen for UI tower selection ──────────────────────────────────────
    this.game.events.on('select-tower', (type: TowerType | null) => {
      this.towerManager.selectTower(type)
    })

    // ── Initial HUD state ──────────────────────────────────────────────────
    this.game.events.emit('hud-gold', this.economy.gold)
    this.game.events.emit('hud-lives', this.economy.lives)
    this.game.events.emit('hud-wave', 0)
    this.game.events.emit('hud-state', 'between')

    // ── Start first wave after short delay ─────────────────────────────────
    this.waveManager.startFirstWave(5000)
    this.game.events.emit('hud-between-timer', 5000)
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver || this.isVictory) return

    // Keyboard shortcuts for tower selection
    if (Phaser.Input.Keyboard.JustDown(this.key1)) this.selectTowerKey('archer')
    if (Phaser.Input.Keyboard.JustDown(this.key2)) this.selectTowerKey('warrior')
    if (Phaser.Input.Keyboard.JustDown(this.key3)) this.selectTowerKey('lancer')
    if (Phaser.Input.Keyboard.JustDown(this.key4)) this.selectTowerKey('monk')
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) this.selectTowerKey(null)

    // Skip wave delay with SPACE
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this.waveManager.skipWait()
    }

    // Update between-timer display
    if (this.waveManager.state === 'between') {
      this.game.events.emit('hud-between-timer', this.waveManager.betweenTimer)
    }

    this.waveManager.update(delta)
    this.towerManager.update(delta, this.waveManager.enemies)
  }

  private selectTowerKey(type: TowerType | null): void {
    this.towerManager.selectTower(type)
    this.game.events.emit('select-tower-from-game', type)
  }

  private renderMap(): void {
    // ── Layer 0: Water background (teal) ────────────────────────────────────
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'water-bg')
      .setOrigin(0, 0)
      .setDepth(-2)

    // ── Setup Tilemaps ─────────────────────────────────────────────────────
    const map = this.make.tilemap({ tileWidth: 64, tileHeight: 64, width: GRID_COLS, height: GRID_ROWS })
    const tilesetGrass = map.addTilesetImage('tilemap', 'tilemap', 64, 64, 0, 0)!
    const tilesetSand = map.addTilesetImage('tilemap-sand', 'tilemap-sand', 64, 64, 0, 0)!

    const layer0 = map.createBlankLayer('level0', tilesetSand)!
    const layer1 = map.createBlankLayer('level1', tilesetGrass)!
    
    layer0.setDepth(-1)
    layer1.setDepth(0)

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const elev = ELEVATION_GRID[r][c]
        
        // ── Water Foam on edges
        if (elev >= 0) {
          const bordersWater = [
            [0, -1], [0, 1], [-1, 0], [1, 0]
          ].some(([dc, dr]) => (ELEVATION_GRID[r + dr]?.[c + dc] ?? -1) === -1)
          
          if (bordersWater) {
            const foam = this.add.sprite(
              c * TILE_SIZE + TILE_SIZE / 2,
              r * TILE_SIZE + TILE_SIZE / 2,
              'water-foam',
            )
            foam.setScale(64 / 192)
            foam.setDepth(-1.5)
            foam.setAlpha(0.6)
            foam.play('water-foam')
            foam.anims.setProgress(Math.random())
          }
        }

        // ── Layer 0: Flat Ground (Sand)
        if (elev >= 0) {
          const isL0 = (cc: number, rr: number) => (ELEVATION_GRID[rr]?.[cc] ?? -1) >= 0
          layer0.putTileAt(this.getGrassTile(c, r, isL0), c, r)
        }

        // ── Layer 1: Elevated Ground (Grass) & Cliffs
        if (elev >= 1) {
          const isL1 = (cc: number, rr: number) => (ELEVATION_GRID[rr]?.[cc] ?? -1) >= 1
          layer1.putTileAt(this.getGrassTile(c, r, isL1), c, r)
        } else {
          // Put cliff face if tile above is elevated
          if (r > 0 && ELEVATION_GRID[r - 1][c] >= 1) {
            const isL1Above = (cc: number, rr: number) => (ELEVATION_GRID[rr]?.[cc] ?? -1) >= 1
            layer1.putTileAt(this.getCliffTile(c, r - 1, isL1Above), c, r)
            
            // Put shadow
            this.add.image(
              c * TILE_SIZE + TILE_SIZE / 2,
              r * TILE_SIZE,
              'shadow',
            )
              .setOrigin(0.5, 0)
              .setAlpha(0.55)
              .setDepth(-0.5)
          }
        }
      }
    }

    // ── Tower-slot highlight ─────────────
    const slotGfx = this.add.graphics().setDepth(1)
    slotGfx.lineStyle(1, 0x88ff88, 0.2)
    slotGfx.fillStyle(0x88ff88, 0.06)
    for (const [c, r] of TOWER_SLOTS) {
      slotGfx.fillRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      slotGfx.strokeRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
    }

    // ── Buildings ────────────────────────────────────────────────────────────
    this.add.image(SPAWN_POINT.x + TILE_SIZE * 1.5, SPAWN_POINT.y + TILE_SIZE / 2, 'castle-red')
      .setScale(0.5)
      .setOrigin(0.5, 1)
      .setDepth(SPAWN_POINT.y + TILE_SIZE / 2)
      .setFlipX(true)

    this.add.image(CASTLE_POSITION.x + TILE_SIZE * 0.5, CASTLE_POSITION.y + TILE_SIZE / 2, 'castle-blue')
      .setScale(0.5)
      .setOrigin(0.5, 1)
      .setDepth(CASTLE_POSITION.y + TILE_SIZE / 2)

    this.createCastleHpBar()
  }

  // ── Autotile helpers ──────────────────────────────────────────────────────

  private getGrassTile(col: number, row: number, isSameType: (c: number, r: number) => boolean): number {
    const N = isSameType(col, row - 1)
    const S = isSameType(col, row + 1)
    const W = isSameType(col - 1, row)
    const E = isSameType(col + 1, row)

    let tileRow: number
    if (!N &&  S) tileRow = 0
    else if (N &&  S) tileRow = 1
    else if (N && !S) tileRow = 2
    else              tileRow = 3

    let tileCol: number
    if (!W &&  E) tileCol = 5
    else if (W && !E) tileCol = 8
    else if (W &&  E) tileCol = (col + row) % 2 === 0 ? 6 : 7
    else              tileCol = 6

    return tileRow * 9 + tileCol
  }

  private getCliffTile(grassCol: number, grassRow: number, isSameType: (c: number, r: number) => boolean): number {
    const W = isSameType(grassCol - 1, grassRow)
    const E = isSameType(grassCol + 1, grassRow)

    let tileCol: number
    if (!W &&  E) tileCol = 5
    else if (W && !E) tileCol = 8
    else              tileCol = (grassCol) % 2 === 0 ? 6 : 7

    return 4 * 9 + tileCol
  }

  private castleBarFill?: Phaser.GameObjects.TileSprite
  private castleBarBase?: Phaser.GameObjects.Image

  private createCastleHpBar(): void {
    const BAR_W = 160
    const BAR_H = 20
    const cx = CASTLE_POSITION.x - 40
    const cy = CASTLE_POSITION.y - 72

    // Fill tile (tinted green, clipped to current hp ratio)
    this.castleBarFill = this.add.tileSprite(cx, cy, BAR_W, BAR_H, 'bar-big-fill')
    this.castleBarFill.setOrigin(0, 0.5)
    this.castleBarFill.setTileScale(BAR_H / 64, BAR_H / 64)
    this.castleBarFill.setDepth(25000)
    this.castleBarFill.setTint(0x33ee44)

    // Base frame over fill
    this.castleBarBase = this.add.image(cx + BAR_W / 2, cy, 'bar-big-base')
    this.castleBarBase.setDisplaySize(BAR_W, BAR_H)
    this.castleBarBase.setDepth(25001)

    this.updateCastleHpBar()
    this.game.events.on('hud-lives', () => this.updateCastleHpBar())
  }

  private updateCastleHpBar(): void {
    if (!this.castleBarFill) return
    const ratio = this.economy ? this.economy.lives / 20 : 1
    const BAR_W = 160

    this.castleBarFill.setSize(BAR_W * ratio, 20)
    const tint = ratio > 0.5 ? 0x33ee44 : ratio > 0.25 ? 0xffaa00 : 0xee2222
    this.castleBarFill.setTint(tint)
  }

  private triggerGameOver(): void {
    if (this.isGameOver) return
    this.isGameOver = true
    this.game.events.emit('game-over')

    // Stop all enemy movement visually
    this.time.delayedCall(100, () => {
      this.showEndOverlay('GAME OVER', 0xcc2222, () => {
        this.scene.stop('UIScene')
        this.scene.start('MenuScene')
      })
    })
  }

  private triggerVictory(): void {
    if (this.isVictory) return
    this.isVictory = true
    this.game.events.emit('victory')

    this.showEndOverlay('VICTORY!', 0x22cc88, () => {
      this.scene.stop('UIScene')
      this.scene.start('MenuScene')
    })
  }

  private showEndOverlay(text: string, color: number, onRestart: () => void): void {
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    overlay.setDepth(30000)

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, text, {
      fontSize: '72px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(30001)

    const btn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 220, 55, 0x4488ff)
    btn.setDepth(30001)
    btn.setInteractive({ cursor: 'pointer' })

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'Main Menu', {
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(30002)

    btn.on('pointerover', () => btn.setFillStyle(0x66aaff))
    btn.on('pointerout', () => btn.setFillStyle(0x4488ff))
    btn.on('pointerdown', onRestart)
  }

  private showFloatingText(text: string, x: number, y: number, color: number): void {
    const t = this.add.text(x, y, text, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 2,
    }).setDepth(20000).setOrigin(0.5)

    this.tweens.add({
      targets: t,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    })
  }
}
