import Phaser from 'phaser'
import { TILE_SIZE } from '../config/map.ts'
import { Tower } from './Tower.ts'
import type { TowerType } from '../config/towers.ts'

const BAR_WIDTH  = 48
const BAR_HEIGHT = 5

/**
 * Server-driven PvP tower — no auto-targeting. HP is managed by the server
 * and updated via `updateHp()`. Triggers a destruction animation at 0 HP.
 */
export class PvPTower extends Phaser.GameObjects.Container {
  readonly towerId?: string
  readonly towerType: TowerType
  isDestroyed: boolean

  private sprite: Phaser.GameObjects.Sprite
  private hpBar: Phaser.GameObjects.Graphics
  private hp: number
  private maxHp: number

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    type: TowerType,
    hp: number,
    towerId?: string,
  ) {
    const x = col * TILE_SIZE + TILE_SIZE / 2
    const y = row * TILE_SIZE + TILE_SIZE / 2
    super(scene, x, y)

    this.towerType   = type
    this.towerId     = towerId
    this.hp          = hp
    this.maxHp       = hp
    this.isDestroyed = false

    // Building sprite
    const building = scene.add.image(0, 0, Tower.getBuildingKey(type))
    const bScale   = (TILE_SIZE * 1.1) / Math.max(building.width, building.height)
    building.setScale(bScale)
    building.setOrigin(0.5, 0.8)
    this.add(building)

    // Idle unit sprite standing in front of building
    const idleAnim  = `${type}-idle`
    const unitScale = type === 'lancer' ? 0.28 : 0.42
    this.sprite = scene.add.sprite(0, 0, idleAnim)
    this.sprite.setScale(unitScale)
    this.sprite.setOrigin(0.5, 0.8)
    this.sprite.setDepth(1)
    this.add(this.sprite)
    this.sprite.play(idleAnim)

    this.setDepth(y + TILE_SIZE / 2)
    scene.add.existing(this)

    this.hpBar = scene.add.graphics()
    this.hpBar.setDepth(20000)
    this.drawHpBar()
  }

  flashAttackTo(targetX: number, targetY: number): void {
    if (this.isDestroyed) return

    const beam = this.scene.add.graphics().setDepth(this.depth + 2)
    const color = this.towerType === 'archer' ? 0x88ccff : this.towerType === 'monk' ? 0x88ff88 : 0xffdd88
    beam.lineStyle(2, color, 0.9)
    beam.lineBetween(this.x, this.y - 14, targetX, targetY - 8)

    const flash = this.scene.add.circle(this.x, this.y - 14, 8, color, 0.7)
      .setDepth(this.depth + 3)

    this.scene.tweens.add({
      targets: [beam, flash],
      alpha: 0,
      duration: 140,
      onComplete: () => {
        beam.destroy()
        flash.destroy()
      },
    })
  }

  updateHp(hp: number, maxHp: number): void {
    this.hp    = hp
    this.maxHp = maxHp
    this.drawHpBar()
    if (hp <= 0) this.playDestruction()
  }

  private drawHpBar(): void {
    this.hpBar.clear()
    const bx    = this.x - BAR_WIDTH / 2
    const by    = this.y - 64
    const ratio = this.hp / this.maxHp
    const color = ratio > 0.5 ? 0x22cc22 : ratio > 0.25 ? 0xffaa00 : 0xcc2222

    this.hpBar.fillStyle(0x330000)
    this.hpBar.fillRect(bx, by, BAR_WIDTH, BAR_HEIGHT)
    this.hpBar.fillStyle(color)
    this.hpBar.fillRect(bx, by, BAR_WIDTH * ratio, BAR_HEIGHT)
    this.hpBar.lineStyle(1, 0x000000, 0.8)
    this.hpBar.strokeRect(bx, by, BAR_WIDTH, BAR_HEIGHT)
  }

  private playDestruction(): void {
    if (this.isDestroyed) return
    this.isDestroyed = true
    if (this.hpBar.active) this.hpBar.destroy()

    const explosion = this.scene.add.sprite(this.x, this.y, 'explosion')
    explosion.setScale(0.8).setDepth(this.depth + 1)
    explosion.play('explosion')
    explosion.once('animationcomplete', () => explosion.destroy())

    const debris = this.scene.add.sprite(this.x, this.y + 6, 'dust')
    debris.setScale(0.85).setDepth(this.depth + 1).setAlpha(0.85)
    debris.play('dust')
    debris.once('animationcomplete', () => debris.destroy())

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      onComplete: () => { this.destroy() },
    })
  }

  destroy(fromScene?: boolean): void {
    if (this.hpBar.active) this.hpBar.destroy()
    super.destroy(fromScene)
  }
}
