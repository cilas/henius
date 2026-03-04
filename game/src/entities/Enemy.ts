import Phaser from 'phaser'
import { SPAWN_POINT, PATH_WAYPOINTS } from '../config/map.ts'
import { ENEMY_CONFIGS, type EnemyType } from '../config/enemies.ts'

const WAYPOINT_REACH_DIST = 18  // px — bigger tolerance avoids single-file convergence
const LANE_SPREAD = 20          // px — slightly tighter spread since sprites are bigger
const SPEED_JITTER = 0.18       // ±18% speed variation
const HP_BAR_WIDTH = 56
const HP_BAR_HEIGHT = 6
const HP_BAR_FRAME_HEIGHT = 96  // half-height of 192px frame in sprite pixels

export class Enemy extends Phaser.GameObjects.Sprite {
  readonly enemyType: EnemyType
  hp: number
  maxHp: number
  speed: number
  reward: number
  isDead: boolean

  private waypointIndex: number
  private hpBar: Phaser.GameObjects.Graphics
  // Fixed per-enemy lane offset applied to every waypoint so the
  // enemy walks a consistent "lane" slightly off the path center.
  private laneOx: number
  private laneOy: number

  constructor(scene: Phaser.Scene, type: EnemyType) {
    const cfg = ENEMY_CONFIGS[type]

    // Spawn with a small random offset so enemies don't all start stacked
    const spawnX = SPAWN_POINT.x + Phaser.Math.Between(-8, 8)
    const spawnY = SPAWN_POINT.y + Phaser.Math.Between(-LANE_SPREAD, LANE_SPREAD)
    super(scene, spawnX, spawnY, cfg.runAnim)

    this.enemyType = type
    this.hp = cfg.hp
    this.maxHp = cfg.hp
    // Speed variation: each enemy is slightly faster or slower
    this.speed = cfg.speed * (1 + Phaser.Math.FloatBetween(-SPEED_JITTER, SPEED_JITTER))
    this.reward = cfg.reward
    this.isDead = false
    this.waypointIndex = 0

    // Lane offset: a fixed (x, y) displacement applied to every waypoint.
    // We alternate the dominant axis so enemies spread along whichever
    // dimension is perpendicular to the current path segment.
    this.laneOx = Phaser.Math.Between(-LANE_SPREAD, LANE_SPREAD)
    this.laneOy = Phaser.Math.Between(-LANE_SPREAD, LANE_SPREAD)

    this.setScale(cfg.scale)
    this.setOrigin(0.5, 0.8) // Anchor near the feet for proper Y-sorting
    this.setDepth(this.y)
    this.play(cfg.runAnim)

    scene.add.existing(this)

    this.hpBar = scene.add.graphics()
    this.hpBar.setDepth(20000) // HP bars always on top of characters
    this.drawHpBar()
  }

  update(delta: number): boolean {
    if (this.isDead) return false

    const wp = PATH_WAYPOINTS[this.waypointIndex]
    if (!wp) return true  // reached castle

    // Apply lane offset to the target waypoint
    const tx = wp.x + this.laneOx
    const ty = wp.y + this.laneOy

    const dx = tx - this.x
    const dy = ty - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < WAYPOINT_REACH_DIST) {
      this.waypointIndex++
      if (this.waypointIndex >= PATH_WAYPOINTS.length) {
        return true  // reached castle
      }
      return false
    }

    this.setFlipX(dx < 0)

    const speed = this.speed * (delta / 1000)
    this.x += (dx / dist) * speed
    this.y += (dy / dist) * speed
    
    this.setDepth(this.y) // Live Y-sorting

    this.drawHpBar()
    return false
  }

  takeDamage(amount: number): void {
    if (this.isDead) return
    this.hp = Math.max(0, this.hp - amount)
    this.drawHpBar()
    if (this.hp <= 0) {
      this.die()
    }
  }

  // Heal by amount (for Monk towers)
  heal(amount: number): void {
    if (this.isDead) return
    // Not used for enemies - but method exists for symmetry
    void amount
  }

  die(): void {
    if (this.isDead) return
    this.isDead = true
    this.hpBar.destroy()

    // Spawn dust particle at death position
    const dustKey = (this.enemyType === 'lancer') ? 'explosion' : 'dust'
    const dustScale = (this.enemyType === 'lancer') ? 0.6 : 1.2
    const dust = this.scene.add.sprite(this.x, this.y, dustKey)
    dust.setScale(dustScale).setDepth(this.y + 1)
    dust.play(dustKey)
    dust.once('animationcomplete', () => dust.destroy())

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 180,
      onComplete: () => { this.destroy() },
    })
  }

  destroyWithBar(): void {
    this.isDead = true
    this.hpBar.destroy()
    this.destroy()
  }

  // How far along the path this enemy has progressed (0 = spawn, 1 = castle)
  getPathProgress(): number {
    return this.waypointIndex / PATH_WAYPOINTS.length
  }

  getWaypointIndex(): number {
    return this.waypointIndex
  }

  // World position of the next waypoint (used by towers to predict)
  getTargetPosition(): Phaser.Math.Vector2 {
    const wp = PATH_WAYPOINTS[this.waypointIndex] ?? PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1]
    return new Phaser.Math.Vector2(wp.x, wp.y)
  }

  private drawHpBar(): void {
    this.hpBar.clear()

    const bx = this.x - HP_BAR_WIDTH / 2
    // Place bar just above the sprite top (since origin is 0.8, top is roughly 0.8 * 192 away)
    const by = this.y - (192 * 0.8) * this.scaleY - 6

    // Background (red)
    this.hpBar.fillStyle(0xcc2222)
    this.hpBar.fillRect(bx, by, HP_BAR_WIDTH, HP_BAR_HEIGHT)

    // Foreground (green)
    const ratio = this.hp / this.maxHp
    this.hpBar.fillStyle(0x22cc22)
    this.hpBar.fillRect(bx, by, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT)

    // Border
    this.hpBar.lineStyle(1, 0x000000, 0.8)
    this.hpBar.strokeRect(bx, by, HP_BAR_WIDTH, HP_BAR_HEIGHT)
  }
}

