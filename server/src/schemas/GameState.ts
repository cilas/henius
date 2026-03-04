import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema'
import { PlayerState } from './PlayerState'
import { UnitState } from './UnitState'

export class GameState extends Schema {
  // 'waiting' | 'setup' | 'battle' | 'ended'
  @type('string') phase: string = 'waiting'
  @type('number') tick: number = 0
  @type('number') seed: number = 0

  // Seconds remaining in current phase (setup countdown or battle timer)
  @type('number') timer: number = 0

  // Winner sessionId, or empty string if no winner yet / draw
  @type('string') winnerId: string = ''

  @type({ map: PlayerState }) players = new MapSchema<PlayerState>()
  @type([UnitState]) units = new ArraySchema<UnitState>()
}
