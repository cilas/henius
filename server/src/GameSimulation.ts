import {
  UNIT_STATS, TOWER_STATS, CASTLE_DAMAGE_MULTIPLIER,
  UNIT_SEND_COOLDOWN_MS,
  PVP_WAYPOINTS_L2R, PVP_WAYPOINTS_R2L,
  PVP_SPAWN_LEFT, PVP_SPAWN_RIGHT,
  TILE_SIZE, encodeSlotId, decodeSlotId,
  type UnitType, type TowerType,
} from '@kingdom-wars/shared'
import { GameState } from './schemas/GameState'
import { PlayerState } from './schemas/PlayerState'
import { UnitState } from './schemas/UnitState'
import { TowerState } from './schemas/TowerState'
import type { MapSchema } from '@colyseus/schema'

// ── Simulation constants ───────────────────────────────────────────────────

const WAYPOINT_REACH_PX       = 24    // distance to consider a waypoint reached
const UNIT_UNIT_FIGHT_RANGE   = 48    // px — melee engagement radius
const UNIT_TOWER_ENGAGE_RANGE = 80    // px — unit stops to attack a tower
const UNIT_ATTACK_INTERVAL_MS = 1000  // ms per unit attack

// ── Internal types ─────────────────────────────────────────────────────────

interface TowerSim {
  state:   TowerState
  ownerId: string
  side:    string
  x:       number
  y:       number
}

// ── GameSimulation ─────────────────────────────────────────────────────────

export class GameSimulation {
  private readonly state: GameState
  private readonly broadcast: (type: string, data: unknown) => void
  private readonly onGameOver: (winnerId: string | null, reason: string) => void

  // Internal cooldown/target tracking (not schema-synced)
  private readonly unitAttackCooldowns = new Map<string, number>()
  private readonly towerAttackCooldowns = new Map<string, number>()
  private readonly unitFightTargets     = new Map<string, string>()   // unitId → enemy unitId
  private readonly unitTowerTargets     = new Map<string, string>()   // unitId → towerId
  private readonly lastUnitSendMs       = new Map<string, number>()   // sessionId → timestamp

  private unitIdCounter  = 0
  private towerIdCounter = 0

  constructor(
    state:     GameState,
    broadcast: (type: string, data: unknown) => void,
    onGameOver: (winnerId: string | null, reason: string) => void,
  ) {
    this.state     = state
    this.broadcast = broadcast
    this.onGameOver = onGameOver
  }

  // ── Message handlers ───────────────────────────────────────────────────────

  handleSendUnit(sessionId: string, unitType: string): string | null {
    if (this.state.phase !== 'battle') return 'Battle not active'

    const stats = UNIT_STATS[unitType as UnitType]
    if (!stats) return `Unknown unit type: ${unitType}`

    const player = this.state.players.get(sessionId)
    if (!player) return 'Player not found'
    if (player.gold < stats.cost) return `Not enough gold (need ${stats.cost})`

    const now = Date.now()
    const lastSend = this.lastUnitSendMs.get(sessionId) ?? 0
    if (now - lastSend < UNIT_SEND_COOLDOWN_MS) return 'Send cooldown active'

    // Deduct gold
    player.gold -= stats.cost
    player.unitsSent++
    this.lastUnitSendMs.set(sessionId, now)

    // Create unit
    const spawn = player.side === 'left' ? PVP_SPAWN_LEFT : PVP_SPAWN_RIGHT
    const unit = new UnitState()
    unit.id            = `u-${++this.unitIdCounter}`
    unit.ownerId       = sessionId
    unit.unitType      = unitType
    unit.x             = spawn.x
    unit.y             = spawn.y
    unit.hp            = stats.hp
    unit.maxHp         = stats.hp
    unit.waypointIndex = 0
    unit.status        = 'moving'

    this.state.units.push(unit)
    return null
  }

