import type { EnemyType } from './enemies.ts'

export interface WaveEnemy {
  type: EnemyType
  count: number
  spawnDelay: number  // ms between spawns
}

export interface WaveConfig {
  wave: number
  enemies: WaveEnemy[]
}

export const TOTAL_WAVES = 10
export const BETWEEN_WAVE_DELAY = 12000  // ms

export const WAVES: WaveConfig[] = [
  {
    wave: 1,
    enemies: [{ type: 'pawn', count: 12, spawnDelay: 900 }],
  },
  {
    wave: 2,
    enemies: [{ type: 'pawn', count: 18, spawnDelay: 700 }],
  },
  {
    wave: 3,
    enemies: [
      { type: 'pawn', count: 15, spawnDelay: 700 },
      { type: 'warrior', count: 5, spawnDelay: 1400 },
    ],
  },
  {
    wave: 4,
    enemies: [
      { type: 'pawn', count: 20, spawnDelay: 600 },
      { type: 'warrior', count: 8, spawnDelay: 1200 },
    ],
  },
  {
    wave: 5,
    enemies: [
      { type: 'pawn', count: 18, spawnDelay: 500 },
      { type: 'warrior', count: 10, spawnDelay: 1000 },
      { type: 'lancer', count: 3, spawnDelay: 2000 },
    ],
  },
  {
    wave: 6,
    enemies: [
      { type: 'pawn', count: 22, spawnDelay: 450 },
      { type: 'warrior', count: 12, spawnDelay: 900 },
      { type: 'lancer', count: 5, spawnDelay: 1800 },
    ],
  },
  {
    wave: 7,
    enemies: [
      { type: 'pawn', count: 15, spawnDelay: 400 },
      { type: 'warrior', count: 15, spawnDelay: 800 },
      { type: 'lancer', count: 7, spawnDelay: 1500 },
    ],
  },
  {
    wave: 8,
    enemies: [
      { type: 'pawn', count: 20, spawnDelay: 350 },
      { type: 'warrior', count: 18, spawnDelay: 700 },
      { type: 'lancer', count: 10, spawnDelay: 1400 },
    ],
  },
  {
    wave: 9,
    enemies: [
      { type: 'pawn', count: 30, spawnDelay: 300 },
      { type: 'warrior', count: 20, spawnDelay: 600 },
      { type: 'lancer', count: 12, spawnDelay: 1200 },
    ],
  },
  {
    wave: 10,
    enemies: [
      { type: 'pawn', count: 40, spawnDelay: 250 },
      { type: 'warrior', count: 25, spawnDelay: 500 },
      { type: 'lancer', count: 15, spawnDelay: 1000 },
    ],
  },
]
