import Phaser from 'phaser'
import { Room } from 'colyseus.js'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/map'
import { RoomClient } from '../network/RoomClient'
import { NetworkManager } from '../network/NetworkManager'

type LobbyView = 'menu' | 'waiting'

interface PlayerSlot {
  nameTxt: Phaser.GameObjects.Text
  statusTxt: Phaser.GameObjects.Text
  indicator: Phaser.GameObjects.Graphics
}

export class LobbyScene extends Phaser.Scene {
  // ── State ───────────────────────────────────────────────────────────────
  private view: LobbyView = 'menu'
  private codeInput: string = ''
  private errorMsg: Phaser.GameObjects.Text | null = null
  private mySide: 'left' | 'right' = 'left'

  // ── Menu view objects ────────────────────────────────────────────────────
  private menuContainer!: Phaser.GameObjects.Container

  // ── Waiting room objects ──────────────────────────────────────────────
  private waitingContainer!: Phaser.GameObjects.Container
  private roomCodeTxt!: Phaser.GameObjects.Text
  private playerSlots: PlayerSlot[] = []
  private readyBtn!: Phaser.GameObjects.Container
  private isReady = false
  private activeRoom: Room | null = null
  private enteredMatch = false

  // ── Keyboard ─────────────────────────────────────────────────────────────
  private codeDisplayTxt!: Phaser.GameObjects.Text
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  constructor() {
    super({ key: 'LobbyScene' })
  }

  create(): void {
    this.drawBackground()
    this.drawTitle()
    this.buildMenuView()
    this.buildWaitingView()
    this.showView('menu')
    this.setupKeyboard()
  }

  // ── Background / chrome ──────────────────────────────────────────────────

  private drawBackground(): void {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'wood-table')
      .setOrigin(0, 0).setTileScale(0.6).setAlpha(0.25)

