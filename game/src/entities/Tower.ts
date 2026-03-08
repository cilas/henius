import Phaser from 'phaser'
import { Enemy } from './Enemy.ts'
import { Projectile } from './Projectile.ts'
import { TOWER_CONFIGS, type TowerType } from '../config/towers.ts'
import { TILE_SIZE } from '../config/map.ts'
import type { PlayerSide } from '@kingdom-wars/shared'

// HP per tower type
const TOWER_HP: Record<TowerType, number> = {
  archer: 150,
  warrior: 250,
  lancer: 200,
  monk: 100,
}

const HP_BAR_W = 44
const HP_BAR_H = 5

export class Tower extends Phaser.GameObjects.Container {
  readonly towerType: TowerType
  readonly col: number
  readonly row: number
  hp: number
  maxHp: number
  isDestroyed: boolean
  private sprite: Phaser.GameObjects.Sprite
  private rangeCircle: Phaser.GameObjects.Graphics
  private hpBar: Phaser.GameObjects.Graphics
  private cooldown: number  // ms remaining
  private target: Enemy | null
  private isAttacking: boolean

  // For monk healing: cooldown handled separately
  private healCooldown: number

  constructor(scene: Phaser.Scene, col: number, row: number, type: TowerType) {
    const x = col * TILE_SIZE + TILE_SIZE / 2
    const y = row * TILE_SIZE + TILE_SIZE / 2
    super(scene, x, y)

    this.towerType = type
    this.col = col
    this.row = row
    this.maxHp = TOWER_HP[type]
    this.hp = this.maxHp
    this.isDestroyed = false
    this.cooldown = 0
    this.target = null
    this.isAttacking = false
    this.healCooldown = 0

    const cfg = TOWER_CONFIGS[type]

    // Range indicator (hidden by default, shown on hover)
    this.rangeCircle = scene.add.graphics()
    this.rangeCircle.lineStyle(1, 0xffffff, 0.3)
    this.rangeCircle.strokeCircle(x, y, cfg.range)
    this.rangeCircle.setDepth(5)
    this.rangeCircle.setVisible(false)

    // Tower base — actual building sprite
    const buildingKey = Tower.getBuildingKey(type)
    const building = scene.add.image(0, 0, buildingKey)
    const bScale = (TILE_SIZE * 1.1) / Math.max(building.width, building.height)
    building.setScale(bScale)
    building.setOrigin(0.5, 0.8) // Anchor the building properly
    this.add(building)

    // Unit sprite standing in front of building
    this.sprite = scene.add.sprite(0, 0, cfg.idleAnim)
    this.setSpriteScale(type)
    this.sprite.setOrigin(0.5, 0.8)
    this.sprite.setDepth(1)
    this.add(this.sprite)
    this.sprite.play(cfg.idleAnim)

    // Set depth to the bottom edge of the tile so enemies walking in front overlap properly
    this.setDepth(y + TILE_SIZE / 2)
    scene.add.existing(this)

    // HP bar (hidden until first hit)
    this.hpBar = scene.add.graphics()
    this.hpBar.setDepth(20001)
    this.hpBar.setVisible(false)
  }

  update(delta: number, enemies: Enemy[], projectiles: Projectile[]): void {
    const cfg = TOWER_CONFIGS[this.towerType]

    // Monk: heal nearby towers (not enemies) — handled differently
    // Actually monks heal towers by reducing their cooldown?
    // Let's implement: Monk heals enemies... no. Monk heals friendly towers.
    // Simplified: Monk heals the castle HP (adds lives) — but that's OP.
    // Design decision: Monk restores HP to nearby towers over time.
    // Since towers don't have HP in classic TD, let's make Monk slow nearby enemies instead.
    // ACTUALLY: keep it simple — Monk aura damages enemies slowly.
    if (this.towerType === 'monk') {
      this.healCooldown -= delta
      if (this.healCooldown <= 0) {
        this.healCooldown = 1000  // every 1 second
        for (const enemy of enemies) {
          const dx = enemy.x - this.x
          const dy = enemy.y - this.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= cfg.range) {
            // Slow effect + small damage
            enemy.takeDamage(cfg.healRate)
          }
        }
      }
      return
    }

    // Reduce attack cooldown
    this.cooldown -= delta

    // Find or validate target
    if (!this.target || this.target.isDead || !this.target.active) {
      this.target = null
      this.isAttacking = false
      this.sprite.play(cfg.idleAnim, true)
    }

    if (!this.target) {
      this.target = this.findTarget(enemies, cfg.range)
    }

    if (!this.target) return

