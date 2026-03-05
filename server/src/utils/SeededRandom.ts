/**
 * Deterministic PRNG using the Park-Miller LCG algorithm.
 * Produces the same sequence for the same seed across clients and server.
 */
export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    // Ensure non-zero seed (LCG requirement)
    this.seed = ((seed % 2147483647) + 2147483647) % 2147483647 || 1
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647
    return (this.seed - 1) / 2147483646
  }

  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /** Returns a float in [min, max) */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min
  }
}
