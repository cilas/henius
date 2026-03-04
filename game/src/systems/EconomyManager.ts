import { STARTING_GOLD, STARTING_LIVES } from '../config/map.ts'

export class EconomyManager {
  gold: number
  lives: number
  private onGoldChange: (gold: number) => void
  private onLivesChange: (lives: number) => void

  constructor(
    onGoldChange: (gold: number) => void,
    onLivesChange: (lives: number) => void,
  ) {
    this.gold = STARTING_GOLD
    this.lives = STARTING_LIVES
    this.onGoldChange = onGoldChange
    this.onLivesChange = onLivesChange
  }

  addGold(amount: number): void {
    this.gold += amount
    this.onGoldChange(this.gold)
  }

  spendGold(amount: number): boolean {
    if (this.gold < amount) return false
    this.gold -= amount
    this.onGoldChange(this.gold)
    return true
  }

  canAfford(amount: number): boolean {
    return this.gold >= amount
  }

  loseLife(count = 1): boolean {
    this.lives = Math.max(0, this.lives - count)
    this.onLivesChange(this.lives)
    return this.lives <= 0
  }

  isGameOver(): boolean {
    return this.lives <= 0
  }
}
