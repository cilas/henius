import express from 'express'
import http from 'http'
import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { playground } from '@colyseus/playground'
import { monitor } from '@colyseus/monitor'
import { KingdomWarsRoom } from './rooms/KingdomWarsRoom'
import { SERVER_PORT } from '@kingdom-wars/shared'

const app = express()
const server = http.createServer(app)

// Dev tools (not in production)
if (process.env.NODE_ENV !== 'production') {
  app.use('/playground', playground())
  app.use('/monitor', monitor())
}

const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
})

gameServer.define('kingdom_wars', KingdomWarsRoom)

gameServer.listen(SERVER_PORT).then(() => {
  console.log(`Colyseus listening on ws://localhost:${SERVER_PORT}`)
  console.log(`Playground:  http://localhost:${SERVER_PORT}/playground`)
  console.log(`Monitor:     http://localhost:${SERVER_PORT}/monitor`)
})
