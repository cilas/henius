import Phaser from 'phaser'
import { registerAnimations } from '../utils/animations.ts'

const ASSETS = 'assets'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    // Progress bar
    const { width, height } = this.scale
    const barW = 400
    const barH = 30
    const bx = (width - barW) / 2
    const by = height / 2 - barH / 2

    const bg = this.add.graphics()
    bg.fillStyle(0x222222)
    bg.fillRect(bx - 2, by - 2, barW + 4, barH + 4)

    const bar = this.add.graphics()

    const loadText = this.add.text(width / 2, by - 20, 'Loading...', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5, 1)

    this.load.on('progress', (value: number) => {
      bar.clear()
      bar.fillStyle(0x4488ff)
      bar.fillRect(bx, by, barW * value, barH)
      loadText.setText(`Loading... ${Math.round(value * 100)}%`)
    })

    // ── Terrain ──────────────────────────────────────────────────────────────
    this.load.image('tilemap',   `${ASSETS}/Terrain/Tileset/Tilemap_color1.png`)
    this.load.image('tilemap-sand', `${ASSETS}/Terrain/Tileset/Tilemap_color2.png`)
    this.load.image('water-bg',  `${ASSETS}/Terrain/Tileset/Water Background color.png`)
    this.load.image('shadow',    `${ASSETS}/Terrain/Tileset/Shadow.png`)
    this.load.spritesheet('water-foam', `${ASSETS}/Terrain/Tileset/Water Foam.png`, {
      frameWidth: 192, frameHeight: 192,
    })

    // ── Buildings ─────────────────────────────────────────────────────────────
    this.load.image('castle-blue',     `${ASSETS}/Buildings/Blue Buildings/Castle.png`)
    this.load.image('castle-red',      `${ASSETS}/Buildings/Red Buildings/Castle.png`)
    this.load.image('building-archery',       `${ASSETS}/Buildings/Blue Buildings/Archery.png`)
    this.load.image('building-barracks',      `${ASSETS}/Buildings/Blue Buildings/Barracks.png`)
    this.load.image('building-tower',         `${ASSETS}/Buildings/Blue Buildings/Tower.png`)
    this.load.image('building-monastery',     `${ASSETS}/Buildings/Blue Buildings/Monastery.png`)
    this.load.image('building-blue-archery',  `${ASSETS}/Buildings/Blue Buildings/Archery.png`)
    this.load.image('building-blue-barracks', `${ASSETS}/Buildings/Blue Buildings/Barracks.png`)
    this.load.image('building-blue-tower',    `${ASSETS}/Buildings/Blue Buildings/Tower.png`)
    this.load.image('building-blue-monastery',`${ASSETS}/Buildings/Blue Buildings/Monastery.png`)
    this.load.image('building-red-archery',   `${ASSETS}/Buildings/Red Buildings/Archery.png`)
    this.load.image('building-red-barracks',  `${ASSETS}/Buildings/Red Buildings/Barracks.png`)
    this.load.image('building-red-tower',     `${ASSETS}/Buildings/Red Buildings/Tower.png`)
    this.load.image('building-red-monastery', `${ASSETS}/Buildings/Red Buildings/Monastery.png`)
    this.load.image('building-house1',   `${ASSETS}/Buildings/Blue Buildings/House1.png`)

    // ── UI Elements ───────────────────────────────────────────────────────────
    this.load.image('wood-table',      `${ASSETS}/UI Elements/UI Elements/Wood Table/WoodTable.png`)
    this.load.image('wood-table-slot', `${ASSETS}/UI Elements/UI Elements/Wood Table/WoodTable_Slots.png`)
    this.load.image('btn-blue',        `${ASSETS}/UI Elements/UI Elements/Buttons/BigBlueButton_Regular.png`)
    this.load.image('btn-blue-press',  `${ASSETS}/UI Elements/UI Elements/Buttons/BigBlueButton_Pressed.png`)
    this.load.image('btn-red',         `${ASSETS}/UI Elements/UI Elements/Buttons/BigRedButton_Regular.png`)
    this.load.image('ribbons-small',   `${ASSETS}/UI Elements/UI Elements/Ribbons/SmallRibbons.png`)
    this.load.image('banner',          `${ASSETS}/UI Elements/UI Elements/Banners/Banner.png`)
    this.load.image('bar-big-base',    `${ASSETS}/UI Elements/UI Elements/Bars/BigBar_Base.png`)
    this.load.image('bar-big-fill',    `${ASSETS}/UI Elements/UI Elements/Bars/BigBar_Fill.png`)
    this.load.image('bar-small-base',  `${ASSETS}/UI Elements/UI Elements/Bars/SmallBar_Base.png`)
    this.load.image('bar-small-fill',  `${ASSETS}/UI Elements/UI Elements/Bars/SmallBar_Fill.png`)
    this.load.image('gold-icon',       `${ASSETS}/Terrain/Resources/Gold/Gold Resource/Gold_Resource.png`)

    // ── Particle FX ───────────────────────────────────────────────────────────
    this.load.spritesheet('dust',      `${ASSETS}/Particle FX/Dust_01.png`,      { frameWidth: 64,  frameHeight: 64  })
    this.load.spritesheet('explosion', `${ASSETS}/Particle FX/Explosion_01.png`, { frameWidth: 192, frameHeight: 192 })

    // ── Arrow ─────────────────────────────────────────────────────────────────
    this.load.image('arrow', `${ASSETS}/Units/Blue Units/Archer/Arrow.png`)

    // ── Blue Units (192×192 frames unless noted) ──────────────────────────────
    this.load.spritesheet('archer-idle', `${ASSETS}/Units/Blue Units/Archer/Archer_Idle.png`, {
      frameWidth: 192, frameHeight: 192,
    })
    this.load.spritesheet('archer-run', `${ASSETS}/Units/Blue Units/Archer/Archer_Run.png`, {
      frameWidth: 192, frameHeight: 192,
    })
    this.load.spritesheet('archer-shoot', `${ASSETS}/Units/Blue Units/Archer/Archer_Shoot.png`, {
      frameWidth: 192, frameHeight: 192,
    })

    this.load.spritesheet('warrior-idle', `${ASSETS}/Units/Blue Units/Warrior/Warrior_Idle.png`, {
      frameWidth: 192, frameHeight: 192,
    })
    this.load.spritesheet('warrior-run', `${ASSETS}/Units/Blue Units/Warrior/Warrior_Run.png`, {
      frameWidth: 192, frameHeight: 192,
    })
    this.load.spritesheet('warrior-attack', `${ASSETS}/Units/Blue Units/Warrior/Warrior_Attack1.png`, {
      frameWidth: 192, frameHeight: 192,
    })

    this.load.spritesheet('lancer-idle', `${ASSETS}/Units/Blue Units/Lancer/Lancer_Idle.png`, {
      frameWidth: 320, frameHeight: 320,
    })
    this.load.spritesheet('lancer-run', `${ASSETS}/Units/Blue Units/Lancer/Lancer_Run.png`, {
      frameWidth: 320, frameHeight: 320,
    })
    this.load.spritesheet('lancer-attack', `${ASSETS}/Units/Blue Units/Lancer/Lancer_Right_Attack.png`, {
      frameWidth: 320, frameHeight: 320,
    })

    this.load.spritesheet('monk-idle', `${ASSETS}/Units/Blue Units/Monk/Idle.png`, {
      frameWidth: 192, frameHeight: 192,
    })
    this.load.spritesheet('monk-run', `${ASSETS}/Units/Blue Units/Monk/Run.png`, {
      frameWidth: 192, frameHeight: 192,
    })
    this.load.spritesheet('monk-heal', `${ASSETS}/Units/Blue Units/Monk/Heal.png`, {
      frameWidth: 192, frameHeight: 192,
    })

    // ── Red Units ─────────────────────────────────────────────────────────────
    this.load.spritesheet('pawn-idle', `${ASSETS}/Units/Red Units/Pawn/Pawn_Idle.png`, {
      frameWidth: 192, frameHeight: 192,
    })
    this.load.spritesheet('pawn-run', `${ASSETS}/Units/Red Units/Pawn/Pawn_Run.png`, {
      frameWidth: 192, frameHeight: 192,
    })

    this.load.spritesheet('red-warrior-idle', `${ASSETS}/Units/Red Units/Warrior/Warrior_Idle.png`, {
      frameWidth: 192, frameHeight: 192,
    })
    this.load.spritesheet('red-warrior-run', `${ASSETS}/Units/Red Units/Warrior/Warrior_Run.png`, {
      frameWidth: 192, frameHeight: 192,
    })

    this.load.spritesheet('red-lancer-idle', `${ASSETS}/Units/Red Units/Lancer/Lancer_Idle.png`, {
      frameWidth: 320, frameHeight: 320,
    })
    this.load.spritesheet('red-lancer-run', `${ASSETS}/Units/Red Units/Lancer/Lancer_Run.png`, {
      frameWidth: 320, frameHeight: 320,
    })
  }

  create(): void {
    registerAnimations(this.anims)
    this.scene.start('MenuScene')
  }
}
