import Phaser from 'phaser'
import { TILE_SIZE } from '../config/map.ts'
import { PVP_CASTLE_HP } from '../config/pvp-map.ts'
import type { PlayerSide } from '@kingdom-wars/shared'

const BAR_WIDTH  = 128
const BAR_HEIGHT = 12

export class Castle extends Phaser.GameObjects.Container {
  private hpBar: Phaser.GameObjects.Graphics
  private hp: number
  private maxHp: number

  constructor(scene: Phaser.Scene, col: number, row: number, side: PlayerSide) {
    const x = col * TILE_SIZE + TILE_SIZE / 2
    const y = row * TILE_SIZE + TILE_SIZE / 2
    super(scene, x, y)

    this.hp    = PVP_CASTLE_HP
    this.maxHp = PVP_CASTLE_HP

    // Castle sprite
    const spriteKey = side === 'left' ? 'castle-blue' : 'castle-red'
    const sprite = scene.add.image(0, 0, spriteKey)
    const scale  = (TILE_SIZE * 2) / Math.max(sprite.width, sprite.height)
    sprite.setScale(scale)
    sprite.setOrigin(0.5, 0.8)
    this.add(sprite)

    this.setDepth(y + TILE_SIZE)
    scene.add.existing(this)

    // HP bar lives outside the container so it always renders on top
    this.hpBar = scene.add.graphics()
    this.hpBar.setDepth(20000)
    this.drawHpBar()
  }

  updateHp(hp: number, maxHp: number): void {
    const prevHp = this.hp
    this.hp    = hp
    this.maxHp = maxHp
    this.drawHpBar()
    if (hp < prevHp) this.shake()
  }

  private drawHpBar(): void {
    this.hpBar.clear()
    const bx    = this.x - BAR_WIDTH / 2
    const by    = this.y - 80
    const ratio = this.hp / this.maxHp
    const color = ratio > 0.5 ? 0x22cc22 : ratio > 0.25 ? 0xffaa00 : 0xcc2222

    this.hpBar.fillStyle(0x330000)
    this.hpBar.fillRect(bx, by, BAR_WIDTH, BAR_HEIGHT)
    this.hpBar.fillStyle(color)
    this.hpBar.fillRect(bx, by, BAR_WIDTH * ratio, BAR_HEIGHT)
    this.hpBar.lineStyle(1, 0x000000, 0.8)
    this.hpBar.strokeRect(bx, by, BAR_WIDTH, BAR_HEIGHT)
  }

  private shake(): void {
    const ox = this.x
    this.scene.tweens.add({
      targets: this,
      x: { from: ox - 4, to: ox + 4 },
      duration: 40,
      yoyo: true,
      repeat: 2,
      onComplete: () => { this.x = ox },
    })
    this.scene.tweens.add({
      targets: this.list,
      alpha: 0.3,
      duration: 50,
      yoyo: true,
    })
  }

  destroy(fromScene?: boolean): void {
    if (this.hpBar.active) this.hpBar.destroy()
    super.destroy(fromScene)
  }
}
