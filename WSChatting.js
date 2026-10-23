const expressws = require('express-ws')
const express = require('express')
const readline = require('readline')

const clients = new Map() // socket, {id, room id}
const bannedIPs = new Map() // ip, reason
const app = express()
expressws(app)
let cmdlineInt;
let IsAccepting = true;
class User {
    constructor(socket, name, roomId) {
        this.socket = socket
        this.name = name
        this.roomId = roomId
    }
    join() {
        if (!IsSocketConnected(this.socket)) return
        clients.set(this.socket,{name:this.name, roomId: this.roomId})
        for (const [client, {id, roomId}] of clients) {
            if (client !== this.socket && roomId === this.roomId) {
                client.send(`(S) ${this.name} HAS JOINED THE CHAT`)
            } else if (client === this.socket && roomId === this.roomId) {
                client.send(`(S) YOU HAVE JOINED THE CHAT OF ROOM ${this.roomId}`)
            }
        }
        
    }
    leave(rCode, rMessage) {
        const code = rCode ?? 1000
        const message = rMessage ?? `(S) You have left the chat.`
        
        if (clients.has(this.socket)) {
            clients.delete(this.socket)
        }
        for (const [client, {name, roomId}]of clients) {
            if (client !== this.socket && roomId === this.roomId && IsSocketConnected(client)) {
                client.send(`(S) ${this.name} HAS LEFT THE CHAT`)
            }
        }
        if (!IsSocketConnected(this.socket)) return
        return this.socket.close(code, message)
        
    }

    chat(message) {
        if (!IsSocketConnected(this.socket)) return
        if (message.length > 100 || message.trim().length <= 0) {
            return this.socket.send(`(S) MESSAGE TOO LARGE OR INVALID`)
        }
        for (const [client, {name, roomId}] of clients) {
            if (!IsSocketConnected(client)) continue
            if (client !== this.socket && roomId === this.roomId) {
                client.send(`CLIENT ${this.name}: ${message}`)
            } else if (client === this.socket && roomId === this.roomId) {
                client.send(`YOU: ${message}`)
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
    const uname = req.query.name
    const IP = NormalIP(req.socket.remoteAddress)
    if (!IsAccepting) {
        return ws.close(1013, `(S) The server isn't accepting connections right now.`)
    }
    if (bannedIPs.has(IP)) {
        const reason = bannedIPs.get(IP)
        return ws.close(1008, `(S) You are banned for reason: ${reason}`)
    }
    log(`A client (${IP}) has connected to server`)
    const requestedRoomID = Number.isInteger(Number(req.params.id)) ? Number(req.params.id) <= 15 ? Number(req.params.id) >= 0 ? Number(req.params.id) : 1 : 1 : 1

    log(`A client has joined room ${requestedRoomID}`)
    const user = new User(ws, uname, requestedRoomID)
    user.join()
    log(user)

    ws.on('message', (bmsg) => {
        user.chat(bmsg.toString())
    })
    ws.on('close', () => {
        user.leave()
    })

})


app.listen(3500, '0.0.0.0', () => {
    log('Server running')
})

function NormalIP(ip) {return ip.replace('::ffff:', '').replace('::1','127.0.0.1').replace('::','')}
function IsSocketConnected(socket) {
    if (socket.readyState === WebSocket.OPEN) {
        return true
    } else {
        return false
    }
}

function log(message) {
    if (cmdlineInt) {
        readline.clearLine(process.stdout, 0)
        readline.cursorTo(process.stdout, 0)
    }
    console.log(message)
    if (cmdlineInt) {
        cmdlineInt.prompt(true)
    }
}


cmdlineInt = readline.createInterface({
    input:process.stdin,
    output:process.stdout,
    prompt:'[CLINTERFACE]> ',
    
})
cmdlineInt.prompt()
cmdlineInt.on('line', (input) => {
    try {
        eval(input)
    } catch {
        log(`             > Something went wrong when evaluating.`)
    }
    cmdlineInt.prompt()
})
