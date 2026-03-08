export type EnemyType = 'pawn' | 'warrior' | 'lancer'

export interface EnemyConfig {
  type: EnemyType
  hp: number
  speed: number
  reward: number
  attackDamage: number   // damage dealt to towers per hit
  attackRate: number     // attacks per second against towers
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
    attackDamage: 15,
    attackRate: 1.2,
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
    attackDamage: 38,
    attackRate: 0.8,
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
    attackDamage: 70,
    attackRate: 0.5,
    frameWidth: 320,
    frameHeight: 320,
    scale: 0.35,
    runAnim: 'red-lancer-run',
    idleAnim: 'red-lancer-idle',
  },
}
