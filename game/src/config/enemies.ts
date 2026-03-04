export type EnemyType = 'pawn' | 'warrior' | 'lancer'

export interface EnemyConfig {
  type: EnemyType
  hp: number
  speed: number
  reward: number
  frameWidth: number
  frameHeight: number
  scale: number
  runAnim: string
  idleAnim: string
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  pawn: {
    type: 'pawn',
    hp: 80,
    speed: 70,
    reward: 10,
    frameWidth: 192,
    frameHeight: 192,
    scale: 0.5,
    runAnim: 'pawn-run',
    idleAnim: 'pawn-idle',
  },
  warrior: {
    type: 'warrior',
    hp: 200,
    speed: 50,
    reward: 20,
    frameWidth: 192,
    frameHeight: 192,
    scale: 0.5,
    runAnim: 'red-warrior-run',
    idleAnim: 'red-warrior-idle',
  },
  lancer: {
    type: 'lancer',
    hp: 420,
    speed: 35,
    reward: 40,
    frameWidth: 320,
    frameHeight: 320,
    scale: 0.35,
    runAnim: 'red-lancer-run',
    idleAnim: 'red-lancer-idle',
  },
}