  handlePlaceTower(sessionId: string, slotId: number, towerType: string): string | null {
    const stats = TOWER_STATS[towerType as TowerType]
    if (!stats) return `Unknown tower type: ${towerType}`

    const player = this.state.players.get(sessionId)
    if (!player) return 'Player not found'

    const [col, row] = decodeSlotId(slotId)

    // Validate slot is on the player's side
    const isLeft = player.side === 'left'
    if (isLeft && col > 19)  return 'Slot not in your kingdom'
    if (!isLeft && col < 20) return 'Slot not in your kingdom'
    if (col < 0 || col >= 40 || row < 0 || row >= 12) return 'Invalid slot'

    // Check for duplicate tower on same slot
    for (let i = 0; i < player.towers.length; i++) {
      if (player.towers[i].slotId === slotId) return 'Slot already occupied'
    }

    if (player.gold < stats.cost) return `Not enough gold (need ${stats.cost})`

    // Deduct gold
    player.gold -= stats.cost
    player.towersBuilt++

    // Create tower
    const tower = new TowerState()
    tower.id        = `t-${++this.towerIdCounter}`
    tower.slotId    = slotId
    tower.towerType = towerType
    tower.hp        = stats.hp
    tower.maxHp     = stats.hp
    player.towers.push(tower)

    return null
  }

  // ── Main simulation tick ───────────────────────────────────────────────────

  update(deltaMs: number): void {
    if (this.state.phase !== 'battle') return

    // Build a flat tower list with world positions (used for proximity checks)
    const towers = this.collectTowers()

    // Snapshot living units (indices change when we splice dead ones)
    const living: UnitState[] = []
    for (let i = 0; i < this.state.units.length; i++) {
      if (this.state.units[i].status !== 'dead') living.push(this.state.units[i])
    }

    // ── Phase 1: Update each living unit ──────────────────────────────────
    for (const unit of living) {
      if (unit.status === 'dead') continue
      this.tickUnit(unit, living, towers, deltaMs)
    }

    // ── Phase 2: Tower attacks ─────────────────────────────────────────────
    for (const tower of towers) {
      this.tickTowerAttack(tower, living, deltaMs)
    }

    // ── Phase 3: Remove dead entities ─────────────────────────────────────
    this.removeDeadUnits()
    this.removeDeadTowers()
  }

  // ── Unit tick ─────────────────────────────────────────────────────────────

