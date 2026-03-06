import Phaser from 'phaser'
import type { PlayerSide } from '@kingdom-wars/shared'
import { UNIT_STATS, TOWER_STATS } from '@kingdom-wars/shared'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/map.ts'
import { TOWER_CONFIGS, type TowerType } from '../config/towers.ts'
import { Tower } from '../entities/Tower.ts'
import { PVP_UNIT_ORDER, PVP_UNIT_CONFIGS, type PvpUnitType } from '../config/units.ts'

const HUD_HEIGHT   = 90
const STATS_HEIGHT = 38
const BTN_W        = 134
const BTN_H        = 74
const BTN_GAP      = 4
const PANEL_Y      = GAME_HEIGHT - HUD_HEIGHT / 2

const UNIT_LABELS: Record<PvpUnitType, string> = {
  pawn: 'Pawn', warrior: 'Warrior', lancer: 'Lancer', monk: 'Monk',
}

const TOWER_KEYS: TowerType[] = ['archer', 'warrior', 'lancer', 'monk']

export class PvPUIScene extends Phaser.Scene {
  private mySide: PlayerSide = 'left'
  private currentGold = 200

  private goldText!:   Phaser.GameObjects.Text
  private timerText!:  Phaser.GameObjects.Text
  private connText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private myCastleBar!:     Phaser.GameObjects.Graphics
  private enemyCastleBar!:  Phaser.GameObjects.Graphics

  private selectedTower: TowerType | null = null
  private towerBtns: Map<TowerType,   Phaser.GameObjects.Container> = new Map()
  private unitBtns:  Map<PvpUnitType, Phaser.GameObjects.Container> = new Map()
  private unitSentCountTexts: Map<PvpUnitType, Phaser.GameObjects.Text> = new Map()
  private unitSentCounters: Record<PvpUnitType, number> = {
    pawn: 0, warrior: 0, lancer: 0, monk: 0,
  }
  private eventBindings: Array<{ event: string; fn: (...args: any[]) => void }> = []

  constructor() {
    super({ key: 'PvPUIScene' })
  }

  init(data: { side?: PlayerSide }): void {
    this.mySide = data.side ?? 'left'
  }

