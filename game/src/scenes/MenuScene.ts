import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/map.ts'
import { NetworkManager } from '../network/NetworkManager.ts'
import type { Room } from 'colyseus.js'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  private makeMenuButton(
    x: number, y: number, w: number, h: number,
    label: string, onClick: () => void,
    tintHover = 0xddeeFF,
    tintPress?: number,
  ): void {
    const normal  = this.add.nineslice(x, y,     'btn-blue',       undefined, w, h, 32, 32, 32, 32).setInteractive({ cursor: 'pointer' })
    const pressed = this.add.nineslice(x, y + 4, 'btn-blue-press', undefined, w, h, 32, 32, 32, 32).setVisible(false)
    const txt = this.add.text(x, y, label, {
      fontSize: '20px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#1a3a6a', strokeThickness: 4,
    }).setOrigin(0.5)

    if (tintPress !== undefined) normal.setTint(tintPress)

    const reset = () => {
      normal.setTint(tintPress ?? 0xffffff)
      if (tintPress === undefined) normal.clearTint()
      normal.setVisible(true)
      pressed.setVisible(false)
      txt.setY(y)
    }
    const applyPressed = () => {
      normal.setVisible(false)
      pressed.setVisible(true)
      txt.setY(y + 4)
    }

    normal.on('pointerover', () => normal.setTint(tintHover))
    normal.on('pointerout',  reset)
    normal.on('pointerdown', applyPressed)
    normal.on('pointerup',   () => { reset(); onClick() })
    pressed.setInteractive({ cursor: 'pointer' })
    pressed.on('pointerup', () => { reset(); onClick() })
    pressed.on('pointerout', reset)
  }

  create(): void {
    // ── Background — tiled wood table texture ─────────────────────────────
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'wood-table')
      .setOrigin(0, 0)
      .setTileScale(0.6)
      .setAlpha(0.25)

    // Dark overlay
    const bg = this.add.graphics()
    bg.fillStyle(0x0d1520, 0.82)
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // ── Decorative castles ────────────────────────────────────────────────
    // Red castle (enemy) — left side
    this.add.image(80, GAME_HEIGHT / 2 + 30, 'castle-red')
      .setScale(0.65)
      .setAlpha(0.55)
      .setFlipX(true)
      .setTint(0xff8888)

    // Blue castle (player) — right side
    this.add.image(GAME_WIDTH - 80, GAME_HEIGHT / 2 + 30, 'castle-blue')
      .setScale(0.65)
      .setAlpha(0.55)
      .setTint(0x8888ff)

    // ── Decorative border ─────────────────────────────────────────────────
    const border = this.add.graphics()
    border.lineStyle(3, 0x8B6914, 0.9)
    border.strokeRect(24, 24, GAME_WIDTH - 48, GAME_HEIGHT - 48)
    border.lineStyle(1, 0xffd700, 0.4)
    border.strokeRect(28, 28, GAME_WIDTH - 56, GAME_HEIGHT - 56)

    // ── Title area — banner background ────────────────────────────────────
    const titleBg = this.add.graphics()
    titleBg.fillStyle(0x1a0a00, 0.7)
    titleBg.fillRoundedRect(GAME_WIDTH / 2 - 280, 140, 560, 120, 12)
    titleBg.lineStyle(2, 0x8B6914, 0.8)
    titleBg.strokeRoundedRect(GAME_WIDTH / 2 - 280, 140, 560, 120, 12)
    titleBg.lineStyle(1, 0xffd700, 0.3)
    titleBg.strokeRoundedRect(GAME_WIDTH / 2 - 275, 145, 550, 110, 10)

    // Title
    this.add.text(GAME_WIDTH / 2, 178, 'TOWER DEFENSE', {
      fontSize: '60px',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#3a1a00',
      strokeThickness: 7,
    }).setOrigin(0.5)

    this.add.text(GAME_WIDTH / 2, 238, '✦  Tiny Swords  ✦', {
      fontSize: '22px',
      color: '#e8c87a',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5)

    // ── Instructions panel ────────────────────────────────────────────────
    const instrBg = this.add.graphics()
    instrBg.fillStyle(0x0a1020, 0.65)
    instrBg.fillRoundedRect(GAME_WIDTH / 2 - 260, 290, 520, 160, 8)
    instrBg.lineStyle(1, 0x4466aa, 0.5)
    instrBg.strokeRoundedRect(GAME_WIDTH / 2 - 260, 290, 520, 160, 8)

    const instructions = [
      'Defend your castle against 10 waves of enemies',
      'Press 1-4 or click buttons to select tower type',
      'Click a slot to place a tower',
      'Press SPACE to start the next wave early',
    ]
    instructions.forEach((line, i) => {
      this.add.text(GAME_WIDTH / 2, 312 + i * 30, line, {
        fontSize: '16px',
        color: '#ccddff',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5)
    })

    // ── Tower legend ──────────────────────────────────────────────────────
    const legendBg = this.add.graphics()
    legendBg.fillStyle(0x0a1020, 0.5)
    legendBg.fillRoundedRect(GAME_WIDTH / 2 - 340, 478, 680, 80, 8)
    legendBg.lineStyle(1, 0x4466aa, 0.4)
    legendBg.strokeRoundedRect(GAME_WIDTH / 2 - 340, 478, 680, 80, 8)

    const towerDefs = [
      { type: 'building-archery',    name: 'Archer',  key: '1', cost: '60g',  color: '#88aaff' },
      { type: 'building-barracks',   name: 'Warrior', key: '2', cost: '90g',  color: '#ff8888' },
      { type: 'building-tower',      name: 'Lancer',  key: '3', cost: '120g', color: '#ffcc66' },
      { type: 'building-monastery',  name: 'Monk',    key: '4', cost: '100g', color: '#88ffaa' },
    ]

    const spacing = 680 / 4
    towerDefs.forEach((t, i) => {
      const tx = GAME_WIDTH / 2 - 340 + spacing * i + spacing / 2
      const ty = 518

      const icon = this.add.image(tx - 20, ty, t.type)
      icon.setScale(40 / Math.max(icon.width, icon.height))

      this.add.text(tx + 10, ty - 10, `[${t.key}] ${t.name}`, {
        fontSize: '13px', fontStyle: 'bold', color: t.color,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0, 0.5)
      this.add.text(tx + 10, ty + 10, t.cost, {
        fontSize: '12px', color: '#ffdd66',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0, 0.5)
    })

    // ── Buttons ───────────────────────────────────────────────────────────
    const btnX = GAME_WIDTH / 2
    const btnW = 260
    const btnH = 66

    this.makeMenuButton(btnX, 570, btnW, btnH, 'TOWER DEFENSE', () => {
      this.scene.start('GameScene')
      this.scene.launch('UIScene')
    })

    this.makeMenuButton(btnX, 655, btnW, btnH, '⚔  KINGDOM WARS', () => {
      this.scene.start('LobbyScene')
    }, 0xb84a00, 0x7a2e00)

    this.input.keyboard!.once('keydown-ENTER', () => {
      this.scene.start('GameScene')
      this.scene.launch('UIScene')
    })
    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene')
      this.scene.launch('UIScene')
    })

    void this.tryResumePvpSession()
  }

  private async tryResumePvpSession(): Promise<void> {
    const loading = this.add.text(GAME_WIDTH / 2, 710, 'Tentando reconectar partida PvP...', {
      fontSize: '14px',
      color: '#ffdd88',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5)

    const room = await NetworkManager.get().reconnectFromStoredSession()
    if (!room) {
      loading.destroy()
      return
    }

    const side = this.resolveMySide(room)
    this.scene.start('PvPGameScene', { room, side })
  }

  private resolveMySide(room: Room): 'left' | 'right' {
    const players = (room.state as { players?: { get?: (id: string) => { side?: string } | undefined } }).players
    const me = players?.get?.(room.sessionId)
    return me?.side === 'right' ? 'right' : 'left'
  }
}