  private tickUnit(
    unit:   UnitState,
    living: UnitState[],
    towers: TowerSim[],
    delta:  number,
  ): void {
    const unitSide   = this.getSide(unit.ownerId)
    const unitStats  = UNIT_STATS[unit.unitType as UnitType]
    if (!unitStats) return

    // Resolve existing fight/tower-attack target
    const fightTarget     = this.resolveUnitTarget(unit, living)
    const towerAttTarget  = this.resolveTowerTarget(unit, towers)

    if (fightTarget) {
      // Attack enemy unit
      this.tickMelee(unit, fightTarget, unitStats.damage, delta)
      return   // don't move while fighting
    }

    if (towerAttTarget) {
      // Attack enemy tower
      this.tickUnitOnTower(unit, towerAttTarget, unitStats.damage, delta)
      return   // don't move while attacking tower
    }

    // Find new engagement targets
    const nearEnemy = this.nearestEnemyUnit(unit, living, unitSide, UNIT_UNIT_FIGHT_RANGE)
    if (nearEnemy) {
      this.unitFightTargets.set(unit.id, nearEnemy.id)
      this.tickMelee(unit, nearEnemy, unitStats.damage, delta)
      return
    }

    const nearTower = this.nearestEnemyTower(unit, towers, unitSide, UNIT_TOWER_ENGAGE_RANGE)
    if (nearTower) {
      this.unitTowerTargets.set(unit.id, nearTower.state.id)
      this.tickUnitOnTower(unit, nearTower, unitStats.damage, delta)
      return
    }

    // Move toward next waypoint
    const waypoints = unitSide === 'left' ? PVP_WAYPOINTS_L2R : PVP_WAYPOINTS_R2L
    const wp = waypoints[unit.waypointIndex]

    if (!wp) {
      // Reached enemy castle
      this.arrivedAtCastle(unit, unitStats)
      return
    }

    const dx = wp.x - unit.x
    const dy = wp.y - unit.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < WAYPOINT_REACH_PX) {
      unit.waypointIndex++
    } else {
      const step = unitStats.speed * delta / 1000
      unit.x += (dx / dist) * step
      unit.y += (dy / dist) * step
    }
  }

  // ── Melee between two units ────────────────────────────────────────────────

  private tickMelee(attacker: UnitState, defender: UnitState, damage: number, delta: number): void {
    let cd = this.unitAttackCooldowns.get(attacker.id) ?? 0
    cd -= delta
    if (cd <= 0) {
      cd = UNIT_ATTACK_INTERVAL_MS
      this.dealDamageToUnit(defender, damage, attacker.id, attacker.ownerId)
    }
    this.unitAttackCooldowns.set(attacker.id, cd)
  }

  // ── Unit attacks tower ─────────────────────────────────────────────────────

  private tickUnitOnTower(unit: UnitState, tower: TowerSim, damage: number, delta: number): void {
    let cd = this.unitAttackCooldowns.get(unit.id) ?? 0
    cd -= delta
    if (cd <= 0) {
      cd = UNIT_ATTACK_INTERVAL_MS
      this.dealDamageToTower(tower, damage, unit.id, unit.ownerId)
    }
    this.unitAttackCooldowns.set(unit.id, cd)
  }

  // ── Tower attacks nearby units ─────────────────────────────────────────────

  private tickTowerAttack(tower: TowerSim, living: UnitState[], delta: number): void {
    if (tower.state.hp <= 0) return
    const towerStats = TOWER_STATS[tower.state.towerType as TowerType]
    if (!towerStats) return

    const target = this.nearestEnemyUnit(
      { x: tower.x, y: tower.y, ownerId: tower.ownerId },
      living,
      tower.side,
      towerStats.range,
    )
    if (!target) return

    let cd = this.towerAttackCooldowns.get(tower.state.id) ?? 0
    cd -= delta
    if (cd <= 0) {
      cd = 1000 / towerStats.fireRate
      this.dealDamageToUnit(target, towerStats.damage, tower.state.id, tower.ownerId)
    }
    this.towerAttackCooldowns.set(tower.state.id, cd)
  }

  // ── Castle arrival ─────────────────────────────────────────────────────────

  private arrivedAtCastle(unit: UnitState, unitStats: typeof UNIT_STATS[UnitType]): void {
    const attackerSide = this.getSide(unit.ownerId)
    const defenderSide = attackerSide === 'left' ? 'right' : 'left'
    const damage = Math.max(1, Math.floor(unit.hp * CASTLE_DAMAGE_MULTIPLIER))

    let defenderPlayer: PlayerState | undefined
    let defenderSessionId = ''
    this.state.players.forEach((p, id) => {
      if (p.side === defenderSide) { defenderPlayer = p; defenderSessionId = id }
    })

    // Update attacker stats
    const attackerPlayer = this.state.players.get(unit.ownerId)
    if (attackerPlayer) attackerPlayer.damageDealt += damage

    if (defenderPlayer) {
      defenderPlayer.castleHp = Math.max(0, defenderPlayer.castleHp - damage)
      this.broadcast('castle_damaged', {
        side: defenderSide,
        damage,
        remaining: defenderPlayer.castleHp,
      })

      if (defenderPlayer.castleHp <= 0) {
        this.onGameOver(unit.ownerId, 'castle_destroyed')
      }
    }

    unit.status = 'dead'
    this.broadcast('unit_died', { unitId: unit.id, killedBy: 'castle', reward: 0 })
    void unitStats   // stats already used above
    void defenderSessionId
  }

  // ── Damage helpers ─────────────────────────────────────────────────────────

  private dealDamageToUnit(
    unit:           UnitState,
    damage:         number,
    sourceId:       string,
    rewardToPlayer: string,
  ): void {
    if (unit.status === 'dead') return
    unit.hp = Math.max(0, unit.hp - damage)

    const attackerPlayer = this.state.players.get(rewardToPlayer)
    if (attackerPlayer) attackerPlayer.damageDealt += damage

    if (unit.hp <= 0) {
      unit.status = 'dead'
      const reward = UNIT_STATS[unit.unitType as UnitType]?.reward ?? 0
      if (attackerPlayer) {
        attackerPlayer.gold      += reward
        attackerPlayer.unitsKilled++
      }
      this.broadcast('unit_died', { unitId: unit.id, killedBy: sourceId, reward })
    }
  }

  private dealDamageToTower(
    tower:          TowerSim,
    damage:         number,
    sourceId:       string,
    rewardToPlayer: string,
  ): void {
    if (tower.state.hp <= 0) return
    tower.state.hp = Math.max(0, tower.state.hp - damage)

    const attackerPlayer = this.state.players.get(rewardToPlayer)
    if (attackerPlayer) attackerPlayer.damageDealt += damage

    if (tower.state.hp <= 0) {
      const reward = TOWER_STATS[tower.state.towerType as TowerType]?.reward ?? 0
      if (attackerPlayer) {
        attackerPlayer.gold           += reward
        attackerPlayer.towersDestroyed++
      }
      const ownerPlayer = this.state.players.get(tower.ownerId)
      if (ownerPlayer) ownerPlayer.towersDestroyed++
      this.broadcast('tower_destroyed', {
        towerId: tower.state.id,
        destroyedBy: sourceId,
        reward,
      })
    }
  }

  // ── Target resolution helpers ──────────────────────────────────────────────

  /** Return existing fight target if still alive, clear otherwise */
  private resolveUnitTarget(unit: UnitState, living: UnitState[]): UnitState | null {
    const tid = this.unitFightTargets.get(unit.id)
    if (!tid) return null
    const target = living.find(u => u.id === tid && u.status !== 'dead')
    if (!target) { this.unitFightTargets.delete(unit.id); return null }
    const d = this.dist(unit, target)
    if (d > UNIT_UNIT_FIGHT_RANGE * 2) { this.unitFightTargets.delete(unit.id); return null }
    return target
  }

  /** Return existing tower attack target if still alive, clear otherwise */
  private resolveTowerTarget(unit: UnitState, towers: TowerSim[]): TowerSim | null {
    const tid = this.unitTowerTargets.get(unit.id)
    if (!tid) return null
    const tower = towers.find(t => t.state.id === tid && t.state.hp > 0)
    if (!tower) { this.unitTowerTargets.delete(unit.id); return null }
    return tower
  }

  // ── Proximity helpers ──────────────────────────────────────────────────────

  private nearestEnemyUnit(
    source:  { x: number; y: number; ownerId: string },
    living:  UnitState[],
    side:    string,
    maxDist: number,
  ): UnitState | null {
    let best: UnitState | null = null
    let bestDist = maxDist
    for (const u of living) {
      if (u.status === 'dead') continue
      if (this.getSide(u.ownerId) === side) continue   // same side
      const d = this.dist(source, u)
      if (d < bestDist) { bestDist = d; best = u }
    }
    return best
  }

  private nearestEnemyTower(
    unit:    UnitState,
    towers:  TowerSim[],
    side:    string,
    maxDist: number,
  ): TowerSim | null {
    let best: TowerSim | null = null
    let bestDist = maxDist
    for (const t of towers) {
      if (t.state.hp <= 0) continue
      if (t.side === side) continue   // same side
      const d = this.dist(unit, t)
      if (d < bestDist) { bestDist = d; best = t }
    }
    return best
  }

  private dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x, dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  private removeDeadUnits(): void {
    for (let i = this.state.units.length - 1; i >= 0; i--) {
      if (this.state.units[i].status === 'dead') {
        const id = this.state.units[i].id
        this.unitAttackCooldowns.delete(id)
        this.unitFightTargets.delete(id)
        this.unitTowerTargets.delete(id)
        this.state.units.splice(i, 1)
      }
    }
  }

  private removeDeadTowers(): void {
    this.state.players.forEach(player => {
      for (let i = player.towers.length - 1; i >= 0; i--) {
        if (player.towers[i].hp <= 0) {
          this.towerAttackCooldowns.delete(player.towers[i].id)
          player.towers.splice(i, 1)
        }
      }
    })
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  private collectTowers(): TowerSim[] {
    const list: TowerSim[] = []
    this.state.players.forEach((player, sessionId) => {
      for (let i = 0; i < player.towers.length; i++) {
        const tower = player.towers[i]
        const [col, row] = decodeSlotId(tower.slotId)
        list.push({
          state:   tower,
          ownerId: sessionId,
          side:    player.side,
          x:       col * TILE_SIZE + TILE_SIZE / 2,
          y:       row * TILE_SIZE + TILE_SIZE / 2,
        })
      }
    })
    return list
  }

  private getSide(sessionId: string): string {
    return this.state.players.get(sessionId)?.side ?? 'left'
  }
}
