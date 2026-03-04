export type TowerType = 'archer' | 'warrior' | 'lancer' | 'monk'

export interface TowerConfig {
  type: TowerType
  label: string
  cost: number
  range: number
  damage: number
  fireRate: number  // attacks per second
  healRate: number  // HP healed per second (monk only)
  special: string
  hotkey: string
  spriteKey: string
  attackAnim: string
  idleAnim: string
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  archer: {
    type: 'archer',
    label: 'Archer',
    cost: 60,
    range: 176,
    damage: 14,
    fireRate: 1.1,
    healRate: 0,
    special: 'arrow',
    hotkey: '1',
    spriteKey: 'archer-idle',
    attackAnim: 'archer-shoot',
    idleAnim: 'archer-idle',
  },
  warrior: {
    type: 'warrior',
    label: 'Warrior',
    cost: 90,
    range: 80,
    damage: 33,
    fireRate: 0.65,
    healRate: 0,
    special: 'splash',
    hotkey: '2',
    spriteKey: 'warrior-idle',
    attackAnim: 'warrior-attack',
    idleAnim: 'warrior-idle',
  },
  lancer: {
    type: 'lancer',
    label: 'Lancer',
    cost: 120,
    range: 120,
    damage: 26,
    fireRate: 0.85,
    healRate: 0,
    special: 'pierce',
    hotkey: '3',
    spriteKey: 'lancer-idle',
    attackAnim: 'lancer-attack',
    idleAnim: 'lancer-idle',
  },
  monk: {
    type: 'monk',
    label: 'Monk',
    cost: 100,
    range: 144,
    damage: 0,
    fireRate: 0,
    healRate: 4,
    special: 'heal',
    hotkey: '4',
    spriteKey: 'monk-idle',
    attackAnim: 'monk-heal',
    idleAnim: 'monk-idle',
  },
}
