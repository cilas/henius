import { Client, Room } from 'colyseus.js'
import { SERVER_PORT } from '../../../shared/src/Constants'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? `ws://localhost:${SERVER_PORT}`
const ROOM_NAME = 'kingdom_wars'
const PVP_SESSION_KEY = 'kw:pvp-session'
const RECONNECT_TIMEOUT_MS = 30_000

export type ReconnectEvent =
  | { status: 'reconnecting'; secondsLeft: number }
  | { status: 'reconnected'; room: Room }
  | { status: 'failed' }

type ReconnectListener = (event: ReconnectEvent) => void

/**
 * Singleton that wraps the Colyseus client.
 * Holds the active room instance so scenes can share it.
 */
export class NetworkManager {
  private static instance: NetworkManager
  private client: Client
  private _room: Room | null = null
  private reconnectListeners = new Set<ReconnectListener>()
  private reconnectInProgress = false
  private intentionalLeave = false

  private constructor() {
    this.client = new Client(SERVER_URL)
  }

  static get(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager()
    }
    return NetworkManager.instance
  }

  get room(): Room | null {
    return this._room
  }

  get connected(): boolean {
    return this._room !== null
  }

  onReconnect(listener: ReconnectListener): () => void {
    this.reconnectListeners.add(listener)
    return () => this.reconnectListeners.delete(listener)
  }

  /** Create a new room. Returns the room code to share. */
  async createRoom(playerName: string): Promise<{ room: Room; roomCode: string }> {
    const room = await this.client.create(ROOM_NAME, { playerName })
    this.attachRoom(room)
    const roomCode = this.getRoomCodeFromState(room)
    return { room, roomCode }
  }

  /** Join an existing room by its 6-char code. */
  async joinRoom(roomCode: string, playerName: string): Promise<Room> {
    const room = await this.client.joinById(roomCode.toUpperCase(), { playerName })
    this.attachRoom(room)
    return room
  }

  sendReady(): void {
    this._room?.send('ready')
  }

  /** Cleanly leave and clear the active room. */
  async disconnect(): Promise<void> {
    if (this._room) {
      this.intentionalLeave = true
      try {
        await this._room.leave()
      } finally {
        this._room = null
        this.intentionalLeave = false
      }
    }
    this.clearSession()
  }

  async reconnectFromStoredSession(): Promise<Room | null> {
    const session = this.loadSession()
    if (!session) return null

    try {
      const room = await this.client.reconnect(session.reconnectionToken)
      this.attachRoom(room)
      this.emitReconnect({ status: 'reconnected', room })
      return room
    } catch {
      this.clearSession()
      return null
    }
  }

  private attachRoom(room: Room): void {
    this._room = room
    this.storeSession(room)

    room.onLeave(() => {
      this._room = null
      if (this.intentionalLeave || this.reconnectInProgress) return
      void this.tryAutoReconnect()
    })
  }

  private async tryAutoReconnect(): Promise<void> {
    const session = this.loadSession()
    if (!session || this.reconnectInProgress) {
      this.emitReconnect({ status: 'failed' })
      return
    }

    this.reconnectInProgress = true
    const deadline = Date.now() + RECONNECT_TIMEOUT_MS

    while (Date.now() < deadline) {
      const secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      this.emitReconnect({ status: 'reconnecting', secondsLeft })

      try {
        const room = await this.client.reconnect(session.reconnectionToken)
        this.attachRoom(room)
        this.reconnectInProgress = false
        this.emitReconnect({ status: 'reconnected', room })
        return
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    this.reconnectInProgress = false
    this.clearSession()
    this.emitReconnect({ status: 'failed' })
  }

  private emitReconnect(event: ReconnectEvent): void {
    for (const listener of this.reconnectListeners) listener(event)
  }

  private storeSession(room: Room): void {
    if (!room.reconnectionToken) return
    sessionStorage.setItem(PVP_SESSION_KEY, JSON.stringify({
      reconnectionToken: room.reconnectionToken,
    }))
  }

  private loadSession(): { reconnectionToken: string } | null {
    const raw = sessionStorage.getItem(PVP_SESSION_KEY)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as { reconnectionToken?: unknown }
      if (typeof parsed.reconnectionToken !== 'string') return null
      return { reconnectionToken: parsed.reconnectionToken }
    } catch {
      return null
    }
  }

  private clearSession(): void {
    sessionStorage.removeItem(PVP_SESSION_KEY)
  }

  private getRoomCodeFromState(room: Room): string {
    const state = room.state as { roomCode?: unknown }
    return typeof state?.roomCode === 'string' ? state.roomCode : room.roomId
  }
}
