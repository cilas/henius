import { getStateCallbacks, type Room } from 'colyseus.js'
import type Phaser from 'phaser'
import { CASTLE_HP, decodeSlotId, type GamePhase, type PlayerSide } from '@kingdom-wars/shared'
import type { PvPGameScene } from '../scenes/PvPGameScene.ts'
import type { PvpUnitType } from '../config/units.ts'
import type { TowerType } from '../config/towers.ts'

type Unsub = () => void

interface SchemaEntity {
  listen<T>(prop: string, cb: (value: T, previousValue: T) => void): Unsub
}

interface SchemaCollection<T, K> {
  onAdd(cb: (value: T, index: K) => void, immediate?: boolean): Unsub
  onRemove(cb: (value: T, index: K) => void): Unsub
}

interface SchemaArray<T> {
  forEach(cb: (value: T, key: string) => void): void
}

interface SchemaMap<T> {
  forEach(cb: (value: T, key: string) => void): void
}

interface ClientTowerState extends SchemaEntity {
  id: string
  slotId: number
  towerType: string
  hp: number
  maxHp: number
}

interface ClientPlayerState extends SchemaEntity {
  id: string
  side: string
  gold: number
  castleHp: number
  towers: SchemaArray<ClientTowerState>
}

interface ClientUnitState extends SchemaEntity {
  id: string
  ownerId: string
  unitType: string
  x: number
  y: number
  hp: number
  maxHp: number
}

interface ClientGameState extends SchemaEntity {
  phase: string
  timer: number
  winnerId: string
  players: SchemaMap<ClientPlayerState>
  units: SchemaArray<ClientUnitState>
}

interface ClientTowerCallbacks extends SchemaEntity {}

interface ClientPlayerCallbacks extends SchemaEntity {
  towers: SchemaCollection<ClientTowerState, number>
}

interface ClientUnitCallbacks extends SchemaEntity {}

interface ClientGameStateCallbacks extends SchemaEntity {
  players: SchemaCollection<ClientPlayerState, string>
  units: SchemaCollection<ClientUnitState, number>
}

interface BoundTower {
  slotKey: string
  unsubs: Unsub[]
}

export class StateListener {
  private readonly room: Room
  private readonly scene: PvPGameScene
  private readonly emit: Phaser.Events.EventEmitter

  private readonly playerUnsubs = new Map<string, Unsub[]>()
  private readonly unitUnsubs = new Map<string, Unsub[]>()
  private readonly towerById = new Map<string, BoundTower>()
  private readonly playerSides = new Map<string, PlayerSide>()
  private stateUnsubs: Unsub[] = []
  private state: ClientGameState | null = null
  private callbacks: ((value: unknown) => unknown) | null = null

  constructor(room: Room, scene: PvPGameScene, emit: Phaser.Events.EventEmitter) {
    this.room = room
    this.scene = scene
    this.emit = emit
  }

  start(): void {
    const state = this.room.state as unknown as ClientGameState
    this.state = state
    this.callbacks = getStateCallbacks(this.room) as unknown as (value: unknown) => unknown

    this.bindState(state)

    state.players.forEach((player, sessionId) => this.bindPlayer(player, sessionId))
    state.units.forEach((unit) => this.bindUnit(unit))

    this.emitGoldForMe()
    this.emitTimer(state.timer)
    this.emitPhase(state.phase)
  }

  stop(): void {
    for (const unsubs of this.playerUnsubs.values()) {
      for (const unsub of unsubs) unsub()
    }
    for (const unsubs of this.unitUnsubs.values()) {
      for (const unsub of unsubs) unsub()
    }
    for (const bound of this.towerById.values()) {
      for (const unsub of bound.unsubs) unsub()
    }
    for (const unsub of this.stateUnsubs) unsub()

    this.playerUnsubs.clear()
    this.unitUnsubs.clear()
    this.towerById.clear()
    this.playerSides.clear()
    this.stateUnsubs = []
    this.state = null
    this.callbacks = null
  }

  private bindState(state: ClientGameState): void {
    const callbacks = this.getCallbacks<ClientGameStateCallbacks>(state)

    this.stateUnsubs.push(callbacks.players.onAdd((player, sessionId) => this.bindPlayer(player, sessionId)))
    this.stateUnsubs.push(callbacks.players.onRemove((_player, sessionId) => this.unbindPlayer(sessionId)))
    this.stateUnsubs.push(callbacks.units.onAdd((unit) => this.bindUnit(unit)))
    this.stateUnsubs.push(callbacks.units.onRemove((unit) => this.unbindUnit(unit.id)))

    this.stateUnsubs.push(
      callbacks.listen<string>('phase', (phase) => {
        this.emitPhase(phase)
      })
    )
    this.stateUnsubs.push(
      callbacks.listen<number>('timer', (timer) => {
        this.emitTimer(timer)
      })
    )
  }