    const bg = this.add.graphics()
    bg.fillStyle(0x0d1520, 0.88)
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    const border = this.add.graphics()
    border.lineStyle(3, 0x8B6914, 0.9)
    border.strokeRect(24, 24, GAME_WIDTH - 48, GAME_HEIGHT - 48)
    border.lineStyle(1, 0xffd700, 0.4)
    border.strokeRect(28, 28, GAME_WIDTH - 56, GAME_HEIGHT - 56)
  }

  private drawTitle(): void {
    const titleBg = this.add.graphics()
    titleBg.fillStyle(0x1a0a00, 0.75)
    titleBg.fillRoundedRect(GAME_WIDTH / 2 - 260, 50, 520, 90, 12)
    titleBg.lineStyle(2, 0x8B6914, 0.8)
    titleBg.strokeRoundedRect(GAME_WIDTH / 2 - 260, 50, 520, 90, 12)

    this.add.text(GAME_WIDTH / 2, 95, 'KINGDOM WARS', {
      fontSize: '46px', fontStyle: 'bold',
      color: '#ffd700', stroke: '#3a1a00', strokeThickness: 6,
    }).setOrigin(0.5)

    // Decorative castles
    this.add.image(60, GAME_HEIGHT / 2, 'castle-blue')
      .setScale(0.45).setAlpha(0.35).setTint(0x8888ff)
    this.add.image(GAME_WIDTH - 60, GAME_HEIGHT / 2, 'castle-red')
      .setScale(0.45).setAlpha(0.35).setTint(0xff8888)
  }

  // ── Menu view ────────────────────────────────────────────────────────────

  private buildMenuView(): void {
    this.menuContainer = this.add.container(0, 0)
    const cx = GAME_WIDTH / 2

    // Panel
    const panel = this.add.graphics()
    panel.fillStyle(0x12243a, 0.85)
    panel.fillRoundedRect(cx - 280, 165, 560, 410, 14)
    panel.lineStyle(2, 0x3a6ea5, 0.7)
    panel.strokeRoundedRect(cx - 280, 165, 560, 410, 14)
    this.menuContainer.add(panel)

    // ── Create room section ────────────────────────────────────────────────
    const createLbl = this.add.text(cx, 210, 'CRIAR NOVA SALA', {
      fontSize: '15px', color: '#aabbcc', letterSpacing: 2,
    }).setOrigin(0.5)
    this.menuContainer.add(createLbl)

    const createBtn = this.makeButton(cx, 270, 260, 56, 'CRIAR SALA', () => this.onCreateRoom())
    this.menuContainer.add(createBtn)

    // ── Divider ────────────────────────────────────────────────────────────
    const divLine = this.add.graphics()
    divLine.lineStyle(1, 0x3a6ea5, 0.4)
    divLine.lineBetween(cx - 220, 330, cx + 220, 330)
    this.menuContainer.add(divLine)

    const orTxt = this.add.text(cx, 330, 'OU', {
      fontSize: '13px', color: '#667788',
    }).setOrigin(0.5)
    this.menuContainer.add(orTxt)

    // ── Join room section ──────────────────────────────────────────────────
    const joinLbl = this.add.text(cx, 365, 'ENTRAR COM CÓDIGO', {
      fontSize: '15px', color: '#aabbcc', letterSpacing: 2,
    }).setOrigin(0.5)
    this.menuContainer.add(joinLbl)

    // Code input box
    const inputBg = this.add.graphics()
    inputBg.fillStyle(0x0a1520, 0.9)
    inputBg.fillRoundedRect(cx - 140, 388, 280, 50, 8)
    inputBg.lineStyle(2, 0x3a6ea5, 0.8)
    inputBg.strokeRoundedRect(cx - 140, 388, 280, 50, 8)
    this.menuContainer.add(inputBg)

    this.codeDisplayTxt = this.add.text(cx, 413, 'Digite o código...', {
      fontSize: '22px', fontStyle: 'bold',
      color: '#667788', letterSpacing: 6,
    }).setOrigin(0.5)
    this.menuContainer.add(this.codeDisplayTxt)

    const joinBtn = this.makeButton(cx, 482, 260, 56, 'ENTRAR NA SALA', () => this.onJoinRoom())
    this.menuContainer.add(joinBtn)

    // ── Error message ──────────────────────────────────────────────────────
    this.errorMsg = this.add.text(cx, 543, '', {
      fontSize: '14px', color: '#ff6666',
      wordWrap: { width: 480 },
    }).setOrigin(0.5)
    this.menuContainer.add(this.errorMsg)

    // ── Back button ────────────────────────────────────────────────────────
    const backBtn = this.makeSmallButton(cx, 592, '← Voltar', () => {
      this.scene.start('MenuScene')
    })
    this.menuContainer.add(backBtn)
  }

  // ── Waiting room view ────────────────────────────────────────────────────

  private buildWaitingView(): void {
    this.waitingContainer = this.add.container(0, 0)
    const cx = GAME_WIDTH / 2

    // Panel
    const panel = this.add.graphics()
    panel.fillStyle(0x12243a, 0.85)
    panel.fillRoundedRect(cx - 310, 155, 620, 460, 14)
    panel.lineStyle(2, 0x3a6ea5, 0.7)
    panel.strokeRoundedRect(cx - 310, 155, 620, 460, 14)
    this.waitingContainer.add(panel)

    // Room code display
    const codeLbl = this.add.text(cx, 195, 'CÓDIGO DA SALA', {
      fontSize: '13px', color: '#aabbcc', letterSpacing: 3,
    }).setOrigin(0.5)
    this.waitingContainer.add(codeLbl)

    this.roomCodeTxt = this.add.text(cx, 237, '------', {
      fontSize: '42px', fontStyle: 'bold',
      color: '#ffd700', stroke: '#3a1a00', strokeThickness: 4,
      letterSpacing: 10,
    }).setOrigin(0.5)
    this.waitingContainer.add(this.roomCodeTxt)

    const shareHint = this.add.text(cx, 270, 'Compartilhe este código com seu adversário', {
      fontSize: '13px', color: '#667788',
    }).setOrigin(0.5)
    this.waitingContainer.add(shareHint)

    // Player slots
    const slotY = [340, 440]
    const slotLabels = ['Jogador 1 (Esquerda)', 'Jogador 2 (Direita)']
    this.playerSlots = slotLabels.map((label, i) => this.buildPlayerSlot(cx, slotY[i], label))
    this.playerSlots.forEach(s => this.waitingContainer.add([s.indicator, s.nameTxt, s.statusTxt]))

    // Ready button
    this.readyBtn = this.makeButton(cx, 530, 260, 60, '⚔  PRONTO', () => this.onReady())
    this.waitingContainer.add(this.readyBtn)

    // Leave button
    const leaveBtn = this.makeSmallButton(cx, 588, '← Sair da Sala', () => this.onLeave())
    this.waitingContainer.add(leaveBtn)
  }

  private buildPlayerSlot(cx: number, y: number, label: string): PlayerSlot {
    const indicator = this.add.graphics()
    indicator.fillStyle(0x223344, 0.9)
    indicator.fillRoundedRect(cx - 240, y - 30, 480, 60, 8)
    indicator.lineStyle(1, 0x3a6ea5, 0.5)
    indicator.strokeRoundedRect(cx - 240, y - 30, 480, 60, 8)

    const nameTxt = this.add.text(cx - 180, y, label, {
      fontSize: '16px', color: '#aabbdd',
    }).setOrigin(0, 0.5)

    const statusTxt = this.add.text(cx + 190, y, 'Aguardando...', {
      fontSize: '14px', color: '#667788',
    }).setOrigin(1, 0.5)

    return { indicator, nameTxt, statusTxt }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private async onCreateRoom(): Promise<void> {
    this.showError('')
    this.setLoading(true, 'Criando sala...')

    const result = await RoomClient.create('Jogador')
    this.setLoading(false)

    if (!result.ok) {
      this.showError(result.error)
      return
    }

    const { room, roomCode } = result.data
    this.enterWaitingRoom(room, roomCode)
  }

  private async onJoinRoom(): Promise<void> {
    const code = this.codeInput.trim()
    if (code.length < 6) {
      this.showError('Digite o código completo (6 caracteres)')
      return
    }

    this.showError('')
    this.setLoading(true, 'Entrando na sala...')

    const result = await RoomClient.join(code, 'Jogador')
    this.setLoading(false)

    if (!result.ok) {
      this.showError(result.error)
      return
    }

    const roomCode = this.resolveRoomCode(result.data)
    this.resolveMySide(result.data)
    this.enterWaitingRoom(result.data, roomCode)
  }

  private onReady(): void {
    if (this.isReady) return
    this.isReady = true
    NetworkManager.get().sendReady()
    this.updateMySlot('Você', 'Pronto! ✓', 0x44aa44)
    // Disable ready button visually
    this.readyBtn.setAlpha(0.5)
  }

  private async onLeave(): Promise<void> {
    await NetworkManager.get().disconnect()
    this.activeRoom = null
    this.isReady = false
    this.showView('menu')
  }

  // ── Waiting room setup ────────────────────────────────────────────────────

  private enterWaitingRoom(room: Room, roomCode: string): void {
    this.activeRoom = room
    this.enteredMatch = false
    this.roomCodeTxt.setText(roomCode)
    this.isReady = false
    this.readyBtn.setAlpha(1)
    this.resetPlayerSlots()
    this.showView('waiting')

    this.syncLobbyFromState(room)

    room.onStateChange((state: unknown) => {
      if (this.activeRoom !== room) return
      this.syncLobbyFromState(room, state)
    })

    // Listen for server-driven phase change (battle starts)
    room.onMessage('phase_changed', (data: { phase: string }) => {
      if (this.activeRoom !== room || this.enteredMatch) return
      if (data.phase !== 'setup' && data.phase !== 'battle') return

      this.enteredMatch = true
      this.resolveMySide(room)
      this.scene.start('PvPGameScene', { side: this.mySide, room })
    })
  }

  private resolveRoomCode(room: Room): string {
    const state = room.state as { roomCode?: unknown }
    return typeof state.roomCode === 'string' ? state.roomCode : room.roomId
  }

  private resolveMySide(room: Room): void {
    const players = (room.state as { players?: { get?: (id: string) => { side?: string } | undefined } }).players
    const me = players?.get?.(room.sessionId)
    if (me?.side === 'left' || me?.side === 'right') {
      this.mySide = me.side
    }
  }

  private syncLobbyFromState(room: Room, rawState?: unknown): void {
    const state = (rawState ?? room.state) as {
      players?: {
        get?: (id: string) => { side?: string } | undefined
        forEach?: (cb: (player: {
          id?: string
          name?: string
          side?: string
          ready?: boolean
        }, key: string) => void) => void
      }
    }

    this.resolveMySide(room)

    const slots = {
      left: this.playerSlots[0],
      right: this.playerSlots[1],
    } as const

    const baseLabels = {
      left: 'Jogador 1 (Esquerda)',
      right: 'Jogador 2 (Direita)',
    } as const

    for (const side of ['left', 'right'] as const) {
      slots[side].nameTxt.setText(baseLabels[side])
      slots[side].statusTxt.setText('Aguardando...')
      slots[side].statusTxt.setColor('#667788')
    }

    state.players?.forEach?.((player, key) => {
      const side = player.side === 'right' ? 'right' : 'left'
      const slot = slots[side]
      const isMe = key === room.sessionId
      const name = isMe ? 'Você' : (player.name || 'Jogador')
      const ready = !!player.ready

      slot.nameTxt.setText(name)
      slot.statusTxt.setText(ready ? 'Pronto! ✓' : 'Conectado')
      slot.statusTxt.setColor(ready ? '#44aa44' : '#aabbdd')
    })
  }

  private resetPlayerSlots(): void {
    const labels = ['Jogador 1 (Esquerda)', 'Jogador 2 (Direita)']
    this.playerSlots.forEach((slot, i) => {
      slot.nameTxt.setText(labels[i])
      slot.statusTxt.setText('Aguardando...')
      slot.statusTxt.setColor('#667788')
      // Reset indicator tint
      slot.indicator.clear()
      slot.indicator.fillStyle(0x223344, 0.9)
      slot.indicator.fillRoundedRect(-240 + GAME_WIDTH / 2, i === 0 ? 310 : 410, 480, 60, 8)
      slot.indicator.lineStyle(1, 0x3a6ea5, 0.5)
      slot.indicator.strokeRoundedRect(-240 + GAME_WIDTH / 2, i === 0 ? 310 : 410, 480, 60, 8)
    })
  }

  private updateMySlot(name: string, status: string, color: number): void {
    const idx = this.mySide === 'left' ? 0 : 1
    this.playerSlots[idx].nameTxt.setText(name)
    this.playerSlots[idx].statusTxt.setText(status)
    this.playerSlots[idx].statusTxt.setColor(`#${color.toString(16).padStart(6, '0')}`)
  }

  // ── Keyboard input ────────────────────────────────────────────────────────

  private setupKeyboard(): void {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.view !== 'menu') return

      if (event.key === 'Backspace') {
        this.codeInput = this.codeInput.slice(0, -1)
      } else if (event.key === 'Enter') {
        this.onJoinRoom()
      } else if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
        if (this.codeInput.length < 6) {
          this.codeInput += event.key.toUpperCase()
        }
      }

      this.updateCodeDisplay()
    })
  }

  private updateCodeDisplay(): void {
    if (this.codeInput.length === 0) {
      this.codeDisplayTxt.setText('Digite o código...').setColor('#667788')
    } else {
      // Show entered chars + underscores for remaining
      const display = this.codeInput.padEnd(6, '_')
      this.codeDisplayTxt.setText(display).setColor('#e0e8ff')
    }
  }

  // ── View switching ────────────────────────────────────────────────────────

  private showView(view: LobbyView): void {
    this.view = view
    this.menuContainer.setVisible(view === 'menu')
    this.waitingContainer.setVisible(view === 'waiting')
  }

  // ── UI Helpers ────────────────────────────────────────────────────────────

  private makeButton(
    x: number, y: number, w: number, h: number,
    label: string, onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)

    const normal = this.add.nineslice(0, 0, 'btn-blue', undefined, w, h, 32, 32, 32, 32)
    normal.setInteractive({ cursor: 'pointer' })

    const pressed = this.add.nineslice(0, 4, 'btn-blue-press', undefined, w, h, 32, 32, 32, 32)
    pressed.setVisible(false)

    const txt = this.add.text(0, 0, label, {
      fontSize: '18px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#1a3a6a', strokeThickness: 3,
    }).setOrigin(0.5)

    const reset = () => {
      normal.clearTint()
      normal.setVisible(true)
      pressed.setVisible(false)
      txt.setY(0)
    }
    const applyPressed = () => {
      normal.setVisible(false)
      pressed.setVisible(true)
      txt.setY(4)
    }

    normal.on('pointerover', () => normal.setTint(0xddeeFF))
    normal.on('pointerout', reset)
    normal.on('pointerdown', applyPressed)
    normal.on('pointerup', () => { reset(); onClick() })
    pressed.setInteractive({ cursor: 'pointer' })
    pressed.on('pointerup', () => { reset(); onClick() })
    pressed.on('pointerout', reset)

    container.add([normal, pressed, txt])
    return container
  }

  private makeSmallButton(
    x: number, y: number, label: string, onClick: () => void
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, label, {
      fontSize: '14px', color: '#667788',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
      .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#aabbcc') })
      .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor('#667788') })
      .on('pointerup', onClick)
  }

  private showError(msg: string): void {
    this.errorMsg?.setText(msg)
  }

  private setLoading(loading: boolean, msg = ''): void {
    this.menuContainer.setAlpha(loading ? 0.5 : 1)
    if (loading) this.showError(msg)
  }
}
