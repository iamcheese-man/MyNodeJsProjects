const net = require('net')
const express = require('express')
const expressWS = require('express-ws')
const FramedSocket = require('framed-socket')
const path = require('path')
const cors = require('cors')
const readline = require('readline')
const tcpApp = net.createServer()
const app = express()
const fs = require('fs')
const bannedIPs = new Set()
const clientSockets = new Map()
const MainDirectory = 'C:\\Users\\YEP\\OneDrive\\Documents\\audio'
let fileNames = fs.readdirSync(MainDirectory)
let CommandLineINT;
fs.watch(MainDirectory, () => {
    fileNames = fs.readdirSync(MainDirectory)
})
const password = "UHOJS"
const clientActions = ['RequestFile', 'RequestFileList', 'Quit', 'RequestFileStats', 'ShutdownServer']
const LogFile  = fs.createWriteStream('./logs.log', { flags:'a' })
expressWS(app)
app.use(cors())
app.use((req,res,next) => {
    const IP = IPv6ToIPv4(req.socket.remoteAddress)
    log(`[+] [${CalculateTime()}] HTTP CLIENT HAS REQUESTED: ${req.method} ${req.path} FROM IP ${IP} `)
    res.on('finish', () => {
        log(`    [+] RESPONSE CODE: ${res.statusCode}`)
        log(`    [+] RESPONSE HEADERS: ${JSON.stringify(res.getHeaders())}`)
    })
    if (acceptingConnections === false) {
        return res.status(403).json({"error":"The server isn't accepting connections right now."})
    } else if (bannedIPs.has(IP)) {
        return res.status(403).json({"error":"You are banned."})
    }
    next()
})
let acceptingConnections = true;
let shuttingDown = false;

tcpApp.on('connection', async (rSocket) => {
    const socket = new FramedSocket(rSocket)
    const IP = IPv6ToIPv4(socket.remoteAddress)
    
    log(`[+] [${CalculateTime()}] CLIENT ${IP} HAS CONNECTED TO THE TCP SERVER`)
    if (bannedIPs.has(IP)) {
        log(`[!] [${CalculateTime()}] BANNED CLIENT ${IP} HAS TRIED TO CONNECT TO TCP SERVER`)
        return socket.end(`SERVER\nYou are banned.`)
    }
    if (acceptingConnections === false) {
        return socket.end(`SERVER\nThe server isn't accepting anymore connections.`)
    }

    socket.once('rawData', (rdata) => {
        if (rdata.length < 4) {
            return socket.end(`SERVER\nMalformed message.`)
        }
        const LengthHeader = rdata.readUInt32BE(0)
        if (LengthHeader === 0 || LengthHeader > 50) {
            return socket.end(`SERVER\nMalformed length header.`)
        }
    })
    

    socket.write(`SERVER\nWelcome to FileArchive.\r\n\r\nAvailable Files: ${fileNames}`)
    clientSockets.set(socket, "tcp")

    socket.on('message', async (bMsg) => {
        const msg = bMsg.toString().replaceAll('\\n', '\n').replaceAll('\\r', '\r')
        log(`[i] [${CalculateTime()}] CLIENT (TCP) HAS SENT: ${msg}.`)
        if (!msg.startsWith('CLIENT\n')) {
            return socket.write(`SERVER\nInvalid Message.`)
        }
        const action = msg.split('\n')[1]
        const argument = msg.split('\n')[2]

        if (!clientActions.includes(action)) {
            return socket.write(`SERVER\nUnknown Action.`)
        }

        if (action === "RequestFile") {
            if (!argument || !fileNames.includes(argument)) {
                return socket.write(`SERVER\nUnknown File.`)
            }

            const file = fs.readFileSync(path.join(MainDirectory, argument))
            socket.write(file)
        } else if (action === "Quit") {
            socket.end()
        } else if (action === "RequestFileList") {
            socket.write(`SERVER\nCurrent file list : ${fileNames}`)
        } else if (action === "RequestFileStats") {
            if (!argument || !fileNames.includes(argument)) {
                return socket.write(`SERVER\nUnknown File.`)
            }
            const fileStats = fs.statSync(path.join(MainDirectory, argument))
            socket.write(`SERVER\nFile:${argument}\nFile Size:${fileStats.size} bytes`)     
        } else if (action === "ShutdownServer") {
            if (argument !== password) {
                return socket.end(`SERVER\nWrong password.`)
            }
            if (shuttingDown) {
                return socket.write(`SERVER\nThe server is already shutting down.`)
            }
            shuttingDown = true;
            handleDiffClients(socket, "broadcastShutdown")
            await new Promise(resolve => setTimeout(resolve, 45000))
            acceptingConnections = false;
            log(`[i] [${CalculateTime()}]: THE SERVER IS NO LONGER ACCEPTING CONNECTIONS`)
            handleDiffClients(socket, "KickAllClients")
            await new Promise(resolve => setTimeout(resolve, 15000))
            process.exit(0)
        }
    })
    socket.on('error', (err) => {
        log(`[!] [${CalculateTime()}] CLIENT ${IP} ERRORED: ${err}`)
    })
    socket.on('close', (hadErr) => {
        log(`[-] [${CalculateTime()}] CLIENT ${IP} HAS DISCONNECTED FROM THE SERVER. HAD ERROR: ${hadErr}`)
        clientSockets.delete(socket)
    })
})

