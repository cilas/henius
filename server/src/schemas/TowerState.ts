import { Schema, type } from '@colyseus/schema'

export class TowerState extends Schema {
  @type('string') id: string = ''
  @type('number') slotId: number = 0
  @type('string') towerType: string = ''
  @type('number') hp: number = 0
  @type('number') maxHp: number = 0
}
