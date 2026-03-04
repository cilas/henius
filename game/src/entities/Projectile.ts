import Phaser from 'phaser'
import type { Enemy } from './Enemy.ts'

const PROJECTILE_SPEED = 400  // px/s
const HIT_RADIUS = 16         // px - collision detection radius

export class Projectile extends Phaser.GameObjects.Image {
  private target: Enemy
  private damage: number
  private pierceCount: number  // how many enemies it can pierce through
  private pierced: Set<Enemy>
  isDone: boolean

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    pierce = 1,
  ) {
    super(scene, x, y, 'arrow')
    this.target = target
    this.damage = damage
    this.pierceCount = pierce
    this.pierced = new Set()
    this.isDone = false

    this.setScale(0.5)
    this.setDepth(20000)
    scene.add.existing(this)
  }

  update(delta: number, allEnemies: Enemy[]): void {
    if (this.isDone) return

    // If target is dead, destroy projectile
    if (this.target.isDead || !this.target.active) {
      this.isDone = true
      this.destroy()
      return
    }

    // Aim for the center of the enemy's body, not their feet
    const tx = this.target.x
    const ty = this.target.y - 32
    const dx = tx - this.x
    const dy = ty - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Rotate arrow toward target
    this.setRotation(Math.atan2(dy, dx))

    if (dist < HIT_RADIUS) {
      // Hit primary target
      this.hitEnemy(this.target)

      // Pierce: check nearby enemies
      if (this.pierceCount > 1) {
        for (const enemy of allEnemies) {
          if (!this.pierced.has(enemy) && !enemy.isDead) {
            const edx = enemy.x - this.x
            // Compare distance relative to enemy's body center
            const edy = (enemy.y - 32) - this.y
            const edist = Math.sqrt(edx * edx + edy * edy)
            if (edist < HIT_RADIUS * 3) {
              this.hitEnemy(enemy)
              if (this.pierced.size >= this.pierceCount) break
            }
          }
        }
      }

      this.isDone = true
      this.destroy()
      return
    }

    // Move toward target
    const speed = PROJECTILE_SPEED * (delta / 1000)
    this.x += (dx / dist) * speed
    this.y += (dy / dist) * speed
  }

  private hitEnemy(enemy: Enemy): void {
    if (this.pierced.has(enemy)) return
    this.pierced.add(enemy)
    enemy.takeDamage(this.damage)
  }
}