  private bindPlayer(player: ClientPlayerState, sessionId: string): void {
    const side = (player.side === 'right' ? 'right' : 'left') satisfies PlayerSide
    this.playerSides.set(sessionId, side)

    this.emitCastleHp(side, player.castleHp, CASTLE_HP)
    if (sessionId === this.room.sessionId) {
      this.emit.emit('pvp-gold', player.gold)
    }

    const callbacks = this.getCallbacks<ClientPlayerCallbacks>(player)
    const unsubs: Unsub[] = []
    unsubs.push(
      callbacks.listen<number>('gold', (gold) => {
        if (sessionId === this.room.sessionId) this.emit.emit('pvp-gold', gold)
      })
    )
    unsubs.push(
      callbacks.listen<number>('castleHp', (castleHp) => {
        this.emitCastleHp(side, castleHp, CASTLE_HP)
      })
    )

    unsubs.push(callbacks.towers.onAdd((tower) => this.bindTower(tower)))
    unsubs.push(callbacks.towers.onRemove((tower) => this.unbindTower(tower.id)))
    player.towers.forEach((tower) => this.bindTower(tower))

    this.playerUnsubs.set(sessionId, unsubs)
  }

  private unbindPlayer(sessionId: string): void {
    const unsubs = this.playerUnsubs.get(sessionId)
    if (unsubs) {
      for (const unsub of unsubs) unsub()
      this.playerUnsubs.delete(sessionId)
    }
    this.playerSides.delete(sessionId)
    this.emitGoldForMe()
  }

  private bindUnit(unit: ClientUnitState): void {
    const side = this.playerSides.get(unit.ownerId) ?? 'left'
    const type = unit.unitType as PvpUnitType
    this.scene.spawnUnit(unit.id, type, side, unit.x, unit.y, unit.hp)

    const sync = () => {
      this.scene.updateUnit(unit.id, unit.x, unit.y, unit.hp, unit.maxHp)
    }

    const callbacks = this.getCallbacks<ClientUnitCallbacks>(unit)
    const unsubs = [
      callbacks.listen<number>('x', () => sync()),
      callbacks.listen<number>('y', () => sync()),
      callbacks.listen<number>('hp', () => sync()),
      callbacks.listen<number>('maxHp', () => sync()),
    ]
    this.unitUnsubs.set(unit.id, unsubs)

    sync()
  }

  private unbindUnit(unitId: string): void {
    const unsubs = this.unitUnsubs.get(unitId)
    if (unsubs) {
      for (const unsub of unsubs) unsub()
      this.unitUnsubs.delete(unitId)
    }
    this.scene.removeUnit(unitId)
  }

  private bindTower(tower: ClientTowerState): void {
    if (this.towerById.has(tower.id)) return

    const [col, row] = decodeSlotId(tower.slotId)
    const slotKey = `${col},${row}`
    this.scene.placeTower(slotKey, col, row, tower.towerType as TowerType, tower.hp, tower.id)

    const sync = () => this.scene.updateTower(slotKey, tower.hp, tower.maxHp)
    const callbacks = this.getCallbacks<ClientTowerCallbacks>(tower)
    const unsubs = [
      callbacks.listen<number>('hp', () => sync()),
      callbacks.listen<number>('maxHp', () => sync()),
    ]
    this.towerById.set(tower.id, { slotKey, unsubs })

    sync()
  }

  private unbindTower(towerId: string): void {
    const bound = this.towerById.get(towerId)
    if (!bound) return
    for (const unsub of bound.unsubs) unsub()
    this.scene.removeTower(bound.slotKey)
    this.towerById.delete(towerId)
  }

  private emitGoldForMe(): void {
    const state = this.state
    if (!state) return
    state.players.forEach((player, sessionId) => {
      if (sessionId === this.room.sessionId) this.emit.emit('pvp-gold', player.gold)
    })
  }

  private emitCastleHp(side: PlayerSide, hp: number, maxHp: number): void {
    this.scene.updateCastleHp(side, hp, maxHp)
    this.emit.emit('pvp-castle-hp', { side, hp, maxHp })
  }

  private emitTimer(timer: number): void {
    const wholeSeconds = Math.max(0, Math.ceil(timer))
    this.emit.emit('pvp-timer', wholeSeconds)
  }

  private emitPhase(phaseRaw: string): void {
    const phase: GamePhase = this.toPhase(phaseRaw)
    this.emit.emit('pvp-phase', phase)
  }

  private getCallbacks<T>(value: unknown): T {
    if (!this.callbacks) {
      throw new Error('State callbacks not initialized')
    }
    return this.callbacks(value) as T
  }

  private toPhase(phaseRaw: string): GamePhase {
    switch (phaseRaw) {
      case 'setup':
      case 'battle':
      case 'ended':
      case 'waiting':
        return phaseRaw
      default:
        return 'waiting'
    }
  }
}
