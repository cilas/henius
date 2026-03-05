import { Room } from 'colyseus.js'
import { NetworkManager } from './NetworkManager'

export type RoomClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('Timeout')) return 'Servidor não respondeu. Verifique a conexão.'
  if (msg.includes('seat reservation') || msg.includes('full') || msg.includes('maxClients'))
    return 'Sala cheia. Aguarde ou crie uma nova.'
  if (msg.includes('not found') || msg.includes('No handler'))
    return 'Sala não encontrada. Verifique o código.'
  if (msg.includes('connect') || msg.includes('WebSocket') || msg.includes('ECONNREFUSED'))
    return 'Não foi possível conectar ao servidor.'
  return `Erro: ${msg}`
}

export const RoomClient = {
  async create(playerName: string): Promise<RoomClientResult<{ room: Room; roomCode: string }>> {
    try {
      const data = await NetworkManager.get().createRoom(playerName)
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: friendlyError(err) }
    }
  },

  async join(roomCode: string, playerName: string): Promise<RoomClientResult<Room>> {
    try {
      const room = await NetworkManager.get().joinRoom(roomCode, playerName)
      return { ok: true, data: room }
    } catch (err) {
      return { ok: false, error: friendlyError(err) }
    }
  },
}
