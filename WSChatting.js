const expressws = require('express-ws')
const express = require('express')
const clients = new Map() // socket, {id, room id}
const bannedIPs = new Map() // ip, reason
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
        if (!IsSocketConnected(this.socket)) return
        clients.set(this.socket,{id: this.id, roomId: this.roomId})
        for (const [client, {id, roomId}] of clients) {
            if (client !== this.socket && roomId === this.roomId) {
                client.send(`(S) CLIENT ${this.id} HAS JOINED THE CHAT`)
            } else if (client === this.socket && roomId === this.roomId) {
                client.send(`(S) YOU (${this.id}) HAVE JOINED THE CHAT OF ROOM ${this.roomId}`)
            }
        }
        
    }
    leave(rCode, rMessage) {
        const code = rCode ?? 1000
        const message = rMessage ?? `(S) You have left the chat.`
        for (const [client, {id, roomId}]of clients) {
            if (client !== this.socket && roomId === this.roomId && IsSocketConnected(client)) {
                client.send(`(S) CLIENT ${this.id} HAS LEFT THE CHAT`)
            }
        }
        clients.delete(this.socket)
        if (!IsSocketConnected(this.socket)) return
        return this.socket.close(code, message)
        
    }

    chat(message) {
        if (!IsSocketConnected(this.socket)) return
        if (message.length > 100 || message.trim().length <= 0) {
            return this.socket.send(`(S) MESSAGE TOO LARGE OR INVALID`)
        }
        for (const [client, {id, roomId}] of clients) {
            if (!IsSocketConnected(client)) continue
            if (client !== this.socket && roomId === this.roomId) {
                client.send(`CLIENT ${this.id}: ${message}`)
            } else if (client === this.socket && roomId === this.roomId) {
                client.send(`(S) YOU (ID: ${this.id}): ${message}`)
            }
            
        }
    }
    ban(reason) {
        bannedIPs.set(NormalIP(this.socket._socket.remoteAddress), reason)
        if (!IsSocketConnected(this.socket)) return
        this.leave(1008, `You have been banned from the server for reason: ${reason}`)
    }
    unban() {
        bannedIPs.delete(NormalIP(this.socket._socket.remoteAddress))
    }
}

app.ws('/live/chat{/:id}', (ws,req) => {
    const IP = NormalIP(req.socket.remoteAddress)
    if (bannedIPs.has(IP)) {
        const reason = bannedIPs.get(IP)
        return ws.close(1008, `(S) You are banned for reason: ${reason}`)
    }
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


function NormalIP(ip) {return ip.replace('::ffff:', '').replace('::1','127.0.0.1').replace('::','')}
function IsSocketConnected(socket) {
    if (socket.readyState === WebSocket.OPEN) {
        return true
    } else {
        return false
    }
}
