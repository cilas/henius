import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/map.ts'
import { TOTAL_WAVES } from '../config/waves.ts'
import { TOWER_CONFIGS, type TowerType } from '../config/towers.ts'
import { Tower } from '../entities/Tower.ts'

const HUD_HEIGHT = 80
const BTN_W = 148
const BTN_H = 66
const BTN_SPACING = 8
const PANEL_Y = GAME_HEIGHT - HUD_HEIGHT / 2

export class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text
  private livesText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private towerButtons: Map<TowerType, Phaser.GameObjects.Container> = new Map()
  private selectedType: TowerType | null = null
  private statusText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'UIScene' })
  }

  create(): void {
    // ── HUD background — tiled WoodTable texture ───────────────────────────
    this.add.tileSprite(0, GAME_HEIGHT - HUD_HEIGHT, GAME_WIDTH, HUD_HEIGHT, 'wood-table')
      .setOrigin(0, 0)
      .setTileScale(HUD_HEIGHT / 448, HUD_HEIGHT / 448)

    // Dark overlay for readability
    const panelOverlay = this.add.graphics()
    panelOverlay.fillStyle(0x000000, 0.35)
    panelOverlay.fillRect(0, GAME_HEIGHT - HUD_HEIGHT, GAME_WIDTH, HUD_HEIGHT)

    // Top border line
    panelOverlay.lineStyle(3, 0x8B6914, 0.9)
    panelOverlay.lineBetween(0, GAME_HEIGHT - HUD_HEIGHT, GAME_WIDTH, GAME_HEIGHT - HUD_HEIGHT)
    panelOverlay.lineStyle(1, 0xFFD700, 0.4)
    panelOverlay.lineBetween(0, GAME_HEIGHT - HUD_HEIGHT + 3, GAME_WIDTH, GAME_HEIGHT - HUD_HEIGHT + 3)

    // ── Stats bar (top) ───────────────────────────────────────────────────
    const statsBg = this.add.graphics()
    statsBg.fillStyle(0x0d0d1a, 0.82)
    statsBg.fillRect(0, 0, GAME_WIDTH, 38)
    statsBg.lineStyle(1, 0x8B6914, 0.6)
    statsBg.lineBetween(0, 37, GAME_WIDTH, 37)

    this.waveText = this.add.text(16, 9, 'Wave 0/10', {
      fontSize: '18px', fontStyle: 'bold', color: '#ffd700',
      stroke: '#000000', strokeThickness: 3,
    })

    // Gold icon + text
    this.add.image(GAME_WIDTH / 2 - 52, 19, 'gold-icon')
      .setScale(0.22)
      .setOrigin(1, 0.5)
    this.goldText = this.add.text(GAME_WIDTH / 2 - 36, 9, '150g', {
      fontSize: '18px', fontStyle: 'bold', color: '#ffdd00',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0)

    // Heart + lives
    this.add.text(GAME_WIDTH - 16, 9, '❤️', {
      fontSize: '18px',
    }).setOrigin(1, 0)
    this.livesText = this.add.text(GAME_WIDTH - 44, 9, '20', {
      fontSize: '18px', fontStyle: 'bold', color: '#ff6666',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0)

    // Status / timer text
    this.timerText = this.add.text(GAME_WIDTH / 2, 9, '', {
      fontSize: '15px', color: '#aaffaa',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0)

    // ── Tower buttons ──────────────────────────────────────────────────────
    const towerTypes: TowerType[] = ['archer', 'warrior', 'lancer', 'monk']
    const totalBtnsW = towerTypes.length * BTN_W + (towerTypes.length - 1) * BTN_SPACING
    const startX = (GAME_WIDTH - totalBtnsW) / 2

    towerTypes.forEach((type, i) => {
      const cfg = TOWER_CONFIGS[type]
      const bx = startX + i * (BTN_W + BTN_SPACING) + BTN_W / 2
      const by = PANEL_Y

      const container = this.createTowerButton(bx, by, type, cfg)
      this.towerButtons.set(type, container)

      container.setInteractive(
        new Phaser.Geom.Rectangle(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H),
        Phaser.Geom.Rectangle.Contains,
      )
      container.on('pointerover', () => {
        if (this.selectedType !== type) this.setButtonHighlight(container, false, true)
      })
      container.on('pointerout', () => {
        if (this.selectedType !== type) this.setButtonHighlight(container, false, false)
      })
      container.on('pointerdown', () => this.handleTowerSelect(type))
    })

    // ── Deselect button ────────────────────────────────────────────────────
    const deselX = GAME_WIDTH - 56
    const deselBg = this.add.graphics()
    deselBg.fillStyle(0x2a2a2a, 0.85)
    deselBg.fillRoundedRect(deselX - 46, PANEL_Y - 26, 92, 52, 6)
    deselBg.lineStyle(1, 0x666666, 0.8)
    deselBg.strokeRoundedRect(deselX - 46, PANEL_Y - 26, 92, 52, 6)
    const deselBtn = this.add.zone(deselX, PANEL_Y, 92, 52).setInteractive({ cursor: 'pointer' })
    this.add.text(deselX, PANEL_Y, '[ESC]\nDeselect', {
      fontSize: '11px', color: '#aaaaaa', align: 'center',
    }).setOrigin(0.5)
    deselBtn.on('pointerdown', () => this.handleTowerSelect(null))

    // ── Skip wave button ───────────────────────────────────────────────────
    const skipX = 56
    const skipBg = this.add.graphics()
    skipBg.fillStyle(0x1a3a1a, 0.9)
    skipBg.fillRoundedRect(skipX - 46, PANEL_Y - 26, 92, 52, 6)
    skipBg.lineStyle(1, 0x44aa44, 0.8)
    skipBg.strokeRoundedRect(skipX - 46, PANEL_Y - 26, 92, 52, 6)
    const skipBtn = this.add.zone(skipX, PANEL_Y, 92, 52).setInteractive({ cursor: 'pointer' })
    this.add.text(skipX, PANEL_Y, '[SPC]\nSend Wave', {
      fontSize: '11px', color: '#88ff88', align: 'center',
    }).setOrigin(0.5)
    skipBtn.on('pointerdown', () => this.game.events.emit('skip-wave-timer'))
    skipBtn.on('pointerover', () => {
      skipBg.clear()
      skipBg.fillStyle(0x2a5a2a, 0.9)
      skipBg.fillRoundedRect(skipX - 46, PANEL_Y - 26, 92, 52, 6)
      skipBg.lineStyle(1, 0x66dd66, 1)
      skipBg.strokeRoundedRect(skipX - 46, PANEL_Y - 26, 92, 52, 6)
    })
    skipBtn.on('pointerout', () => {
      skipBg.clear()
      skipBg.fillStyle(0x1a3a1a, 0.9)
      skipBg.fillRoundedRect(skipX - 46, PANEL_Y - 26, 92, 52, 6)
      skipBg.lineStyle(1, 0x44aa44, 0.8)
      skipBg.strokeRoundedRect(skipX - 46, PANEL_Y - 26, 92, 52, 6)
    })

    // Status text overlay
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, '', {
      fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
      backgroundColor: '#00000088',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(50)

    // ── Listen for game events ─────────────────────────────────────────────
    this.game.events.on('hud-gold', (gold: number) => {
      this.goldText.setText(`${gold}g`)
    })
    this.game.events.on('hud-lives', (lives: number) => {
      this.livesText.setText(`${lives}`)
      if (lives <= 5) this.livesText.setColor('#ff2222')
      else if (lives <= 10) this.livesText.setColor('#ff8800')
      else this.livesText.setColor('#ff6666')
    })
    this.game.events.on('hud-wave', (wave: number) => {
      this.waveText.setText(`Wave ${wave}/${TOTAL_WAVES}`)
    })
    this.game.events.on('hud-state', (state: string) => {
      if (state === 'wave') {
        this.timerText.setText('')
        this.statusText.setText('')
      } else if (state === 'between') {
        this.timerText.setText('Next wave incoming...')
      }
    })
    this.game.events.on('hud-between-timer', (ms: number) => {
      const secs = Math.ceil(ms / 1000)
      this.timerText.setText(`Next wave in ${secs}s  [SPACE to skip]`)
    })
    this.game.events.on('select-tower-from-game', (type: TowerType | null) => {
      this.setSelectedButton(type)
    })
    this.game.events.on('game-over', () => { this.timerText.setText('') })
    this.game.events.on('victory',   () => { this.timerText.setText('') })

    this.input.keyboard!.on('keydown-SPACE', () => {
      this.game.events.emit('skip-wave-timer')
    })
  }

  private createTowerButton(
    bx: number, by: number,
    type: TowerType,
    cfg: { label: string; hotkey: string; cost: number; damage?: number; range: number },
  ): Phaser.GameObjects.Container {
    const container = this.add.container(bx, by)

    // Background slot (WoodTable_Slots scaled to button size)
    const slot = this.add.image(0, 0, 'wood-table-slot')
    slot.setDisplaySize(BTN_W, BTN_H)
    container.add(slot)

    // Dark tint overlay
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.22)
    overlay.fillRoundedRect(-BTN_W / 2 + 2, -BTN_H / 2 + 2, BTN_W - 4, BTN_H - 4, 4)
    container.add(overlay)

    // Building icon (left side)
    const buildingKey = Tower.getBuildingKey(type)
    const icon = this.add.image(-BTN_W / 2 + 28, 0, buildingKey)
    const iconH = Math.min(BTN_H - 8, 56)
    icon.setScale(iconH / Math.max(icon.width, icon.height))
    container.add(icon)

    // Tower name
    container.add(this.add.text(8, -BTN_H / 2 + 11, `[${cfg.hotkey}] ${cfg.label}`, {
      fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5))

    // Stats
    const dmg = cfg.damage !== undefined ? `⚔${cfg.damage}` : '✨aura'
    container.add(this.add.text(8, BTN_H / 2 - 12, `${cfg.cost}g  ${dmg}  🎯${cfg.range}px`, {
      fontSize: '10px', color: '#dddddd',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5))

    return container
  }

  private handleTowerSelect(type: TowerType | null): void {
    this.selectedType = type
    this.setSelectedButton(type)
    this.game.events.emit('select-tower', type)
  }

  private setSelectedButton(type: TowerType | null): void {
    this.selectedType = type
    for (const [t, container] of this.towerButtons) {
      this.setButtonHighlight(container, t === type, false)
    }
  }

  private setButtonHighlight(
    container: Phaser.GameObjects.Container,
    selected: boolean,
    hovered: boolean,
  ): void {
    // The overlay is at index 1
    const overlay = container.getAt(1) as Phaser.GameObjects.Graphics
    overlay.clear()
    if (selected) {
      overlay.fillStyle(0xffd700, 0.18)
      overlay.lineStyle(2, 0xffd700, 1)
      overlay.strokeRoundedRect(-BTN_W / 2 + 2, -BTN_H / 2 + 2, BTN_W - 4, BTN_H - 4, 4)
    } else if (hovered) {
      overlay.fillStyle(0xffffff, 0.12)
      overlay.lineStyle(1, 0xffffff, 0.5)
      overlay.strokeRoundedRect(-BTN_W / 2 + 2, -BTN_H / 2 + 2, BTN_W - 4, BTN_H - 4, 4)
    } else {
      overlay.fillStyle(0x000000, 0.22)
      overlay.fillRoundedRect(-BTN_W / 2 + 2, -BTN_H / 2 + 2, BTN_W - 4, BTN_H - 4, 4)
    }
  }
}
