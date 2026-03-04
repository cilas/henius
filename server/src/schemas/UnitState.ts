import { Schema, type } from '@colyseus/schema'

export class UnitState extends Schema {
  @type('string') id: string = ''
  @type('string') ownerId: string = ''
  @type('string') unitType: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') hp: number = 0
  @type('number') maxHp: number = 0
  @type('number') waypointIndex: number = 0
  // 'moving' | 'fighting' | 'dead'
  @type('string') status: string = 'moving'
}
