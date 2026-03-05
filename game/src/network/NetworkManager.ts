import { Client, Room } from 'colyseus.js'
import { SERVER_PORT } from '../../../shared/src/Constants'

const SERVER_URL = `ws://localhost:${SERVER_PORT}`
const ROOM_NAME = 'kingdom_wars'

/**
 * Singleton that wraps the Colyseus client.
 * Holds the active room instance so scenes can share it.
 */
export class NetworkManager {
  private static instance: NetworkManager
  private client: Client
  private _room: Room | null = null

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

  /** Create a new room. Returns the room code to share. */
  async createRoom(playerName: string): Promise<{ room: Room; roomCode: string }> {
    this._room = await this.client.create(ROOM_NAME, { playerName })

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout ao criar sala')), 5000)

      this._room!.onMessage('joined', (data: { roomCode: string; side: string; seed: number }) => {
        clearTimeout(timeout)
        resolve({ room: this._room!, roomCode: data.roomCode })
      })

      this._room!.onError((code, message) => {
        clearTimeout(timeout)
        reject(new Error(message ?? `Erro ${code}`))
      })
    })
  }

  /** Join an existing room by its 6-char code. */
  async joinRoom(roomCode: string, playerName: string): Promise<Room> {
    this._room = await this.client.join(ROOM_NAME, {
      roomCode: roomCode.toUpperCase(),
      playerName,
    })
    return this._room
  }

  sendReady(): void {
    this._room?.send('ready')
  }

  /** Cleanly leave and clear the active room. */
  async disconnect(): Promise<void> {
    if (this._room) {
      await this._room.leave()
      this._room = null
    }
  }
}
