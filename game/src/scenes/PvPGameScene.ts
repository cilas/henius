import Phaser from 'phaser'
import type { PlayerSide } from '@kingdom-wars/shared'
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
import type { TowerType } from '../config/towers.ts'
import type { PvpUnitType } from '../config/units.ts'

const HUD_HEIGHT   = 90
const STATS_HEIGHT = 38

export class PvPGameScene extends Phaser.Scene {
  private mySide: PlayerSide = 'left'
  private selectedTowerType: TowerType | null = null

  private castleLeft!:  Castle
  private castleRight!: Castle
  private pvpUnits:   Map<string, PvPUnit>    = new Map()
  private pvpTowers:  Map<string, PvPTower>   = new Map()
  private slotGfxMap: Map<string, Phaser.GameObjects.Graphics> = new Map()

  constructor() {
    super({ key: 'PvPGameScene' })
  }

  init(data: { side?: PlayerSide }): void {
    this.mySide = data.side ?? 'left'
  }

  create(): void {
    this.pvpUnits   = new Map()
    this.pvpTowers  = new Map()
    this.slotGfxMap = new Map()
    this.selectedTowerType = null

    this.renderMap()
    this.renderCastles()
    this.renderTowerSlots()
    this.setupCamera()

    this.scene.launch('PvPUIScene', { side: this.mySide })

    this.game.events.on('pvp-select-tower', (type: TowerType | null) => {
      this.selectedTowerType = type
    })
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

  placeTower(slotId: string, col: number, row: number, type: TowerType, hp: number): PvPTower {
    const tower = new PvPTower(this, col, row, type, hp)
    this.pvpTowers.set(slotId, tower)
    // Hide slot highlight when tower is placed
    const gfx = this.slotGfxMap.get(slotId)
    if (gfx) gfx.setVisible(false)
    return tower
  }

  removeTower(slotId: string): void {
    const tower = this.pvpTowers.get(slotId)
    if (tower) {
      tower.updateHp(0, 1)   // triggers destruction animation
      this.pvpTowers.delete(slotId)
      // Restore slot highlight
      const gfx = this.slotGfxMap.get(slotId)
      if (gfx) gfx.setVisible(true)
    }
  }

  updateCastleHp(side: PlayerSide, hp: number, maxHp: number): void {
    if (side === 'left') this.castleLeft.updateHp(hp, maxHp)
    else                 this.castleRight.updateHp(hp, maxHp)
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