app.get('/', (req,res) => {
    res.send(`<h1>Current paths: /, /api, /api/requestfile, /api/requestfile, /api/requestfilestats, /api/requestfilelist</h1>`)
})
app.get('/health', (req,res) => {
    res.json({"status":"operational", "acceptingConnections":acceptingConnections, "fileCount":fileNames.length})
})
app.get('/api', (req,res) => {
    res.json({
        "CurrentAPIs":['requestfile', 'requestfilestats', 'requestfilelist']
    })
})
app.get('/api/requestfile/:filename', (req,res) => {
    const requestedFile = req.params.filename
    if (!requestedFile || !fileNames.includes(requestedFile)) {
        return res.status(404).json({"error":"Unknown file."})
    }
    res.sendFile(path.join(MainDirectory, requestedFile))
})

app.get('/api/requestfilestats/:filename', (req,res) => {
    const reqStatForFile = req.params.filename
    if (!reqStatForFile || !fileNames.includes(reqStatForFile)) {
        return res.status(404).json({"error":"Unknown file."})
    }
    const fileStats = fs.statSync(path.join(MainDirectory, reqStatForFile))
    res.json({"info":"success", "fileName":reqStatForFile, "fileSize":fileStats.size})
})

app.get('/api/requestfilelist', (req,res) => {
    res.json({"info":"success", "fileList":fileNames})
})

app.ws('/', (ws,req) => {
    const IP = IPv6ToIPv4(req.socket.remoteAddress)
    log(`[+] [${CalculateTime()}] CLIENT ${IP} HAS CONNECTED TO THE WS SERVER`)
    if (bannedIPs.has(IP)) {
        log(`[!] [${CalculateTime()}] BANNED CLIENT ${IP} HAS TRIED TO CONNECT TO WS SERVER.`)
        return ws.close(1008, `SERVER;You are banned.`)
    }
    if (acceptingConnections === false) {
        return ws.close(1013, `SERVER;The server isn't accepting anymore connections.`)
    }
    ws.send(`SERVER;Welcome to FileArchive;Available Files:${fileNames}`)
    clientSockets.set(ws, "ws")
    ws.on('message', async (bMsg) => {
        const msg = bMsg.toString()
        log(`[i] [${CalculateTime()}] CLIENT (WEBSOCKET) HAS SENT: ${msg}.`)
        if (!msg.startsWith('CLIENT;')) {
            return ws.send(`SERVER;Invalid Message.`)
        }
        const action = msg.split(';')[1]
        const argument = msg.split(';')[2]

        if (!clientActions.includes(action)) {
            return ws.send(`SERVER;Unknown Action.`)
        }

        if (action === "RequestFile") {
            if (!argument || !fileNames.includes(argument)) {
                return ws.send(`SERVER;Unknown File.`)
            }

            const file = fs.readFileSync(path.join(MainDirectory, argument))
            ws.send(file)
        } else if (action === "Quit") {
            ws.close()
        } else if (action === "RequestFileList") {
            ws.send(`SERVER;Current file list:${fileNames}`)
        } else if (action === "RequestFileStats") {
            if (!argument || !fileNames.includes(argument)) {
                return ws.send(`SERVER;Unknown File.`)
            }
            const fileStats = fs.statSync(path.join(MainDirectory, argument))
            ws.send(`SERVER;File:${argument};File Size:${fileStats.size} bytes`)     
        } else if (action === "ShutdownServer") {
            if (argument !== password) {
                return ws.send(`SERVER;Wrong password.`)
            }
            if (shuttingDown) {
                return ws.send(`SERVER;The server is already shutting down.`)
            }
            shuttingDown = true;
            handleDiffClients(ws, "broadcastShutdown")
            await new Promise(resolve => setTimeout(resolve, 45000))
            acceptingConnections = false;
            log(`[i] [${CalculateTime()}]: THE SERVER IS NO LONGER ACCEPTING CONNECTIONS`)
            handleDiffClients(ws, "KickAllClients")
            await new Promise(resolve => setTimeout(resolve, 15000))
            process.exit(0)
        }
    })
    ws.on('error', (err) => {
        log(`[!] [${CalculateTime()}] CLIENT ${IP} ERRORED: ${err}`)
    })
    ws.on('close', (code) => {
        log(`[-] [${CalculateTime()}] CLIENT ${IP} HAS DISCONNECTED FROM THE SERVER. CLOSE CODE: ${code}`)
        clientSockets.delete(ws)
    })
})

