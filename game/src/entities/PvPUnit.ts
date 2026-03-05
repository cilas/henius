import Phaser from 'phaser'
import type { PlayerSide } from '@kingdom-wars/shared'
import { PVP_UNIT_CONFIGS, type PvpUnitType } from '../config/units.ts'

const INTERP_SPEED  = 220   // px/s — how fast the sprite chases server position
const WAYPOINT_SNAP = 2     // px — snap threshold before idling
const HP_BAR_WIDTH  = 48
const HP_BAR_HEIGHT = 5

/**
 * Server-driven PvP unit.
 *
 * The server sends the authoritative position; the client interpolates the
 * sprite smoothly via `moveTo()`. HP is updated via `updateHp()`.
 * Call `die()` when the server reports the unit has died.
 *
 * Animation convention:
 *  - 'left' side: blue unit sprites  (archer, warrior, lancer, monk)
 *  - 'right' side: red unit sprites  (pawn, red-warrior, red-lancer, monk)
 *    (no red monk asset; blue monk is reused for the right side)
 */
export class PvPUnit extends Phaser.GameObjects.Sprite {
  readonly unitId:   string
  readonly unitType: PvpUnitType
  readonly side:     PlayerSide
  isDead: boolean

  private hp: number
  private maxHp: number
  private hpBar: Phaser.GameObjects.Graphics
  private targetX: number
  private targetY: number
  private readonly runAnim:  string
  private readonly idleAnim: string

  constructor(
    scene:    Phaser.Scene,
    id:       string,
    type:     PvpUnitType,
    side:     PlayerSide,
    x:        number,
    y:        number,
    hp:       number,
  ) {
    const cfg     = PVP_UNIT_CONFIGS[type]
    const runAnim = PvPUnit.resolveAnim(type, side, 'run')
    super(scene, x, y, runAnim)

    this.unitId   = id
    this.unitType = type
    this.side     = side
    this.isDead   = false
    this.hp       = hp
    this.maxHp    = hp
    this.targetX  = x
    this.targetY  = y
    this.runAnim  = runAnim
    this.idleAnim = PvPUnit.resolveAnim(type, side, 'idle')

    this.setScale(cfg.scale)
    this.setOrigin(0.5, 0.8)
    this.setDepth(y)
    this.play(this.runAnim)

    // Right-side units face left initially
    if (side === 'right') this.setFlipX(true)

    scene.add.existing(this)

    this.hpBar = scene.add.graphics()
    this.hpBar.setDepth(20000)
    this.drawHpBar()
  }

  update(delta: number): void {
    if (this.isDead) return

    const dx   = this.targetX - this.x
    const dy   = this.targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > WAYPOINT_SNAP) {
      const step = Math.min(INTERP_SPEED * (delta / 1000), dist)
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
      this.setFlipX(dx < 0)
      this.setDepth(this.y)
      if (this.anims.currentAnim?.key !== this.runAnim) {
        this.play(this.runAnim)
      }
    } else {
      if (this.anims.currentAnim?.key !== this.idleAnim) {
        this.play(this.idleAnim)
      }
    }

    this.drawHpBar()
  }

  /** Set the authoritative server position (sprite interpolates toward it). */
  moveTo(x: number, y: number): void {
    this.targetX = x
    this.targetY = y
  }

  updateHp(hp: number, maxHp: number): void {
    this.hp    = hp
    this.maxHp = maxHp
    this.drawHpBar()
  }

  die(): void {
    if (this.isDead) return
    this.isDead = true
    if (this.hpBar.active) this.hpBar.destroy()

    const particleKey   = this.unitType === 'lancer' ? 'explosion' : 'dust'
    const particleScale = this.unitType === 'lancer' ? 0.6 : 1.0
    const particle = this.scene.add.sprite(this.x, this.y, particleKey)
    particle.setScale(particleScale).setDepth(this.y + 1)
    particle.play(particleKey)
    particle.once('animationcomplete', () => particle.destroy())

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 180,
      onComplete: () => { this.destroy() },
    })
  }

  destroy(fromScene?: boolean): void {
    if (this.hpBar.active) this.hpBar.destroy()
    super.destroy(fromScene)
  }

  private drawHpBar(): void {
    this.hpBar.clear()
    const bx    = this.x - HP_BAR_WIDTH / 2
    const by    = this.y - this.displayHeight * 0.8 - 6
    const ratio = this.hp / this.maxHp
    const color = ratio > 0.5 ? 0x22cc22 : ratio > 0.25 ? 0xffaa00 : 0xcc2222

    this.hpBar.fillStyle(0x330000)
    this.hpBar.fillRect(bx, by, HP_BAR_WIDTH, HP_BAR_HEIGHT)
    this.hpBar.fillStyle(color)
    this.hpBar.fillRect(bx, by, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT)
    this.hpBar.lineStyle(1, 0x000000, 0.8)
    this.hpBar.strokeRect(bx, by, HP_BAR_WIDTH, HP_BAR_HEIGHT)
  }

  /** Resolve the correct animation key for a given unit type, side, and state. */
  private static resolveAnim(
    type:  PvpUnitType,
    side:  PlayerSide,
    state: 'run' | 'idle',
  ): string {
    if (side === 'left') {
      // Blue units — animKey in config equals the blue anim prefix
      const prefix = PVP_UNIT_CONFIGS[type].animKey
      return `${prefix}-${state}`
    }
    // Red units — have their own prefixes (no red monk → fall back to blue)
    switch (type) {
      case 'pawn':    return `pawn-${state}`
      case 'warrior': return `red-warrior-${state}`
      case 'lancer':  return `red-lancer-${state}`
      case 'monk':    return `monk-${state}`   // blue monk reused
    }
  }
}
