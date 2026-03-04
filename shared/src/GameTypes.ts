// Tower types (same as single-player)
export type TowerType = 'archer' | 'warrior' | 'lancer' | 'monk'

// Unit types for PvP offensive units (based on Red/Blue Units sprites)
export type UnitType = 'pawn' | 'warrior' | 'lancer' | 'monk'

// Which side of the map a player controls
export type PlayerSide = 'left' | 'right'

// Game phase lifecycle
export type GamePhase = 'waiting' | 'setup' | 'battle' | 'ended'

// Reason a game ended
export type GameOverReason = 'castle_destroyed' | 'timeout' | 'surrender' | 'forfeit'
