import Phaser from 'phaser'
import { Room } from 'colyseus.js'
import type { PlayerSide } from '@kingdom-wars/shared'
import { encodeSlotId, UNIT_STATS, TOWER_STATS } from '@kingdom-wars/shared'
import {
  PVP_GRID_COLS, PVP_GRID_ROWS, PVP_MAP_WIDTH, PVP_MAP_HEIGHT,
  PVP_ELEVATION_GRID, PVP_PATH_TILES,
  PVP_TOWER_SLOTS_LEFT, PVP_TOWER_SLOTS_RIGHT,
  PVP_CASTLE_LEFT_COL, PVP_CASTLE_LEFT_ROW,
  PVP_CASTLE_RIGHT_COL, PVP_CASTLE_RIGHT_ROW,
  PVP_LEFT_MAX_COL,
} from '../config/pvp-map.ts'
import { TILE_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config/map.ts'
import { Castle } from '../entities/Castle.ts'
import { PvPTower } from '../entities/PvPTower.ts'
import { PvPUnit } from '../entities/PvPUnit.ts'
import { NetworkManager } from '../network/NetworkManager.ts'
import { StateListener } from '../network/StateListener.ts'
import type { TowerType } from '../config/towers.ts'
import type { PvpUnitType } from '../config/units.ts'

const HUD_HEIGHT   = 90
const STATS_HEIGHT = 38

export class PvPGameScene extends Phaser.Scene {
  private mySide: PlayerSide = 'left'
  private selectedTowerType: TowerType | null = null
  private room: Room | null = null
  private stateListener: StateListener | null = null
  private ended = false
  private reconnectUnsub: (() => void) | null = null
  private reconnectOverlay: Phaser.GameObjects.Container | null = null

  private castleLeft!:  Castle
  private castleRight!: Castle
  private pvpUnits:   Map<string, PvPUnit>    = new Map()
  private pvpTowers:  Map<string, PvPTower>   = new Map()
  private slotGfxMap: Map<string, Phaser.GameObjects.Graphics> = new Map()
  private towerById: Map<string, PvPTower> = new Map()
  private towerIdBySlot: Map<string, string> = new Map()
  private myGold = 0
  private castleHpBySide: Record<PlayerSide, number> = { left: 0, right: 0 }

  private readonly onSelectTower = (type: TowerType | null) => {
    this.selectedTowerType = type
  }
  private readonly onTowerSlotClicked = (payload: { col: number; row: number; type: TowerType }) => {
    if (!this.room) return
    const cost = TOWER_STATS[payload.type].cost
    if (this.myGold < cost) {
      this.game.events.emit('pvp-insufficient-gold', { kind: 'tower', type: payload.type, need: cost })
      return
    }
    this.room.send('place_tower', {
      slotId: encodeSlotId(payload.col, payload.row),
      towerType: payload.type,
    })
  }
  private readonly onSendUnit = (payload: { type: PvpUnitType }) => {
    const cost = UNIT_STATS[payload.type].cost
    if (this.myGold < cost) {
      this.game.events.emit('pvp-insufficient-gold', { kind: 'unit', type: payload.type, need: cost })
      return
    }
    this.game.events.emit('pvp-unit-sent', { type: payload.type })
    this.room?.send('send_unit', { unitType: payload.type, count: 1 })
  }
  private readonly onSurrender = () => {
    this.room?.send('surrender')
  }
  private readonly onGoldUpdated = (gold: number) => {
    this.myGold = gold
  }

  constructor() {
    super({ key: 'PvPGameScene' })
  }

  init(data: { side?: PlayerSide; room?: Room }): void {
    this.mySide = data.side ?? 'left'
    this.room = data.room ?? NetworkManager.get().room
    this.ended = false
  }

  create(): void {
    this.pvpUnits   = new Map()
    this.pvpTowers  = new Map()
    this.slotGfxMap = new Map()
    this.towerById = new Map()
    this.towerIdBySlot = new Map()
    this.selectedTowerType = null
    this.myGold = 0

    this.renderMap()
    this.renderCastles()
    this.renderTowerSlots()
    this.setupCamera()

    this.scene.launch('PvPUIScene', { side: this.mySide })
    this.bindInputEvents()
    this.bindReconnectEvents()
    this.bindRoomMessages(this.room)
    this.initStateListener()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
  }

  update(_time: number, delta: number): void {
    for (const unit of this.pvpUnits.values()) {
      unit.update(delta)
    }
  }

  // ── Public API — called by state listener (T10) ───────────────────────────

  spawnUnit(
    id: string, type: PvpUnitType, side: PlayerSide,
    x: number, y: number, hp: number,
  ): PvPUnit {
    const unit = new PvPUnit(this, id, type, side, x, y, hp)
    unit.setAlpha(0)
    const puff = this.add.sprite(x, y, 'dust').setScale(0.55).setAlpha(0.75).setDepth(y + 1)
    puff.play('dust')
    puff.once('animationcomplete', () => puff.destroy())
    this.tweens.add({ targets: unit, alpha: 1, duration: 190 })
    this.pvpUnits.set(id, unit)
    return unit
  }

  removeUnit(id: string): void {
    const unit = this.pvpUnits.get(id)
    if (unit) { unit.die(); this.pvpUnits.delete(id) }
  }

  updateUnit(id: string, x: number, y: number, hp: number, maxHp: number): void {
    const unit = this.pvpUnits.get(id)
    if (!unit) return
    unit.moveTo(x, y)
    unit.updateHp(hp, maxHp)
  }

  placeTower(
    slotId: string,
    col: number,
    row: number,
    type: TowerType,
    hp: number,
    towerId?: string,
  ): PvPTower {
    const tower = new PvPTower(this, col, row, type, hp, towerId)
    this.pvpTowers.set(slotId, tower)
    if (towerId) {
      this.towerById.set(towerId, tower)
      this.towerIdBySlot.set(slotId, towerId)
    }
    // Hide slot highlight when tower is placed
    const gfx = this.slotGfxMap.get(slotId)
    if (gfx) gfx.setVisible(false)
    this.flashSlotPlaced(col, row)
    return tower
  }

  removeTower(slotId: string): void {
    const tower = this.pvpTowers.get(slotId)
    if (tower) {
      tower.updateHp(0, 1)   // triggers destruction animation
      this.pvpTowers.delete(slotId)
      const towerId = this.towerIdBySlot.get(slotId)
      if (towerId) {
        this.towerById.delete(towerId)
        this.towerIdBySlot.delete(slotId)
      }
      // Restore slot highlight
      const gfx = this.slotGfxMap.get(slotId)
      if (gfx) gfx.setVisible(true)
    }
  }

  updateTower(slotId: string, hp: number, maxHp: number): void {
    const tower = this.pvpTowers.get(slotId)
    if (!tower) return
    tower.updateHp(hp, maxHp)
  }

  updateCastleHp(side: PlayerSide, hp: number, maxHp: number): void {
    const prev = this.castleHpBySide[side]
    this.castleHpBySide[side] = hp
    if (side === 'left') this.castleLeft.updateHp(hp, maxHp)
    else                 this.castleRight.updateHp(hp, maxHp)
    if (prev > 0 && hp < prev) this.flashCastleDamage(side)
  }

  showEndOverlay(text: string, color: number, onBack: () => void): void {
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(0, 0, PVP_MAP_WIDTH, PVP_MAP_HEIGHT)
    overlay.setDepth(30000)

    this.add.text(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2 - 60, text, {
      fontSize: '64px', fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(30001)

    const btn = this.add.rectangle(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2 + 60, 220, 55, 0x4488ff)
    btn.setDepth(30001).setInteractive({ cursor: 'pointer' })
    this.add.text(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2 + 60, 'Main Menu', {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(30002)

    btn.on('pointerover',  () => btn.setFillStyle(0x66aaff))
    btn.on('pointerout',   () => btn.setFillStyle(0x4488ff))
    btn.on('pointerdown',  onBack)
  }

  private bindInputEvents(): void {
    this.game.events.on('pvp-select-tower', this.onSelectTower)
    this.game.events.on('pvp-tower-slot-clicked', this.onTowerSlotClicked)
    this.game.events.on('pvp-send-unit', this.onSendUnit)
    this.game.events.on('pvp-surrender', this.onSurrender)
    this.game.events.on('pvp-gold', this.onGoldUpdated)
  }

  private bindRoomMessages(room: Room | null): void {
    if (!room) return

    room.onMessage('game_over', (data: {
      winnerId: string | null
      reason: string
      stats?: Record<string, {
        unitsSent: number
        unitsKilled: number
        towersBuilt: number
        towersDestroyed: number
        damageDealt: number
      }>
    }) => {
      if (this.ended) return
      this.ended = true

      const didWin = data.winnerId === this.room?.sessionId
      const isDraw = data.winnerId === null

      const title = isDraw ? 'EMPATE' : didWin ? 'VITORIA' : 'DERROTA'
      const color = isDraw ? 0xffdd66 : didWin ? 0x44dd66 : 0xdd4444
      const myStats = (this.room?.sessionId && data.stats) ? data.stats[this.room.sessionId] : undefined
      const detailLines = [
        `Motivo: ${this.translateReason(data.reason)}`,
        '',
        `Unidades enviadas: ${myStats?.unitsSent ?? 0}`,
        `Unidades abatidas: ${myStats?.unitsKilled ?? 0}`,
        `Torres construidas: ${myStats?.towersBuilt ?? 0}`,
        `Torres destruidas: ${myStats?.towersDestroyed ?? 0}`,
        `Dano total causado: ${myStats?.damageDealt ?? 0}`,
      ]

      this.showResultOverlay(title, color, detailLines, async () => {
        await NetworkManager.get().disconnect()
        this.scene.stop('PvPUIScene')
        this.scene.start('MenuScene')
      })
    })

    room.onMessage('player_connection', (data: { sessionId: string; status: string; timeoutSec?: number }) => {
      if (data.sessionId === room.sessionId) return
      if (data.status === 'disconnected') {
        const secs = data.timeoutSec ?? 30
        this.game.events.emit('pvp-opponent-connection', `Opponent disconnected (${secs}s)`)
      } else if (data.status === 'reconnected') {
        this.game.events.emit('pvp-opponent-connection', 'Opponent reconnected')
      }
    })

    room.onMessage('damage_dealt', (data: { sourceId: string; targetId: string }) => {
      const tower = this.towerById.get(data.sourceId)
      if (!tower) return
      const targetPos = this.resolveTargetPosition(data.targetId)
      if (!targetPos) return
      tower.flashAttackTo(targetPos.x, targetPos.y)
    })

    room.onMessage('error', (data: { message?: string; code?: string }) => {
      const msg = data.message ?? 'Acao invalida'
      if (data.code === 'INSUFFICIENT_GOLD' || msg.includes('Not enough gold')) {
        this.game.events.emit('pvp-insufficient-gold', { kind: 'unknown', need: 0 })
      }
      this.game.events.emit('pvp-feedback', msg)
    })
  }

  private initStateListener(): void {
    if (!this.room) {
      this.showEndOverlay('No active room', 0xdd4444, () => this.scene.start('MenuScene'))
      return
    }
    this.stateListener = new StateListener(this.room, this, this.game.events)
    this.stateListener.start()
  }

  private bindReconnectEvents(): void {
    const manager = NetworkManager.get()
    this.reconnectUnsub = manager.onReconnect((event) => {
      if (event.status === 'reconnecting') {
        this.showReconnectOverlay(`Reconectando... ${event.secondsLeft}s`)
        return
      }

      if (event.status === 'reconnected') {
        this.room = event.room
        this.hideReconnectOverlay()
        this.rebindStateListener()
        this.bindRoomMessages(event.room)
        return
      }

      this.showReconnectFailedOverlay()
    })
  }

  private rebindStateListener(): void {
    this.stateListener?.stop()
    if (!this.room) return
    this.stateListener = new StateListener(this.room, this, this.game.events)
    this.stateListener.start()
  }

  private showReconnectOverlay(text: string): void {
    const overlay = this.ensureReconnectOverlay()
    const label = overlay.getByName('msg') as Phaser.GameObjects.Text
    label.setText(text)
    overlay.setVisible(true)
  }

  private showReconnectFailedOverlay(): void {
    const overlay = this.ensureReconnectOverlay(true)
    overlay.setVisible(true)
  }

  private hideReconnectOverlay(): void {
    if (this.reconnectOverlay) {
      this.reconnectOverlay.setVisible(false)
    }
  }

  private ensureReconnectOverlay(withBackButton = false): Phaser.GameObjects.Container {
    if (!this.reconnectOverlay) {
      const root = this.add.container(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2)
      root.setDepth(35000)

      const bg = this.add.rectangle(0, 0, 560, 220, 0x000000, 0.82)
      bg.setStrokeStyle(2, 0x4488ff, 0.8)
      const msg = this.add.text(0, -30, 'Reconectando...', {
        fontSize: '34px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setName('msg')

      root.add([bg, msg])
      root.setVisible(false)
      this.reconnectOverlay = root
    }

    const root = this.reconnectOverlay
    if (withBackButton && !root.getByName('back-btn')) {
      const btn = this.add.rectangle(0, 45, 240, 58, 0xaa3333).setName('back-btn')
        .setInteractive({ cursor: 'pointer' })
      const txt = this.add.text(0, 45, 'Voltar ao menu', {
        fontSize: '24px',
        color: '#ffffff',
      }).setOrigin(0.5).setName('back-btn-label')

      btn.on('pointerover', () => btn.setFillStyle(0xcc4444))
      btn.on('pointerout', () => btn.setFillStyle(0xaa3333))
      btn.on('pointerdown', async () => {
        await NetworkManager.get().disconnect()
        this.scene.stop('PvPUIScene')
        this.scene.start('MenuScene')
      })

      root.add([btn, txt])
      const msg = root.getByName('msg') as Phaser.GameObjects.Text
      msg.setText('Desconectado')
    }

    return root
  }

  private cleanup(): void {
    this.game.events.off('pvp-select-tower', this.onSelectTower)
    this.game.events.off('pvp-tower-slot-clicked', this.onTowerSlotClicked)
    this.game.events.off('pvp-send-unit', this.onSendUnit)
    this.game.events.off('pvp-surrender', this.onSurrender)
    this.game.events.off('pvp-gold', this.onGoldUpdated)
    this.reconnectUnsub?.()
    this.reconnectUnsub = null
    this.stateListener?.stop()
    this.stateListener = null
  }

  private flashSlotPlaced(col: number, row: number): void {
    const x = col * TILE_SIZE + TILE_SIZE / 2
    const y = row * TILE_SIZE + TILE_SIZE / 2
    const fx = this.add.graphics().setDepth(2)
    fx.fillStyle(0x66ff88, 0.45)
    fx.fillRect(x - TILE_SIZE / 2 + 2, y - TILE_SIZE / 2 + 2, TILE_SIZE - 4, TILE_SIZE - 4)
    this.tweens.add({
      targets: fx,
      alpha: 0,
      duration: 220,
      onComplete: () => fx.destroy(),
    })
  }

  private flashCastleDamage(side: PlayerSide): void {
    const isMine = side === this.mySide
    if (isMine) this.cameras.main.shake(80, 0.003)

    const flash = this.add.rectangle(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2, PVP_MAP_WIDTH, PVP_MAP_HEIGHT, 0xff2222, 0.06)
      .setDepth(25000)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 140,
      onComplete: () => flash.destroy(),
    })
  }

  private resolveTargetPosition(targetId: string): { x: number; y: number } | null {
    const unit = this.pvpUnits.get(targetId)
    if (unit) return { x: unit.x, y: unit.y }

    const tower = this.towerById.get(targetId)
    if (tower) return { x: tower.x, y: tower.y }

    if (targetId === 'castle-left') return { x: this.castleLeft.x, y: this.castleLeft.y }
    if (targetId === 'castle-right') return { x: this.castleRight.x, y: this.castleRight.y }
    return null
  }

  private translateReason(reason: string): string {
    if (reason === 'castle_destroyed') return 'Castelo destruido'
    if (reason === 'timeout') return 'Tempo esgotado'
    if (reason === 'surrender') return 'Desistencia'
    if (reason === 'forfeit') return 'Desconexao'
    return reason
  }

  private showResultOverlay(
    title: string,
    color: number,
    lines: string[],
    onBack: () => void,
  ): void {
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.76)
    overlay.fillRect(0, 0, PVP_MAP_WIDTH, PVP_MAP_HEIGHT)
    overlay.setDepth(30000)

    const panelW = 940
    const panelH = 540
    const panel = this.add.rectangle(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2, panelW, panelH, 0x111722, 0.95)
      .setDepth(30001)
      .setStrokeStyle(3, color, 0.95)

    this.add.text(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2 - panelH / 2 + 72, title, {
      fontSize: '70px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(30002)

    this.add.text(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2 - 18, lines.join('\n'), {
      fontSize: '30px',
      color: '#d6e2ff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      lineSpacing: 10,
    }).setOrigin(0.5).setDepth(30002)

    const btn = this.add.rectangle(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2 + panelH / 2 - 72, 280, 62, 0x4488ff)
      .setDepth(30002)
      .setInteractive({ cursor: 'pointer' })
    this.add.text(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2 + panelH / 2 - 72, 'Voltar ao Menu', {
      fontSize: '30px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30003)

    btn.on('pointerover', () => btn.setFillStyle(0x66aaff))
    btn.on('pointerout', () => btn.setFillStyle(0x4488ff))
    btn.on('pointerdown', onBack)

    void panel
  }

  // ── Map rendering ─────────────────────────────────────────────────────────

  private renderMap(): void {
    this.add.tileSprite(0, 0, PVP_MAP_WIDTH, PVP_MAP_HEIGHT, 'water-bg')
      .setOrigin(0, 0).setDepth(-2)

    const map = this.make.tilemap({
      tileWidth: TILE_SIZE, tileHeight: TILE_SIZE,
      width: PVP_GRID_COLS, height: PVP_GRID_ROWS,
    })

    const tsGrass = map.addTilesetImage('tilemap',      'tilemap',      TILE_SIZE, TILE_SIZE, 0, 0)!
    const tsSand  = map.addTilesetImage('tilemap-sand', 'tilemap-sand', TILE_SIZE, TILE_SIZE, 0, 0)!

    const layer0  = map.createBlankLayer('level0',  tsSand)!   // flat ground (whole map)
    const layer1L = map.createBlankLayer('level1L', tsGrass)!  // elevated — left kingdom (green)
    const layer1R = map.createBlankLayer('level1R', tsSand)!   // elevated — right kingdom (sand)

    layer0.setDepth(-1)
    layer1L.setDepth(0).y = -TILE_SIZE
    layer1R.setDepth(0).y = -TILE_SIZE

    for (let r = 0; r < PVP_GRID_ROWS; r++) {
      for (let c = 0; c < PVP_GRID_COLS; c++) {
        const elev = PVP_ELEVATION_GRID[r][c]

        // Water foam on tiles that border water
        if (elev >= 0) {
          const bordersWater = [[-1,0],[1,0],[0,-1],[0,1]].some(([dc, dr]) =>
            (PVP_ELEVATION_GRID[r + (dr as number)]?.[(c + (dc as number))] ?? -1) === -1
          )
          if (bordersWater) {
            const foam = this.add.sprite(
              c * TILE_SIZE + TILE_SIZE / 2,
              r * TILE_SIZE + TILE_SIZE / 2,
              'water-foam',
            )
            foam.setScale(TILE_SIZE / 192).setDepth(-1.5).setAlpha(0.6)
            foam.play('water-foam')
            foam.anims.setProgress(Math.random())
          }
        }

        // Layer 0: flat/path tiles
        if (elev >= 0) {
          const isSand = (cc: number, rr: number) => (PVP_ELEVATION_GRID[rr]?.[cc] ?? -1) >= 0
          layer0.putTileAt(this.grassTile(c, r, isSand), c, r)
        }

        // Layer 1: elevated grass or cliff
        if (elev >= 1) {
          const isElev = (cc: number, rr: number) => (PVP_ELEVATION_GRID[rr]?.[cc] ?? -1) >= 1
          const idx = this.grassTile(c, r, isElev)
          if (c <= PVP_LEFT_MAX_COL) layer1L.putTileAt(idx, c, r)
          else                        layer1R.putTileAt(idx, c, r)
        } else if (r > 0 && PVP_ELEVATION_GRID[r - 1][c] >= 1) {
          const isElev = (cc: number, rr: number) => (PVP_ELEVATION_GRID[rr]?.[cc] ?? -1) >= 1
          const idx = this.cliffTile(c, r - 1, isElev)
          if (c <= PVP_LEFT_MAX_COL) layer1L.putTileAt(idx, c, r)
          else                        layer1R.putTileAt(idx, c, r)
          this.add.image(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE, 'shadow')
            .setOrigin(0.5, 0).setAlpha(0.55).setDepth(-0.5)
        }
      }
    }

    // Subtle center divider line
    const divX = (PVP_LEFT_MAX_COL + 1) * TILE_SIZE
    this.add.graphics()
      .setDepth(0.5)
      .lineStyle(2, 0xffffff, 0.12)
      .lineBetween(divX, 0, divX, PVP_MAP_HEIGHT)
  }

  private renderCastles(): void {
    this.castleLeft  = new Castle(this, PVP_CASTLE_LEFT_COL,  PVP_CASTLE_LEFT_ROW,  'left')
    this.castleRight = new Castle(this, PVP_CASTLE_RIGHT_COL, PVP_CASTLE_RIGHT_ROW, 'right')
  }

  private renderTowerSlots(): void {
    const mySlots  = this.mySide === 'left' ? PVP_TOWER_SLOTS_LEFT : PVP_TOWER_SLOTS_RIGHT
    const myKeySet = new Set(mySlots.map(([c, r]) => `${c},${r}`))
    const allSlots = [...PVP_TOWER_SLOTS_LEFT, ...PVP_TOWER_SLOTS_RIGHT]

    for (const [c, r] of allSlots) {
      const key  = `${c},${r}`
      const isMine = myKeySet.has(key)
      const wx   = c * TILE_SIZE + TILE_SIZE / 2
      const wy   = r * TILE_SIZE + TILE_SIZE / 2

      const gfx = this.add.graphics().setDepth(0.5)
      this.drawSlot(gfx, c, r, isMine, false)
      this.slotGfxMap.set(key, gfx)

      if (isMine) {
        const zone = this.add.zone(wx, wy, TILE_SIZE - 4, TILE_SIZE - 4)
          .setInteractive({ cursor: 'pointer' })

        zone.on('pointerover',  () => this.drawSlot(gfx, c, r, true, true))
        zone.on('pointerout',   () => this.drawSlot(gfx, c, r, true, false))
        zone.on('pointerdown',  () => {
          if (!this.selectedTowerType) return
          if (this.pvpTowers.has(key)) return
          this.game.events.emit('pvp-tower-slot-clicked', {
            col: c, row: r, slotId: key, type: this.selectedTowerType,
          })
        })
      }
    }
  }

  private drawSlot(
    gfx:   Phaser.GameObjects.Graphics,
    c:     number,
    r:     number,
    mine:  boolean,
    hover: boolean,
  ): void {
    gfx.clear()
    const rx = c * TILE_SIZE + 2
    const ry = r * TILE_SIZE + 2
    const rw = TILE_SIZE - 4
    const rh = TILE_SIZE - 4

    if (!mine) {
      gfx.lineStyle(1, 0xff4444, 0.10)
      gfx.strokeRect(rx, ry, rw, rh)
      return
    }

    const fillA = hover ? 0.22 : 0.07
    const lineA = hover ? 0.80 : 0.25
    gfx.fillStyle(0x88ff88, fillA)
    gfx.fillRect(rx, ry, rw, rh)
    gfx.lineStyle(1, 0x88ff88, lineA)
    gfx.strokeRect(rx, ry, rw, rh)
  }

  private setupCamera(): void {
    const zoom       = GAME_WIDTH / PVP_MAP_WIDTH   // 0.5
    const viewH      = GAME_HEIGHT - HUD_HEIGHT - STATS_HEIGHT
    this.cameras.main
      .setViewport(0, STATS_HEIGHT, GAME_WIDTH, viewH)
      .setZoom(zoom)
      .centerOn(PVP_MAP_WIDTH / 2, PVP_MAP_HEIGHT / 2)
  }

  // ── Autotile helpers (same algorithm as GameScene) ────────────────────────

  private grassTile(col: number, row: number, same: (c: number, r: number) => boolean): number {
    const N = same(col, row - 1), S = same(col, row + 1)
    const W = same(col - 1, row), E = same(col + 1, row)
    const tr = !N && S ? 0 : N && S ? 1 : N && !S ? 2 : 3
    const tc = !W && E ? 5 : W && !E ? 8 : W && E ? ((col + row) % 2 === 0 ? 6 : 7) : 6
    return tr * 9 + tc
  }

  private cliffTile(gc: number, gr: number, same: (c: number, r: number) => boolean): number {
    const W = same(gc - 1, gr), E = same(gc + 1, gr)
    const tc = !W && E ? 5 : W && !E ? 8 : gc % 2 === 0 ? 6 : 7
    return 4 * 9 + tc
  }
}
