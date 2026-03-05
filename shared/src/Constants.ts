// Map
export const TILE_SIZE = 64

// PvP map — waypoints and spawn positions (world px, shared with server)
const wp = (col: number, row: number) => ({
  x: col * TILE_SIZE + TILE_SIZE / 2,
  y: row * TILE_SIZE + TILE_SIZE / 2,
})

export const PVP_SPAWN_LEFT  = wp(1,  5)  // left castle  { x:   96, y: 352 }
export const PVP_SPAWN_RIGHT = wp(38, 5)  // right castle { x: 2464, y: 352 }

/** Left units march left→right, destination = right castle */
export const PVP_WAYPOINTS_L2R = [
  wp(3,5), wp(3,2), wp(9,2), wp(9,9), wp(15,9), wp(15,3),
  wp(24,3), wp(24,9), wp(30,9), wp(30,2), wp(36,2), wp(36,5), wp(38,5),
]

/** Right units march right→left, destination = left castle */
export const PVP_WAYPOINTS_R2L = [
  wp(36,5), wp(36,2), wp(30,2), wp(30,9), wp(24,9), wp(24,3),
  wp(15,3), wp(15,9), wp(9,9), wp(9,2), wp(3,2), wp(3,5), wp(1,5),
]

/** Encode a grid slot as a single integer (col*100+row) */
export function encodeSlotId(col: number, row: number): number { return col * 100 + row }
/** Decode an encoded slotId back to [col, row] */
export function decodeSlotId(id: number): [number, number] { return [Math.floor(id / 100), id % 100] }

// Server
export const SERVER_PORT = 2567
export const SERVER_TICK_RATE = 100 // ms between server ticks (10 Hz)

// Room
export const MAX_PLAYERS = 2
export const RECONNECT_TIMEOUT_S = 30
export const SETUP_PHASE_DURATION_S = 30
export const BATTLE_TIMEOUT_S = 600 // 10 minutes

// Economy
export const STARTING_GOLD = 200
export const PASSIVE_INCOME_AMOUNT = 5
export const PASSIVE_INCOME_INTERVAL_S = 10

// Castle
export const CASTLE_HP = 500

// Unit stats: [cost, hp, damage, speed (px/s), reward]
export const UNIT_STATS = {
  pawn:    { cost: 30,  hp: 60,  damage: 8,  speed: 70, reward: 15 },
  warrior: { cost: 60,  hp: 150, damage: 20, speed: 50, reward: 30 },
  lancer:  { cost: 80,  hp: 100, damage: 30, speed: 90, reward: 40 },
  monk:    { cost: 70,  hp: 80,  damage: 5,  speed: 55, reward: 35 },
} as const

// Tower stats: [cost, hp, range, damage, fireRate, reward]
export const TOWER_STATS = {
  archer:  { cost: 80,  hp: 200, range: 176, damage: 14, fireRate: 1.1,  reward: 40  },
  warrior: { cost: 120, hp: 350, range: 80,  damage: 33, fireRate: 0.65, reward: 60  },
  lancer:  { cost: 150, hp: 280, range: 120, damage: 26, fireRate: 0.85, reward: 75  },
  monk:    { cost: 130, hp: 220, range: 144, damage: 4,  fireRate: 1.0,  reward: 65  },
} as const

// Unit vs castle damage multiplier
export const CASTLE_DAMAGE_MULTIPLIER = 0.5

// Unit cooldown between sends (ms)
export const UNIT_SEND_COOLDOWN_MS = 500

// Rate limiting
export const MAX_ACTIONS_PER_SECOND = 10
