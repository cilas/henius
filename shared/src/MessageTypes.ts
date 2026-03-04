import type { TowerType, UnitType, GameOverReason } from './GameTypes'

// ── Client → Server messages ──────────────────────────────────────────────────

export interface PlaceTowerMessage {
  slotId: number
  towerType: TowerType
}

export interface SendUnitMessage {
  unitType: UnitType
  count: number
}

export interface JoinRoomMessage {
  playerName?: string
}

// ── Server → Client broadcasts ────────────────────────────────────────────────

export interface UnitDiedEvent {
  unitId: string
  killedBy: string  // unitId or towerId or 'castle'
  reward: number
}

export interface TowerDestroyedEvent {
  towerId: string
  destroyedBy: string  // unitId
  reward: number
}

export interface DamageDealtEvent {
  sourceId: string
  targetId: string
  damage: number
  remainingHp: number
}

export interface GameOverEvent {
  winnerId: string | null  // null = draw
  reason: GameOverReason
  stats: {
    [playerId: string]: {
      unitsSent: number
      unitsKilled: number
      towersBuilt: number
      towersDestroyed: number
      damageDealt: number
    }
  }
}

// Message type literals for room.send() / room.onMessage()
export type ClientMessageType = 'place_tower' | 'send_unit' | 'ready' | 'surrender'
export type ServerEventType = 'unit_died' | 'tower_destroyed' | 'damage_dealt' | 'game_over'
