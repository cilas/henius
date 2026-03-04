import type Phaser from 'phaser'
import { Tower } from '../entities/Tower.ts'
import type { Enemy } from '../entities/Enemy.ts'
import type { Projectile } from '../entities/Projectile.ts'
import { TOWER_SLOTS, TILE_SIZE } from '../config/map.ts'
import { TOWER_CONFIGS, type TowerType } from '../config/towers.ts'
import type { EconomyManager } from './EconomyManager.ts'

export class TowerManager {
  towers: Tower[]
  projectiles: Projectile[]

  private scene: Phaser.Scene
  private economy: EconomyManager
  private selectedType: TowerType | null
  private slotZones: Phaser.GameObjects.Rectangle[]
  private slotOccupied: boolean[]
  private previewGraphics: Phaser.GameObjects.Graphics
  private onTowerPlaced: (type: TowerType, col: number, row: number) => void

  constructor(
    scene: Phaser.Scene,
    economy: EconomyManager,
    onTowerPlaced: (type: TowerType, col: number, row: number) => void,
  ) {
    this.scene = scene
    this.economy = economy
    this.towers = []
    this.projectiles = []
    this.selectedType = null
    this.slotOccupied = new Array(TOWER_SLOTS.length).fill(false)
    this.onTowerPlaced = onTowerPlaced

    this.previewGraphics = scene.add.graphics()
    this.previewGraphics.setDepth(6)

    this.slotZones = this.createSlotZones()
  }

  selectTower(type: TowerType | null): void {
    this.selectedType = type
    this.refreshSlotVisuals()
  }

  getSelected(): TowerType | null {
    return this.selectedType
  }

  update(delta: number, enemies: Enemy[]): void {
    // Update towers
    for (const tower of this.towers) {
      tower.update(delta, enemies, this.projectiles)
    }

    // Update projectiles
    const done: Projectile[] = []
    for (const proj of this.projectiles) {
      proj.update(delta, enemies)
      if (proj.isDone) done.push(proj)
    }
    this.projectiles = this.projectiles.filter(p => !done.includes(p))
  }

  private createSlotZones(): Phaser.GameObjects.Rectangle[] {
    const zones: Phaser.GameObjects.Rectangle[] = []

    for (let i = 0; i < TOWER_SLOTS.length; i++) {
      const [col, row] = TOWER_SLOTS[i]!
      const x = col * TILE_SIZE + TILE_SIZE / 2
      const y = row * TILE_SIZE + TILE_SIZE / 2

      const zone = this.scene.add.rectangle(x, y, TILE_SIZE - 2, TILE_SIZE - 2, 0x00ff00, 0.15)
      zone.setDepth(4)
      zone.setInteractive({ cursor: 'pointer' })

      const idx = i
      zone.on('pointerover', () => this.onSlotHover(idx, true))
      zone.on('pointerout', () => this.onSlotHover(idx, false))
      zone.on('pointerdown', () => this.onSlotClick(idx))

      zones.push(zone)
    }

    return zones
  }

  private onSlotHover(idx: number, entering: boolean): void {
    if (this.slotOccupied[idx]) return

    const zone = this.slotZones[idx]
    if (!zone) return

    if (entering && this.selectedType) {
      zone.setFillStyle(0x00ff00, 0.4)
      this.showRangePreview(idx)
    } else {
      zone.setFillStyle(0x00ff00, 0.15)
      this.clearRangePreview()
    }
  }

  private onSlotClick(idx: number): void {
    if (this.slotOccupied[idx]) return
    if (!this.selectedType) return

    const cfg = TOWER_CONFIGS[this.selectedType]
    if (!this.economy.spendGold(cfg.cost)) return

    const [col, row] = TOWER_SLOTS[idx]!
    const tower = new Tower(this.scene, col, row, this.selectedType)
    this.towers.push(tower)
    this.slotOccupied[idx] = true
    this.clearRangePreview()

    const zone = this.slotZones[idx]
    if (zone) {
      zone.setFillStyle(0x888888, 0.1)
      zone.disableInteractive()
    }

    this.onTowerPlaced(this.selectedType, col, row)
  }

  private showRangePreview(idx: number): void {
    if (!this.selectedType) return
    const [col, row] = TOWER_SLOTS[idx]!
    const x = col * TILE_SIZE + TILE_SIZE / 2
    const y = row * TILE_SIZE + TILE_SIZE / 2
    const range = TOWER_CONFIGS[this.selectedType].range

    this.previewGraphics.clear()
    this.previewGraphics.lineStyle(2, 0xffffff, 0.5)
    this.previewGraphics.strokeCircle(x, y, range)
    this.previewGraphics.fillStyle(0xffffff, 0.05)
    this.previewGraphics.fillCircle(x, y, range)
  }

  private clearRangePreview(): void {
    this.previewGraphics.clear()
  }

  private refreshSlotVisuals(): void {
    for (let i = 0; i < this.slotZones.length; i++) {
      const zone = this.slotZones[i]
      if (!zone || this.slotOccupied[i]) continue
      if (this.selectedType) {
        zone.setFillStyle(0x00ff00, 0.15)
      } else {
        zone.setFillStyle(0x00ff00, 0.05)
      }
    }
    this.clearRangePreview()
  }
}
