import { Room, Client } from '@colyseus/core'
import { GameState } from '../schemas/GameState'
import { PlayerState } from '../schemas/PlayerState'
import { GameSimulation } from '../GameSimulation'
import {
  MAX_PLAYERS,
  SETUP_PHASE_DURATION_S,
  BATTLE_TIMEOUT_S,
  SERVER_TICK_RATE,
  STARTING_GOLD,
  CASTLE_HP,
} from '@kingdom-wars/shared'

interface RoomMetadata {
  roomCode: string
  hostName: string
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function generateSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

export class KingdomWarsRoom extends Room<{ state: GameState; metadata: RoomMetadata }> {
  maxClients = MAX_PLAYERS

  private simulation!: GameSimulation

  onCreate(options: { playerName?: string }) {
    const roomCode = generateRoomCode()

    this.setState(new GameState())
    this.state.seed = generateSeed()

    this.metadata = { roomCode, hostName: options.playerName ?? 'Player 1' }
    console.log(`[Room ${this.roomId}] created — code: ${roomCode}`)

    // Create simulation (state is ready; players join later)
    this.simulation = new GameSimulation(
      this.state,
      (type, data) => this.broadcast(type, data),
      (winnerId, reason) => this.endGame(winnerId, reason),
    )

    // ── Message handlers ────────────────────────────────────────────────────
    this.onMessage('ready', (client) => this.handleReady(client))

    this.onMessage('place_tower', (client, msg: { slotId: number; towerType: string }) => {
      if (this.state.phase !== 'setup' && this.state.phase !== 'battle') {
        client.send('error', { message: 'Cannot place tower now' })
        return
      }
      const err = this.simulation.handlePlaceTower(client.sessionId, msg.slotId, msg.towerType)
      if (err) client.send('error', { message: err })
    })

    this.onMessage('send_unit', (client, msg: { unitType: string }) => {
      const err = this.simulation.handleSendUnit(client.sessionId, msg.unitType)
      if (err) client.send('error', { message: err })
    })

    this.onMessage('surrender', (client) => {
      if (this.state.phase !== 'battle') return
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      // The other player wins
      let winnerId = ''
      this.state.players.forEach((_p, id) => { if (id !== client.sessionId) winnerId = id })
      this.endGame(winnerId, 'surrender')
    })
  }

  onJoin(client: Client, options: { playerName?: string; roomCode?: string }) {
    const side = this.clients.length === 1 ? 'left' : 'right'
    const name = options.playerName ?? `Player ${this.clients.length}`

    const player = new PlayerState()
    player.id       = client.sessionId
    player.name     = name
    player.side     = side
    player.gold     = STARTING_GOLD
    player.castleHp = CASTLE_HP

    this.state.players.set(client.sessionId, player)
    console.log(`[Room ${this.roomId}] ${name} joined as ${side} (${this.clients.length}/${this.maxClients})`)

    client.send('joined', {
      side,
      roomCode: this.metadata.roomCode,
      seed: this.state.seed,
    })
  }

  // Colyseus 0.17: onLeave receives WebSocket close code (number), not boolean
  onLeave(client: Client, code?: number) {
    const player = this.state.players.get(client.sessionId)
    const name = player?.name ?? client.sessionId
    console.log(`[Room ${this.roomId}] ${name} left (code: ${code})`)

    if (this.state.phase === 'battle') {
      console.log(`[Room ${this.roomId}] ${name} disconnected during battle — reconnection handled in T11`)
    }

    this.state.players.delete(client.sessionId)
  }

  onDispose() {
    console.log(`[Room ${this.roomId}] disposed`)
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private handleReady(client: Client) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return

    player.ready = true
    console.log(`[Room ${this.roomId}] ${player.name} is ready`)

    const allReady =
      this.state.phase === 'waiting' &&
      this.clients.length === MAX_PLAYERS &&
      [...this.state.players.values()].every(p => p.ready)

    if (allReady) {
      this.startSetupPhase()
    }
  }

  private startSetupPhase() {
    this.state.phase = 'setup'
    this.state.timer = SETUP_PHASE_DURATION_S

    console.log(`[Room ${this.roomId}] setup phase — ${SETUP_PHASE_DURATION_S}s`)
    this.broadcast('phase_changed', { phase: 'setup', timer: SETUP_PHASE_DURATION_S })

    const interval = this.clock.setInterval(() => {
      this.state.timer = Math.max(0, this.state.timer - SERVER_TICK_RATE / 1000)
      if (this.state.timer <= 0) {
        interval.clear()
        this.startBattlePhase()
      }
    }, SERVER_TICK_RATE)
  }

  private startBattlePhase() {
    this.state.phase = 'battle'
    this.state.timer = BATTLE_TIMEOUT_S

    console.log(`[Room ${this.roomId}] battle phase started`)
    this.broadcast('phase_changed', { phase: 'battle', timer: BATTLE_TIMEOUT_S })

    this.setSimulationInterval((deltaTime) => {
      if (this.state.phase !== 'battle') return

      this.state.tick++
      this.state.timer = Math.max(0, this.state.timer - deltaTime / 1000)

      this.simulation.update(deltaTime)

      if (this.state.timer <= 0) {
        this.endGame(this.resolveTimeoutWinner(), 'timeout')
      }
    }, SERVER_TICK_RATE)
  }

  private resolveTimeoutWinner(): string | null {
    let winnerId: string | null = null
    let maxHp = -1
    let tie = false

    this.state.players.forEach((player, id) => {
      if (player.castleHp > maxHp) {
        maxHp    = player.castleHp
        winnerId = id
        tie      = false
      } else if (player.castleHp === maxHp) {
        tie = true
      }
    })

    return tie ? null : winnerId
  }

  endGame(winnerId: string | null, reason: string) {
    if (this.state.phase === 'ended') return

    this.state.phase    = 'ended'
    this.state.winnerId = winnerId ?? ''

    console.log(`[Room ${this.roomId}] game over — winner: ${winnerId ?? 'draw'} (${reason})`)

    const stats: Record<string, object> = {}
    this.state.players.forEach((player, sessionId) => {
      stats[sessionId] = {
        unitsSent:       player.unitsSent,
        unitsKilled:     player.unitsKilled,
        towersBuilt:     player.towersBuilt,
        towersDestroyed: player.towersDestroyed,
        damageDealt:     player.damageDealt,
      }
    })

    this.broadcast('game_over', { winnerId, reason, stats })
    this.clock.setTimeout(() => this.disconnect(), 30_000)
  }
}
