const expressws = require('express-ws')
const express = require('express')
const clients = new Map()
const app = express()
expressws(app)

let ClientId = 1;
class User {
    constructor(socket, id, roomId) {
        this.socket = socket
        this.id = id
        this.roomId = roomId
    }
    join() {
        clients.set(this.socket,{id: this.id, roomId: this.roomId})
        for (const [client, {id, roomId}] of clients) {
            if (client !== this.socket && roomId === this.roomId) {
                client.send(`CLIENT ${this.id} HAS JOINED THE CHAT`)
            } else if (client === this.socket && roomId === this.roomId) {
                client.send(`YOU (${this.id}) HAVE JOINED THE CHAT OF ROOM ${this.roomId}`)
            }
        }
        
    }
    leave() {
        for (const [client, {id, roomId}]of clients) {
            if (client !== this.socket && roomId === this.roomId) {
                client.send(`CLIENT ${this.id} HAS LEFT THE CHAT`)
            }
        }
        clients.delete(this.socket)
        
    }

    chat(message) {
        for (const [client, {id, roomId}] of clients) {
            if (client !== this.socket && roomId === this.roomId) {
                client.send(`CLIENT ${this.id}: ${message}`)
            } else if (client === this.socket && roomId === this.roomId) {
                client.send(`YOU (${this.id}): ${message}`)
            }
            
        }
    }
}

app.ws('/live/chat{/:id}', (ws,req) => {
    
    const requestedRoomID = Number.isInteger(Number(req.params.id)) ? Number(req.params.id) <= 15 ? Number(req.params.id) >= 0 ? Number(req.params.id) : 1 : 1 : 1

    console.log(`A client has joined room ${requestedRoomID}`)
    const user = new User(ws, ClientId, requestedRoomID)
    user.join()
    ClientId++;

    ws.on('message', (bmsg) => {
        user.chat(bmsg.toString())
    })
    ws.on('close', () => {
        user.leave()
    })

})

app.listen(80, '0.0.0.0', () => {
    console.log('Server running')
})
