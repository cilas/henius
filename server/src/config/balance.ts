/**
 * Server-side balance constants (T12).
 *
 * Canonical gameplay numbers live in @kingdom-wars/shared to keep
 * client/server deterministic. This file documents the selected values
 * and the intended match profile used for manual balance validation.
 */
export {
  STARTING_GOLD,
  CASTLE_HP,
  PASSIVE_INCOME_AMOUNT,
  PASSIVE_INCOME_INTERVAL_S,
  UNIT_SEND_COOLDOWN_MS,
  MAX_ACTIONS_PER_SECOND,
  SETUP_PHASE_DURATION_S,
  BATTLE_TIMEOUT_S,
  UNIT_STATS,
  TOWER_STATS,
  CASTLE_DAMAGE_MULTIPLIER,
} from '@kingdom-wars/shared'

/**
 * Target profile used while polishing PvP:
 * - average match length: 5-10 minutes
 * - passive income should keep both sides active (anti-turtle)
 * - early units are viable but not enough to end match alone
 */
export const PVP_BALANCE_PROFILE = {
  targetMatchDurationMin: 5,
  targetMatchDurationMax: 10,
  antiTurtlePriority: true,
  notes: [
    'passive income every 10s keeps unit pressure stable',
    'castle damage multiplier rewards lane breakthrough',
    'tower rewards prevent full-defense runaway leads',
  ],
} as const
