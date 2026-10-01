// ----------------------------------------------------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------------------------------------------------

const express = require('express');
const ews = require('express-ws');
const crypto = require('crypto');
const cors = require('cors');
const app = express();
const port = 3000;
const host = '0.0.0.0'
const blacklistedIPs = ['']
ews(app, null, {
    wsOptions: {
        verifyClient: (info, callback) => {
            const clientIP = info.req.socket.remoteAddress
            if (blacklistedIPs.includes(clientIP)) {
                callback(false, 403, 'You are blacklisted from upgrading the connection to WebSocket.');
            } else {
                callback(true, 200, 'Upgrade request accepted.')
            }
        }
    }
});

// ----------------------------------------------------------------------------------------------------------
// MIDDLEWARE
// ----------------------------------------------------------------------------------------------------------

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

// ----------------------------------------------------------------------------------------------------------
// MAP, SET AND FUNCTIONS
// ----------------------------------------------------------------------------------------------------------

const chatMsgs = new Map()
const clients = new Set();

// ----------------------------------------------------------------------------------------------------------
// ENDPOINTS (HTML)
// ----------------------------------------------------------------------------------------------------------

app.get('/', (req,res) => {
    res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Realtime Chat Service</title>
        <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
        <h1 style="color:blue;">Realtime Chat Service</h1>
        <h2>Chat with other users</h2>
        <h3 class="corner-right" id="connectionState"><i>Connecting...</i></h3>
        
        <div class="textArea" id="chatArea"></div>
        <input class="textInput" id="chatInput" type="text">
        <button class="textButton" id="sendBTN">Send</button>
            
    </body>
    <script>
        const ws = new WebSocket('/live/chat');
        const chatTextArea = document.getElementById("chatArea");
        const chatTextInput = document.getElementById("chatInput");
        const chatTextButton = document.getElementById("sendBTN");
        const connectionHeader = document.getElementById("connectionState");
        
        chatTextButton.addEventListener('click', () => {
            const InputMessage = chatTextInput.value.trim();
            if (InputMessage === "") {
                return console.log('Empty message.');
            }
            ws.send(InputMessage);
            chatTextInput.value = "";
        });
        ws.onmessage = (event) => {
            const message = document.createElement('div');
    
            message.textContent = event.data;
            if (message.textContent.startsWith('CLIENT') && message.textContent.endsWith('HAS JOINED THE CHAT') && !message.textContent.includes(':')) {
                message.style = "color:green;"
            }
            if (message.textContent.startsWith('CLIENT') && message.textContent.endsWith('HAS LEFT THE CHAT') && !message.textContent.includes(':')) {
                message.style = "color:red;"
            }
            if (message.textContent.startsWith('Your ID is:')) {
                message.style = "color:blue;"
            }
            chatTextArea.appendChild(message);
        };
        ws.onopen = () => {
            connectionHeader.textContent = "Connected";
            connectionHeader.style = "color:green;"
            console.log('Successfully connected to the server. If you suddenly disconnected while on the same tab, you need to refresh the page.');
        };
        ws.onclose = () => {
            connectionHeader.textContent = "Disconnected";
            connectionHeader.style = "color:red;"
            console.log('You have been disconnected from the server.');
        };
    </script>
    </html>
    `)
});

// ----------------------------------------------------------------------------------------------------------
// ENDPOINTS (API/WS)
// ----------------------------------------------------------------------------------------------------------

let NextClientID = 1;
let NextMessageID = 0;

app.ws('/live/chat', (ws,req) => {
    let wsID = ws.id;
    const socketIP = req.socket.remoteAddress
    clients.add(ws)
    wsID = NextClientID++;
    console.log(`Client with IP ${socketIP} has connected to the server and got client ID ${wsID}`)
    if (chatMsgs.size >= 1) {
        for (const messageRecord of chatMsgs.values()) {
            ws.send(`CLIENT ${messageRecord.senderId}: ${messageRecord.text}`)
        };
    }
    
    ws.send(`Your ID is: ${wsID}.`)
    for (const client of clients) {
        if (client !== ws) {
            client.send(`CLIENT ${wsID} HAS JOINED THE CHAT`)
            console.log(`CLIENT ${wsID} HAS JOINED THE CHAT`)
        }
    };
    ws.on('message', (bmsg) => {
        const msg = bmsg.toString();
        
        const messageId = NextMessageID++;
        const messageRecord = { senderId: wsID, text: msg }; 
        chatMsgs.set(messageId, messageRecord)
        for (const client of clients) {
            if (client.readyState === 1) {
                client.send(`CLIENT ${wsID}: ${msg}`);
                console.log(`CLIENT ${wsID}: ${msg}`);
            } else {
                console.log(`CLIENT ${client.id} is disconnected and can't receive messages now.`);
            }
        }
    });
    ws.on('close', () => {
        clients.delete(ws);
        for (const client of clients) {
            if (client !== ws) {
                client.send(`CLIENT ${wsID} HAS LEFT THE CHAT`)
                console.log(`CLIENT ${wsID} HAS LEFT THE CHAT`)
            }
        };
    });
});

// ----------------------------------------------------------------------------------------------------------
// ERROR HANDLING
// ----------------------------------------------------------------------------------------------------------

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({"error":" (500) Something went wrong on the server. Please contact a maintainer to fix a bug."})
});

app.use((req, res, next) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Endpoint Not Found</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
            <h1><span style="color:red;">404</span> (Cannot ${req.method} ${req.path})</h1>
            <h2>Endpoint Not Found</h2>
        </body>
        </html>
    `);
});

// ----------------------------------------------------------------------------------------------------------
// SERVER
// ----------------------------------------------------------------------------------------------------------

const server = app.listen(port, host, () => {
    console.log(`The server has started on http://localhost:${port}`)
});