  create(): void {
    this.towerBtns = new Map()
    this.unitBtns  = new Map()
    this.unitSentCountTexts = new Map()
    this.unitSentCounters = { pawn: 0, warrior: 0, lancer: 0, monk: 0 }
    this.selectedTower = null

    this.buildStatsBar()
    this.buildHudPanel()
    this.listenEvents()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unlistenEvents())
  }

  // ── Stats bar ─────────────────────────────────────────────────────────────

  private buildStatsBar(): void {
    const bg = this.add.graphics()
    bg.fillStyle(0x0d0d1a, 0.92)
    bg.fillRect(0, 0, GAME_WIDTH, STATS_HEIGHT)
    bg.lineStyle(1, 0x8B6914, 0.6)
    bg.lineBetween(0, STATS_HEIGHT - 1, GAME_WIDTH, STATS_HEIGHT - 1)

    // Gold (left)
    this.add.image(20, STATS_HEIGHT / 2, 'gold-icon').setScale(0.20)
    this.goldText = this.add.text(38, STATS_HEIGHT / 2, '200g', {
      fontSize: '16px', fontStyle: 'bold', color: '#ffdd00',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5)

    // Timer (center)
    this.timerText = this.add.text(GAME_WIDTH / 2, STATS_HEIGHT / 2, '00:00', {
      fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5)

    this.connText = this.add.text(GAME_WIDTH / 2, STATS_HEIGHT - 2, '', {
      fontSize: '11px',
      color: '#ffcc66',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1)

    this.feedbackText = this.add.text(GAME_WIDTH - 8, STATS_HEIGHT - 2, '', {
      fontSize: '11px',
      color: '#ff8888',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 1)

    // My castle HP (left-center)
    const myBarX = GAME_WIDTH * 0.25 + 20
    this.add.text(myBarX - 58, STATS_HEIGHT / 2, '🏰 Mine', {
      fontSize: '10px', color: '#aaffaa',
    }).setOrigin(0, 0.5)
    this.myCastleBar = this.add.graphics()
    this.renderCastleBar(this.myCastleBar, myBarX, 1, 0x33ee44)

    // Enemy castle HP (right-center)
    const enemyBarX = GAME_WIDTH * 0.75 - 20
    this.add.text(enemyBarX - 66, STATS_HEIGHT / 2, '🏰 Enemy', {
      fontSize: '10px', color: '#ffaaaa',
    }).setOrigin(0, 0.5)
    this.enemyCastleBar = this.add.graphics()
    this.renderCastleBar(this.enemyCastleBar, enemyBarX, 1, 0x33ee44)
  }

  private renderCastleBar(
    gfx:   Phaser.GameObjects.Graphics,
    cx:    number,
    ratio: number,
    color: number,
  ): void {
    const W = 96, H = 9
    const bx = cx, by = STATS_HEIGHT / 2 - H / 2
    gfx.clear()
    gfx.fillStyle(0x330000)
    gfx.fillRect(bx, by, W, H)
    gfx.fillStyle(color)
    gfx.fillRect(bx, by, W * Math.max(0, ratio), H)
    gfx.lineStyle(1, 0x000000, 0.8)
    gfx.strokeRect(bx, by, W, H)
  }

  // ── HUD panel ─────────────────────────────────────────────────────────────

  private buildHudPanel(): void {
    const panelY = GAME_HEIGHT - HUD_HEIGHT

    // WoodTable background
    this.add.tileSprite(0, panelY, GAME_WIDTH, HUD_HEIGHT, 'wood-table')
      .setOrigin(0, 0).setTileScale(HUD_HEIGHT / 448, HUD_HEIGHT / 448)

    // Dark overlay + border
    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.38)
    bg.fillRect(0, panelY, GAME_WIDTH, HUD_HEIGHT)
    bg.lineStyle(3, 0x8B6914, 0.9)
    bg.lineBetween(0, panelY, GAME_WIDTH, panelY)
    bg.lineStyle(1, 0xFFD700, 0.3)
    bg.lineBetween(0, panelY + 3, GAME_WIDTH, panelY + 3)

    // ── Unit buttons (left section) ───────────────────────────────────────
    const unitStart = 8 + BTN_W / 2
    PVP_UNIT_ORDER.forEach((type, i) => {
      const bx = unitStart + i * (BTN_W + BTN_GAP)
      const btn = this.makeUnitButton(bx, PANEL_Y, type)
      this.unitBtns.set(type, btn)
    })

    // ── Surrender (center) ────────────────────────────────────────────────
    this.makeSurrenderButton(GAME_WIDTH / 2, PANEL_Y)

    // ── Tower buttons (right section) ─────────────────────────────────────
    const towerSectionW = TOWER_KEYS.length * BTN_W + (TOWER_KEYS.length - 1) * BTN_GAP
    const towerStart = GAME_WIDTH - 8 - towerSectionW + BTN_W / 2
    TOWER_KEYS.forEach((type, i) => {
      const bx = towerStart + i * (BTN_W + BTN_GAP)
      const btn = this.makeTowerButton(bx, PANEL_Y, type)
      this.towerBtns.set(type, btn)
    })
  }

  private makeUnitButton(bx: number, by: number, type: PvpUnitType): Phaser.GameObjects.Container {
    const cfg  = PVP_UNIT_CONFIGS[type]
    const container = this.add.container(bx, by)

    const slot    = this.add.image(0, 0, 'wood-table-slot').setDisplaySize(BTN_W, BTN_H)
    const overlay = this.add.graphics()
    overlay.fillStyle(0x001a33, 0.28)
    overlay.fillRoundedRect(-BTN_W/2+2, -BTN_H/2+2, BTN_W-4, BTN_H-4, 4)
    container.add([slot, overlay])

    container.add(this.add.text(-BTN_W/2+8, -BTN_H/2+12, UNIT_LABELS[type], {
      fontSize: '12px', fontStyle: 'bold', color: '#88ddff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5))

    container.add(this.add.text(0, BTN_H/2-14, `${cfg.cost}g  ⚔ send`, {
      fontSize: '10px', color: '#dddddd', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0.5))
    const sentCounter = this.add.text(BTN_W/2 - 8, -BTN_H/2 + 8, '0', {
      fontSize: '10px',
      color: '#88ffcc',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0)
    container.add(sentCounter)
    this.unitSentCountTexts.set(type, sentCounter)

    container.setInteractive(
      new Phaser.Geom.Rectangle(-BTN_W/2, -BTN_H/2, BTN_W, BTN_H),
      Phaser.Geom.Rectangle.Contains,
    )

    const resetOverlay = () => {
      overlay.clear()
      overlay.fillStyle(0x001a33, 0.28)
      overlay.fillRoundedRect(-BTN_W/2+2, -BTN_H/2+2, BTN_W-4, BTN_H-4, 4)
    }
    container.on('pointerover', () => {
      overlay.clear()
      overlay.fillStyle(0x0055aa, 0.30)
      overlay.fillRoundedRect(-BTN_W/2+2, -BTN_H/2+2, BTN_W-4, BTN_H-4, 4)
      overlay.lineStyle(1, 0x88ddff, 0.5)
      overlay.strokeRoundedRect(-BTN_W/2+2, -BTN_H/2+2, BTN_W-4, BTN_H-4, 4)
    })
    container.on('pointerout',  resetOverlay)
    container.on('pointerdown', () => {
      if (this.currentGold < UNIT_STATS[type].cost) {
        this.game.events.emit('pvp-insufficient-gold', { kind: 'unit', type, need: UNIT_STATS[type].cost })
      }
      this.game.events.emit('pvp-send-unit', { type })
    })

    return container
  }

  private makeTowerButton(bx: number, by: number, type: TowerType): Phaser.GameObjects.Container {
    const stats = TOWER_STATS[type]
    const cfg   = TOWER_CONFIGS[type]
    const container = this.add.container(bx, by)

    const slot    = this.add.image(0, 0, 'wood-table-slot').setDisplaySize(BTN_W, BTN_H)
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.22)
    overlay.fillRoundedRect(-BTN_W/2+2, -BTN_H/2+2, BTN_W-4, BTN_H-4, 4)

    const icon  = this.add.image(-BTN_W/2+26, 0, Tower.getBuildingKey(type))
    const iconH = Math.min(BTN_H - 8, 52)
    icon.setScale(iconH / Math.max(icon.width, icon.height))

    container.add([slot, overlay, icon])

    container.add(this.add.text(8, -BTN_H/2+12, cfg.label, {
      fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5))

    container.add(this.add.text(8, BTN_H/2-14, `${stats.cost}g  ⚔${stats.damage}  🎯${stats.range}`, {
      fontSize: '10px', color: '#dddddd', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5))

    container.setInteractive(
      new Phaser.Geom.Rectangle(-BTN_W/2, -BTN_H/2, BTN_W, BTN_H),
      Phaser.Geom.Rectangle.Contains,
    )
    container.on('pointerover', () => {
      if (this.selectedTower !== type) this.highlightTowerBtn(overlay, false, true)
    })
    container.on('pointerout', () => {
      if (this.selectedTower !== type) this.highlightTowerBtn(overlay, false, false)
    })
    container.on('pointerdown', () => this.onTowerSelect(type))

    return container
  }

  private makeSurrenderButton(cx: number, cy: number): void {
    const gfx = this.add.graphics()
    const draw = (hover: boolean) => {
      gfx.clear()
      gfx.fillStyle(hover ? 0x5a1a1a : 0x3a0a0a, 0.9)
      gfx.fillRoundedRect(cx-44, cy-26, 88, 52, 6)
      gfx.lineStyle(1, hover ? 0xdd6666 : 0xaa4444, hover ? 1 : 0.8)
      gfx.strokeRoundedRect(cx-44, cy-26, 88, 52, 6)
    }
    draw(false)

    this.add.text(cx, cy, '🏳 Surrender', {
      fontSize: '10px', color: '#ff8888', align: 'center',
    }).setOrigin(0.5)

    const zone = this.add.zone(cx, cy, 88, 52).setInteractive({ cursor: 'pointer' })
    zone.on('pointerover',  () => draw(true))
    zone.on('pointerout',   () => draw(false))
    zone.on('pointerdown',  () => this.game.events.emit('pvp-surrender'))
  }

  private onTowerSelect(type: TowerType): void {
    this.selectedTower = this.selectedTower === type ? null : type
    this.game.events.emit('pvp-select-tower', this.selectedTower)
    this.refreshTowerBtns()
  }

  private refreshTowerBtns(): void {
    for (const [type, container] of this.towerBtns) {
      const overlay = container.getAt(1) as Phaser.GameObjects.Graphics
      this.highlightTowerBtn(overlay, type === this.selectedTower, false)
    }
  }

  private highlightTowerBtn(
    overlay:  Phaser.GameObjects.Graphics,
    selected: boolean,
    hovered:  boolean,
  ): void {
    overlay.clear()
    if (selected) {
      overlay.fillStyle(0xffd700, 0.18)
      overlay.lineStyle(2, 0xffd700, 1)
      overlay.strokeRoundedRect(-BTN_W/2+2, -BTN_H/2+2, BTN_W-4, BTN_H-4, 4)
    } else if (hovered) {
      overlay.fillStyle(0xffffff, 0.12)
      overlay.lineStyle(1, 0xffffff, 0.5)
      overlay.strokeRoundedRect(-BTN_W/2+2, -BTN_H/2+2, BTN_W-4, BTN_H-4, 4)
    } else {
      overlay.fillStyle(0x000000, 0.22)
      overlay.fillRoundedRect(-BTN_W/2+2, -BTN_H/2+2, BTN_W-4, BTN_H-4, 4)
    }
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  private listenEvents(): void {
    const onGoldText = (gold: number) => {
      this.currentGold = gold
      this.goldText.setText(`${gold}g`)
    }
    this.bindEvent('pvp-gold', onGoldText)

    const onCastleHp = (data: { side: PlayerSide; hp: number; maxHp: number }) => {
      const ratio = data.hp / data.maxHp
      const color = ratio > 0.5 ? 0x33ee44 : ratio > 0.25 ? 0xffaa00 : 0xee2222
      const isMine = data.side === this.mySide
      if (isMine) this.renderCastleBar(this.myCastleBar,    GAME_WIDTH * 0.25 + 20, ratio, color)
      else         this.renderCastleBar(this.enemyCastleBar, GAME_WIDTH * 0.75 - 20, ratio, color)
    }
    this.bindEvent('pvp-castle-hp', onCastleHp)

    const onTimer = (totalSecs: number) => {
      const m = Math.floor(totalSecs / 60).toString().padStart(2, '0')
      const s = (totalSecs % 60).toString().padStart(2, '0')
      this.timerText.setText(`${m}:${s}`)
    }
    this.bindEvent('pvp-timer', onTimer)

    // Keep in sync if PvPGameScene emits pvp-select-tower externally
    const onSelectTower = (type: TowerType | null) => {
      this.selectedTower = type
      this.refreshTowerBtns()
    }
    this.bindEvent('pvp-select-tower', onSelectTower)

    // Disable unit/tower buttons if not enough gold
    const onGoldButtons = (gold: number) => {
      for (const [type, container] of this.unitBtns) {
        const alpha = gold >= UNIT_STATS[type].cost ? 1 : 0.45
        container.setAlpha(alpha)
      }
      for (const [type, container] of this.towerBtns) {
        const alpha = gold >= TOWER_STATS[type].cost ? 1 : 0.45
        container.setAlpha(alpha)
      }
    }
    this.bindEvent('pvp-gold', onGoldButtons)

    const onInsufficientGold = (data: { kind?: string; type?: string; need?: number }) => {
      this.showFeedback(data.need ? `Ouro insuficiente (${data.need}g)` : 'Ouro insuficiente')
      if (data.kind === 'unit' && data.type) {
        const btn = this.unitBtns.get(data.type as PvpUnitType)
        if (btn) this.flashButton(btn, 0xdd4444)
      } else if (data.kind === 'tower' && data.type) {
        const btn = this.towerBtns.get(data.type as TowerType)
        if (btn) this.flashButton(btn, 0xdd4444)
      } else {
        for (const btn of this.unitBtns.values()) this.flashButton(btn, 0xaa3333, 80)
      }
    }
    this.bindEvent('pvp-insufficient-gold', onInsufficientGold)

    const onUnitSent = (data: { type: PvpUnitType }) => {
      this.unitSentCounters[data.type] += 1
      const txt = this.unitSentCountTexts.get(data.type)
      if (txt) {
        txt.setText(String(this.unitSentCounters[data.type]))
        this.tweens.add({
          targets: txt,
          scaleX: 1.28,
          scaleY: 1.28,
          yoyo: true,
          duration: 120,
        })
      }
      const btn = this.unitBtns.get(data.type)
      if (btn) this.flashButton(btn, 0x44aa66, 90)
    }
    this.bindEvent('pvp-unit-sent', onUnitSent)

    const onFeedback = (message: string) => this.showFeedback(message)
    this.bindEvent('pvp-feedback', onFeedback)

    const onOpponentConnection = (message: string) => {
      this.connText.setText(message)
      this.time.delayedCall(4000, () => {
        if (this.connText.text === message) this.connText.setText('')
      })
    }
    this.bindEvent('pvp-opponent-connection', onOpponentConnection)
  }

  private flashButton(
    button: Phaser.GameObjects.Container,
    color: number,
    duration = 120,
  ): void {
    const flash = this.add.rectangle(button.x, button.y, BTN_W - 8, BTN_H - 8, color, 0.34)
      .setDepth(5000)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      onComplete: () => flash.destroy(),
    })
  }

  private showFeedback(message: string): void {
    this.feedbackText.setText(message)
    this.feedbackText.setAlpha(1)
    this.tweens.killTweensOf(this.feedbackText)
    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      delay: 1500,
      duration: 400,
    })
  }

  private bindEvent(event: string, fn: (...args: any[]) => void): void {
    this.game.events.on(event, fn)
    this.eventBindings.push({ event, fn })
  }

  private unlistenEvents(): void {
    for (const binding of this.eventBindings) {
      this.game.events.off(binding.event, binding.fn)
    }
    this.eventBindings = []
  }
}