app.listen(80, '0.0.0.0', async () => {
    log('\n')
    log(`[----------------------------------------------------------------------------------------------------------------------]`) 
    log(`[---------------------------------------------------]SERVER STARTUP[---------------------------------------------------]`)
    log(`[----------------------------------------------------------------------------------------------------------------------]`)  
    log('\n')
    log(`[i] [${CalculateTime()}] HTTP/WebSocket Server successfully started, running TCP server in 5 seconds...`)
    await new Promise(resolve => setTimeout(resolve, 5000))
    tcpApp.listen(81, '0.0.0.0', () => {
        log(`[i] [${CalculateTime()}] TCP Server successfully started. All systems operational.`)
    });
});


function IPv6ToIPv4(i) {
    const ip = i.toString()
    return ip.replace('::ffff:','').replace('::1','127.0.0.1').replace('::', '')
}

function handleDiffClients(socket, action) {
    if (action === "KickAllClients") {
        for (const [clientSocket, Sockettype] of clientSockets) {
            if (Sockettype === "ws") {
                clientSocket.close(1001)
            } else if (Sockettype === "tcp") {
                clientSocket.end()
            }
        }        
    } else if (action === "broadcastShutdown") {
        for (const [clientSocket, Sockettype] of clientSockets) {
            if (clientSocket !== socket && Sockettype === "ws") {
                clientSocket.send(`SERVER;All clients will be disconnected in 45 seconds and the server is shutting down in 1 minute. Please stop requesting files.`)
            } else if (clientSocket === socket && Sockettype === "tcp") {
                clientSocket.write(`SERVER\nSuccessfully initiated server shutdown.`)
            } else if (clientSocket === socket && Sockettype === "ws") {
                clientSocket.send(`SERVER;Successfully initiated server shutdown.`)
            } else if (clientSocket !== socket && Sockettype === "tcp") {
                clientSocket.write(`SERVER\nAll clients will be disconnected in 45 seconds and the server is shutting down in 1 minute. Please stop requesting files.`)
            }
        }
    } else if (action === "SystemBroadcastShutdown") {
        for (const [clientSocket, Sockettype] of clientSockets) {
            if (Sockettype === "ws") {
                clientSocket.send(`SERVER;All clients will be disconnected in 45 seconds and the server is shutting down in 1 minute. Please stop requesting files. (initiated by the System)`)
            } else if (Sockettype === "tcp") {
                clientSocket.write(`SERVER\nAll clients will be disconnected in 45 seconds and the server is shutting down in 1 minute. Please stop requesting files. (initiated by the System)`)
            }
        }        
    }
}

function CalculateTime() {
    const current = new Date()
    const year = current.getUTCFullYear()
    const month = current.getUTCMonth() + 1
    const day = current.getUTCDate()

    const time = `${current.getUTCHours()}:${current.getUTCMinutes()}:${current.getUTCSeconds()}`
    const timeStamp = `${year}/${month}/${day} - ${time}`

    return timeStamp
}