    // Face target
    this.sprite.setFlipX(this.target.x < this.x)

    // Attack when cooldown ready
    if (this.cooldown <= 0) {
      this.cooldown = 1000 / cfg.fireRate

      if (!this.isAttacking) {
        this.isAttacking = true
        this.sprite.play(cfg.attackAnim, true)
        this.sprite.once('animationcomplete', () => {
          this.isAttacking = false
          if (this.scene) {
            this.sprite.play(cfg.idleAnim, true)
          }
        })
      }

      this.fireAt(this.target, projectiles)
    }
  }

  takeDamage(amount: number): void {
    if (this.isDestroyed) return
    this.hp = Math.max(0, this.hp - amount)
    this.hpBar.setVisible(true)
    this.drawHpBar()
    if (this.hp <= 0) {
      this.destroyTower()
    }
  }

  private destroyTower(): void {
    if (this.isDestroyed) return
    this.isDestroyed = true
    this.hpBar.destroy()
    this.rangeCircle.destroy()

    // Explosion FX at tower position
    const boom = this.scene.add.sprite(this.x, this.y, 'explosion')
    boom.setScale(0.8).setDepth(this.y + 100)
    boom.play('explosion')
    boom.once('animationcomplete', () => boom.destroy())

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      onComplete: () => { super.destroy() },
    })
  }

  private drawHpBar(): void {
    this.hpBar.clear()
    const bx = this.x - HP_BAR_W / 2
    const by = this.y - TILE_SIZE * 1.2

    this.hpBar.fillStyle(0xcc2222)
    this.hpBar.fillRect(bx, by, HP_BAR_W, HP_BAR_H)

    const ratio = this.hp / this.maxHp
    const tint = ratio > 0.5 ? 0x22cc22 : ratio > 0.25 ? 0xffaa00 : 0xee2222
    this.hpBar.fillStyle(tint)
    this.hpBar.fillRect(bx, by, HP_BAR_W * ratio, HP_BAR_H)

    this.hpBar.lineStyle(1, 0x000000, 0.7)
    this.hpBar.strokeRect(bx, by, HP_BAR_W, HP_BAR_H)
  }

  showRange(visible: boolean): void {
    this.rangeCircle.setVisible(visible)
  }

  private findTarget(enemies: Enemy[], range: number): Enemy | null {
    let best: Enemy | null = null
    let bestProgress = -1

    for (const enemy of enemies) {
      if (enemy.isDead || !enemy.active) continue
      const dx = enemy.x - this.x
      const dy = enemy.y - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= range) {
        // Target enemy furthest along the path
        const progress = enemy.getPathProgress()
        if (progress > bestProgress) {
          bestProgress = progress
          best = enemy
        }
      }
    }

    return best
  }

  private fireAt(target: Enemy, projectiles: Projectile[]): void {
    const cfg = TOWER_CONFIGS[this.towerType]
    const pierce = this.towerType === 'lancer' ? 2 : 1
    // Offset spawn slightly up so arrow shoots from the unit's body/bow, not their feet
    const projectile = new Projectile(this.scene, this.x, this.y - 96, target, cfg.damage, pierce)
    projectiles.push(projectile)

    // Warrior splash: damage nearby enemies in range immediately
    if (this.towerType === 'warrior') {
      const splash = cfg.range * 0.6
      for (const enemy of this.scene.children.getChildren() as Phaser.GameObjects.GameObject[]) {
        if (enemy instanceof Enemy && enemy !== target && !enemy.isDead) {
          const dx = enemy.x - target.x
          const dy = enemy.y - target.y
          if (Math.sqrt(dx * dx + dy * dy) < splash) {
            enemy.takeDamage(cfg.damage * 0.4)
          }
        }
      }
    }
  }

  private setSpriteScale(type: TowerType): void {
    // Lancer frames are 320x320, others are 192x192
    const scale = (type === 'lancer') ? 0.28 : 0.42
    this.sprite.setScale(scale)
  }

  static getBuildingKey(type: TowerType, side: PlayerSide = 'left'): string {
    const prefix = side === 'right' ? 'building-red' : 'building-blue'
    switch (type) {
      case 'archer':  return `${prefix}-archery`
      case 'warrior': return `${prefix}-barracks`
      case 'lancer':  return `${prefix}-tower`
      case 'monk':    return `${prefix}-monastery`
    }
  }

  destroy(fromScene?: boolean): void {
    if (!this.isDestroyed) {
      this.rangeCircle.destroy()
      if (this.hpBar) this.hpBar.destroy()
    }
    super.destroy(fromScene)
  }
}
