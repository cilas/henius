import { UNIT_STATS } from '@kingdom-wars/shared'

export type PvpUnitType = 'pawn' | 'warrior' | 'lancer' | 'monk'

export interface PvpUnitConfig {
  type: PvpUnitType
  cost: number
  hp: number
  damage: number
  speed: number
  reward: number
  /** Base animation key — renderer prepends 'blue-' or 'red-' as needed */
  animKey: string
  frameWidth: number
  frameHeight: number
  scale: number
}

export const PVP_UNIT_CONFIGS: Record<PvpUnitType, PvpUnitConfig> = {
  pawn: {
    type: 'pawn',
    ...UNIT_STATS.pawn,
    animKey: 'archer',
    frameWidth: 192,
    frameHeight: 192,
    scale: 0.5,
  },
  warrior: {
    type: 'warrior',
    ...UNIT_STATS.warrior,
    animKey: 'warrior',
    frameWidth: 192,
    frameHeight: 192,
    scale: 0.5,
  },
  lancer: {
    type: 'lancer',
    ...UNIT_STATS.lancer,
    animKey: 'lancer',
    frameWidth: 320,
    frameHeight: 320,
    scale: 0.35,
  },
  monk: {
    type: 'monk',
    ...UNIT_STATS.monk,
    animKey: 'monk',
    frameWidth: 192,
    frameHeight: 192,
    scale: 0.5,
  },
}

/** Ordered list for UI display */
export const PVP_UNIT_ORDER: PvpUnitType[] = ['pawn', 'warrior', 'lancer', 'monk']
