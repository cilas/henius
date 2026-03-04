import { Schema, type, ArraySchema } from '@colyseus/schema'
import { TowerState } from './TowerState'
import { STARTING_GOLD, CASTLE_HP } from '@kingdom-wars/shared'

export class PlayerState extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('boolean') ready: boolean = false
  @type('number') gold: number = STARTING_GOLD
  @type('number') castleHp: number = CASTLE_HP
  @type('string') side: string = 'left'   // 'left' | 'right'
  @type([TowerState]) towers = new ArraySchema<TowerState>()

  // Stats (updated during battle, shown on end screen)
  @type('number') unitsSent: number = 0
  @type('number') unitsKilled: number = 0
  @type('number') towersBuilt: number = 0
  @type('number') towersDestroyed: number = 0
  @type('number') damageDealt: number = 0
}
