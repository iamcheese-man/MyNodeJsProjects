const net = require('net')
const express = require('express')
const FramedSocket = require('framed-socket')
const cors = require('cors')
const tcpApp = net.createServer()
const app = express()
const fs = require('fs')
const bannedIPs = new Set()
const clientSockets = new Set()
const FilePaths = {
    "BloodMoon.mp3":"C:\\Users\\YEP\\OneDrive\\Documents\\audio\\ApocalypseSTrack.mp3",
    "TribunalsTrialsAndExecutions.mp3":"C:\\Users\\YEP\\OneDrive\\Documents\\audio\\TribunalSTrack.mp3",
    "TouchToneTelephone.mp3":"C:\\Users\\YEP\\OneDrive\\Documents\\audio\\TouchToneTelephoneLD.mp3"
}
const fileNames = Object.keys(FilePaths)
const password = "UHOJS"
const clientActions = ['RequestFile', 'RequestFileList', 'Quit', 'RequestFileStats', 'ShutdownServer']

app.use(cors())
app.use((req,res,next) => {
    const IP = IPv6ToIPv4(req.socket.remoteAddress)
    console.log(`HTTP CLIENT HAS REQUESTED: ${req.method} ${req.path} FROM IP ${IP} `)
    if (acceptingConnections === false) {
        return res.json({"error":"The server isn't accepting connections right now."})
    } 
    next()
})
let acceptingConnections = true;
let shuttingDown = false;

tcpApp.on('connection', async (rSocket) => {
    const socket = new FramedSocket(rSocket)
    const IP = IPv6ToIPv4(socket.remoteAddress)
    
    console.log(`Client ${IP} has connected`)
    if (bannedIPs.has(IP)) {
        return socket.end(`SERVER\nYou are banned.`)
    }
    if (acceptingConnections === false) {
        return socket.end(`SERVER\nThe server isn't accepting anymore connections.`)
    }
    socket.write(`SERVER\nWelcome to FileArchive.\r\n\r\nAvailable Files: ${fileNames}`)
    clientSockets.add(socket)
    socket.on('message', async (bMsg) => {
        const msg = bMsg.toString().replaceAll('\\n', '\n').replaceAll('\\r', '\r')
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

            const file = fs.readFileSync(FilePaths[argument])
            socket.write(file)
        } else if (action === "Quit") {
            socket.end()
        } else if (action === "RequestFileList") {
            socket.write(`SERVER\nCurrent file list : ${fileNames}`)
        } else if (action === "RequestFileStats") {
            if (!argument || !fileNames.includes(argument)) {
                return socket.write(`SERVER\nUnknown File.`)
            }
            const fileStats = fs.statSync(FilePaths[argument]) 
            socket.write(`SERVER\nFile:${argument}\nFile Size:${fileStats.size} bytes`)     
        } else if (action === "ShutdownServer") {
            if (argument !== password) {
                return socket.end(`SERVER\nWrong password.`)
            }
            if (shuttingDown) {
                return socket.write(`SERVER\nThe server is already shutting down.`)
            }
            shuttingDown = true;
            for (const clientSocket of clientSockets) {
                if (clientSocket !== socket) {
                    clientSocket.write(`SERVER\nAll clients will be disconnected in 45 seconds and the server is shutting down in 1 minute. Please stop transferring files.`)
                } else {
                    clientSocket.write(`SERVER\nSuccessfully initiated server shutdown.`)
                }
                
            }
            await new Promise(resolve => setTimeout(resolve, 45000))
            acceptingConnections = false;
            for (const clientSocket of clientSockets) {
                clientSocket.end()
            }
            await new Promise(resolve => setTimeout(resolve, 15000))
            process.exit(0)
        }
    })
    socket.on('error', (err) => {
        console.log(`CLIENT ERRORED: ${err}`)
    })
    socket.on('close', (hadErr) => {
        console.log(`CLIENT CLOSED: ${hadErr}`)
        clientSockets.delete(socket)
    })
})

app.get('/', (req,res) => {
    res.send(`<h1>Current paths: /, /api, /api/requestfile, /api/requestfile, /api/requestfilestats, /api/requestfilelist</h1>`)
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
    res.sendFile(FilePaths[requestedFile])
})

app.get('/api/requestfilestats/:filename', (req,res) => {
    const reqStatForFile = req.params.filename
    if (!reqStatForFile || !fileNames.includes(reqStatForFile)) {
        return res.status(404).json({"error":"Unknown file."})
    }
    const fileStats = fs.statSync(FilePaths[reqStatForFile])
    res.json({"info":"success", "fileName":reqStatForFile, "fileSize":fileStats.size})
})

app.get('/api/requestfilelist', (req,res) => {
    res.json({"info":"success", "fileList":fileNames})
})

app.listen(80, '0.0.0.0', () => {
    console.log('HTTP Server is running')
})
tcpApp.listen(81, '0.0.0.0', () => {
    console.log('TCP Server is running')
})


function IPv6ToIPv4(i) {
    const ip = i.toString()
    return ip.replace('::ffff:','').replace('::1','127.0.0.1').replace('::', '')
}
