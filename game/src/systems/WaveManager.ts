import type Phaser from 'phaser'
import { Enemy } from '../entities/Enemy.ts'
import type { AttackTarget } from '../entities/Enemy.ts'
import { WAVES, TOTAL_WAVES, BETWEEN_WAVE_DELAY } from '../config/waves.ts'
import type { EnemyType } from '../config/enemies.ts'

type WaveState = 'idle' | 'spawning' | 'active' | 'between' | 'victory'

interface SpawnEntry {
  type: EnemyType
  delay: number  // ms to wait before spawning this enemy
  elapsed: number
}

export class WaveManager {
  private scene: Phaser.Scene
  currentWave: number  // 1-indexed, 0 = not started
  state: WaveState
  enemies: Enemy[]
  betweenTimer: number  // ms remaining between waves

  private spawnQueue: SpawnEntry[]
  private onEnemyKilled: (reward: number) => void
  private onEnemyReachedCastle: () => boolean
  private onWaveStart: (wave: number) => void
  private onWaveComplete: (wave: number) => void
  private onVictory: () => void

  constructor(
    scene: Phaser.Scene,
    onEnemyKilled: (reward: number) => void,
    onEnemyReachedCastle: () => boolean,
    onWaveStart: (wave: number) => void,
    onWaveComplete: (wave: number) => void,
    onVictory: () => void,
  ) {
    this.scene = scene
    this.currentWave = 0
    this.state = 'idle'
    this.enemies = []
    this.spawnQueue = []
    this.betweenTimer = 0
    this.onEnemyKilled = onEnemyKilled
    this.onEnemyReachedCastle = onEnemyReachedCastle
    this.onWaveStart = onWaveStart
    this.onWaveComplete = onWaveComplete
    this.onVictory = onVictory
  }

  startFirstWave(initialDelay = 3000): void {
    this.state = 'between'
    this.betweenTimer = initialDelay
  }

  skipWait(): void {
    if (this.state === 'between') {
      this.betweenTimer = 0
    }
  }

  update(delta: number, towers: AttackTarget[] = []): void {
    if (this.state === 'between') {
      this.betweenTimer -= delta
      if (this.betweenTimer <= 0) {
        this.launchNextWave()
      }
      return
    }

    if (this.state === 'spawning') {
      this.updateSpawnQueue(delta)
    }

    if (this.state === 'spawning' || this.state === 'active') {
      this.updateEnemies(delta, towers)
      if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
        this.onWaveComplete(this.currentWave)
        if (this.currentWave >= TOTAL_WAVES) {
          this.state = 'victory'
          this.onVictory()
        } else {
          this.state = 'between'
          this.betweenTimer = BETWEEN_WAVE_DELAY
        }
      }
    }
  }

  private launchNextWave(): void {
    this.currentWave++
    const waveConfig = WAVES[this.currentWave - 1]
    if (!waveConfig) return

    this.state = 'spawning'
    this.buildSpawnQueue(waveConfig.enemies)
    this.onWaveStart(this.currentWave)
  }

  private buildSpawnQueue(
    groups: Array<{ type: EnemyType; count: number; spawnDelay: number }>,
  ): void {
    this.spawnQueue = []
    let time = 0
    for (const group of groups) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({ type: group.type, delay: time, elapsed: 0 })
        time += group.spawnDelay
      }
    }
    // Sort by delay so we process in order
    this.spawnQueue.sort((a, b) => a.delay - b.delay)
  }

  private updateSpawnQueue(delta: number): void {
    const toSpawn: SpawnEntry[] = []
    const remaining: SpawnEntry[] = []

    for (const entry of this.spawnQueue) {
      entry.elapsed += delta
      if (entry.elapsed >= entry.delay) {
        toSpawn.push(entry)
      } else {
        remaining.push(entry)
      }
    }

    this.spawnQueue = remaining

    for (const entry of toSpawn) {
      this.spawnEnemy(entry.type)
    }

    if (this.spawnQueue.length === 0) {
      this.state = 'active'
    }
  }

  private spawnEnemy(type: EnemyType): void {
    const enemy = new Enemy(this.scene, type)
    this.enemies.push(enemy)
  }

  private updateEnemies(delta: number, towers: AttackTarget[]): void {
    const dead: Enemy[] = []
    const reachedCastle: Enemy[] = []

    for (const enemy of this.enemies) {
      if (enemy.isDead || !enemy.active) {
        dead.push(enemy)
        continue
      }

      const reachedEnd = enemy.update(delta, towers)
      if (reachedEnd) {
        reachedCastle.push(enemy)
      }
    }

    // Handle castle reached
    for (const enemy of reachedCastle) {
      const gameOver = this.onEnemyReachedCastle()
      enemy.destroyWithBar()
      this.enemies = this.enemies.filter(e => e !== enemy)
      if (gameOver) {
        this.state = 'idle'
        return
      }
    }

    // Clean up dead enemies (killed by towers)
    for (const enemy of dead) {
      if (!reachedCastle.includes(enemy)) {
        this.onEnemyKilled(enemy.reward)
      }
      this.enemies = this.enemies.filter(e => e !== enemy)
    }
  }
}
