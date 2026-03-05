/**
 * Server-side balance constants.
 * Most values live in @kingdom-wars/shared (shared with client).
 * This file re-exports them for convenient import within server code
 * and adds any server-only overrides.
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