function log(message) {
    if (CommandLineINT) {
        readline.clearLine(process.stdout, 0)
        readline.cursorTo(process.stdout, 0)
    }
    console.log(message)
    LogFile.write(`${message} \r\n`)
    if (CommandLineINT) {
        CommandLineINT.prompt(true)
    }
}

async function HandleCLI(input) {
    const [action, arg] = input.split(' ')
    if (action === "ban") {
        const [IPINT1, IPINT2, IPINT3, IPINT4] = arg.split('.')
        
        if (!arg || arg === "" || !IPINT1 || !IPINT2 || !IPINT3 || !IPINT4 || Number(IPINT1) > 255 || Number(IPINT2) > 255 || Number(IPINT3) > 255 || Number(IPINT4) > 255) {
            return log(`[CL Interface] [${CalculateTime()}]: Invalid argument '${arg}'. Must be a valid IPv4 address.`)
        }
        bannedIPs.add(arg)
        log(`[CL Interface] [${CalculateTime()}]: Successfully banned IP ${arg}`)
    } else if (action === "shutdown") {
        if (shuttingDown) {
            return log(`[CL Interface] [${CalculateTime()}]: The server is already shutting down.`)
        }
        
        shuttingDown = true;
        handleDiffClients(null, "SystemBroadcastShutdown")

        log(`[CL Interface] [${CalculateTime()}]: Successfully initiated shutdown.`)
        await new Promise(resolve => setTimeout(resolve, 45000))
        acceptingConnections = false;
        log(`[i] [${CalculateTime()}]: THE SERVER IS NO LONGER ACCEPTING CONNECTIONS`)
        handleDiffClients(null, "KickAllClients")
        await new Promise(resolve => setTimeout(resolve, 15000))
        process.exit(0)
    } else if (action === "unban") {
        if (!bannedIPs.has(arg)) {
            log(`[CL Interface] [${CalculateTime()}]: This IP ${arg} is not banned.`)
        } else {
            bannedIPs.delete(arg)
            log(`[CL Interface] [${CalculateTime()}]: Successfully unbanned IP ${arg}`)
        }
    } else if (action === "kickall") {
        if (clientSockets.size === 0) {
            return log(`[CL Interface] [${CalculateTime()}]: No clients are currently connected.`)
        }
        handleDiffClients(null, "KickAllClients")
    } else if (action === "ipkick") {
        for (const [s, stype] of clientSockets) {
            if (stype === "ws") {
                if (IPv6ToIPv4(s._socket.remoteAddress) === arg) {
                    s.close(1000, `SERVER;You have been kicked from the server.`)
                }
            } else if (stype === "tcp") {
                if (IPv6ToIPv4(s.remoteAddress) === arg) {
                    s.end(`SERVER\nYou have been kicked from the server.`)
                }
            }
        }
    } else if (action === "clients") {
        log(`[CL Interface] [${CalculateTime()}]: Currently connected clients:`)
        if (clientSockets.size === 0) {
            return log(`          [!] None. `)
        }
        for (const [socket, socketType] of clientSockets) {
            if (socketType === "ws") {
                const ip = IPv6ToIPv4(socket._socket.remoteAddress)
                log(`          [+] (WebSocket) ${ip} `)
            } else if (socketType === "tcp") {
                const ip = IPv6ToIPv4(socket.remoteAddress)
                log(`          [+] (TCP) ${ip} `) 
            }
        }
    } else if (action === "bannedusers") {
        log(`[CL Interface] [${CalculateTime()}]: Currently banned clients:`)
        if (bannedIPs.size === 0) {
            return log(`          [!] None. `)
        }
        for (const IP of bannedIPs) {
            log(`          [-] ${IP} `)
        }        
    } else if (action === "clientcount") {
        log(`[CL Interface] [${CalculateTime()}]: Number of connected clients: ${clientSockets.size}`)
    } else {
        return log(`[CL Interface] [${CalculateTime()}]: Unknown command.`)
    }

}

CommandLineINT = readline.createInterface({
    input:process.stdin,
    output:process.stdout,
    prompt:'ROOT > '
})

CommandLineINT.prompt()

CommandLineINT.on('line', async (input) => {
    await HandleCLI(input)
    CommandLineINT.prompt()
}) 
