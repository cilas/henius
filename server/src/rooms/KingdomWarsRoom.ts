import { Room, Client } from '@colyseus/core'
import { MAX_PLAYERS } from '@kingdom-wars/shared'

export class KingdomWarsRoom extends Room {
  maxClients = MAX_PLAYERS

  onCreate(options: Record<string, unknown>) {
    console.log(`[KingdomWarsRoom] created — roomId: ${this.roomId}`)

    this.onMessage('ready', (client) => {
      console.log(`[KingdomWarsRoom] ${client.sessionId} is ready`)
    })
  }

  onJoin(client: Client, options: Record<string, unknown>) {
    console.log(`[KingdomWarsRoom] ${client.sessionId} joined (${this.clients.length}/${this.maxClients})`)
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`[KingdomWarsRoom] ${client.sessionId} left (consented: ${consented})`)
  }

  onDispose() {
    console.log(`[KingdomWarsRoom] ${this.roomId} disposed`)
  }
}
