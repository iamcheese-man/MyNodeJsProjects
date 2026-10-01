// --------------------------------------------------------------------------------------------------------
// IMPORTS AND VARIABLES
// --------------------------------------------------------------------------------------------------------

const express = require('express');
const adminPass = 'ZZCL3-a5bd70moplegople'
const os = require('os');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const expressratelimit = require('express-rate-limit');
const ews = require('express-ws')
const app = express();
const port = 1186;
const host = '0.0.0.0';
ews(app);

// --------------------------------------------------------------------------------------------------------
// RATE LIMIT AND FUNCTIONS
// --------------------------------------------------------------------------------------------------------

const rLimiter = expressratelimit({
    windowMs: 60 * 1000,
    limit: 14,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            "error": "Rate limit exceeded.",
            "message": "Too many requests. Please try again later."
        });
    }
});

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback, 127.0.0.1) and IPv6 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // fallback if nothing found
}
const deviceIP = getLocalIP()

// --------------------------------------------------------------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------------------------------------------------------------

app.use(cors({
    origin: [`http://localhost:${port}`, `http://${deviceIP}:${port}`, `https://iamcheese-man.github.io`]
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.text());
app.use(express.json());
app.set('trust proxy', 1);
app.use(rLimiter);

// --------------------------------------------------------------------------------------------------------
// MAP DECLARATION
// --------------------------------------------------------------------------------------------------------

const links = new Map();

// --------------------------------------------------------------------------------------------------------
// ENDPOINTS (FRONTEND)
// --------------------------------------------------------------------------------------------------------

app.get('/', (req,res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Link Shortener</title>
        <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
        <h1>Link <span style="color:green;">Shortener</span></h1>
        <form class="forms" action="/upload-link" method="POST">
            <label for="link">Full URL:</label>
            <input id="userLinkInput" type="text" name="link" required>
            <input type="submit" id="submitButton" value="Submit">
        </form>
        <h2>You <span style="color:cyan;">must</span> include the protocol <span style="color:blue;">(http://...)</span> in the URL.</h2>
    </body>
    <script>
        const submitButton = document.getElementById("submitButton");
        const uLinkInput = document.getElementById("userLinkInput");

        submitButton.addEventListener("click", () => {
            console.log("Generating URL.....");

            if (uLinkInput.value.trim() === "") {
                console.log("URL input is empty");
            };
        });
    </script>

    <script>
        let restartAfterClose = true;
        let ws;

        const hzMsg = 'healthZ';
        const hzB64 = btoa(hzMsg);

        function AttachWsHandlers() {
            ws.onopen = () => {
                console.log("connected");
                ws.send(hzB64);
            };

            ws.onmessage = (msgObject) => {
                const msg = msgObject.data;

                if (!msg.startsWith("Welcome. Server is running on PORT")) {
                    console.log("Received:", msg);
                };

                if (msg === "Server Test: Connected") {
                    console.log('Health check succeeded.');
                } else if (msg.startsWith("Welcome. Server is running on PORT")) {
                    console.log('Waiting...');
                } else if (msg.startsWith("Your IP is")) {
                    console.log('Waiting...');
                } else if (msg === "Shutting down the server.... (1983Y)") {
                    restartAfterClose = false;
                } else if (msg.startsWith("Unknown")) {
                    console.log('The command you tried to send is unknown.');
                };
            };

            ws.onclose = async () => {
                if (restartAfterClose === false) {
                    console.log('Reconnecting is disabled.');
                    console.log('In order to reconnect manually after the server is back online, refresh the web page.');
                    return;
                };

                console.log('Waiting 5 seconds to reconnect...');

                await new Promise(resolve => setTimeout(resolve, 5000));

                reconnectWS();
            };
        };

        function reconnectWS() {
            if (restartAfterClose === false) {
                console.log('Reconnecting is disabled.');
                return;
            };

            console.log('Reconnecting...');

            ws = new WebSocket("ws://localhost:1186/live");
            AttachWsHandlers();
        };

        ws = new WebSocket("ws://localhost:1186/live");
        AttachWsHandlers();
    </script>
    </html>
    `);
});

// --------------------------------------------------------------------------------------------------------
// ENDPOINTS (API)
// --------------------------------------------------------------------------------------------------------

app.post('/upload-link', (req,res) => {
    const uploadedLink = req.body.link ?? 'https://example.com'
    let parsed;
    try {
        parsed = new URL(uploadedLink);
    } catch {
        return res.status(400).json({ error: "Invalid URL. Must be a valid absolute URL." });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ error: "Only http:// and https:// URLs are allowed." });
    }
    const shortLinkID = crypto.randomBytes(10).toString('base64url').slice(0, 10);
    if (links.has(shortLinkID)) {
        return res.status(409).json({"error":"The short link already exists. Please try again."});
    };
    links.set(shortLinkID, uploadedLink);
    res.status(201).json({"status":"Success", "id":shortLinkID, "url":`http://${deviceIP}:${port}/${shortLinkID}`})
    console.log(`A user has successfully generated a URL ID: ${shortLinkID}`);
});

app.get('/:id', (req,res) => {
    const fetchedID = req.params.id
    const fullLink = links.get(fetchedID)
    if (fullLink) {
        res.redirect(fullLink);
    } else {
        res.status(404).json({"error":"(404) Ressource Not Found."});
    }
});


// --------------------------------------------------------------------------------------------------------
// WEBSOCKETS
// --------------------------------------------------------------------------------------------------------

app.ws('/live', (ws, req) => {
    const shutdownCmsg = "${SHUTDOWN}${PASSWORD:ZZCL3-a5bd70moplegople}$[CONFIRM]"
    const healthMsg = 'healthZ'
    const SDCMSGb64 = Buffer.from(shutdownCmsg).toString('base64')
    const HCMSGb64 = Buffer.from(healthMsg).toString('base64');

    ws.send(`Welcome. Server is running on PORT ${port}.`);
    ws.send(`Your IP is ${req.ip}.`);
    ws.on('message', (bufferMsg) => {
        const msg = bufferMsg.toString()
        if (msg === HCMSGb64) {
            ws.send('Server Test: Connected')
        } else if (msg === SDCMSGb64) {
            console.log('An authorised WEBSOCKET user has request the server to shut down.')
            ws.send('Shutting down the server.... (1983Y)');
            ws.send('Goodbye!');
            ws.terminate();
            server.close(() => {
                console.log('Server shut down.');
            });
        } else {
            ws.send('Unknown command.')
        }
        
    });
    ws.on('close', () => {
        console.log('A client has disconnected from the server.');
    });
});

// --------------------------------------------------------------------------------------------------------
// SERVER START
// --------------------------------------------------------------------------------------------------------

const server = app.listen(port, host, () => {
    console.log(`THE SERVER HAS STARTED ON:`)
    console.log(`- http://${host}:${port}`)
    if (host !== 'localhost') {
        console.log(`- http://localhost:${port}`)
    };
    if (host == '0.0.0.0') {
        console.log(`AVAILABLE ON ALL NETWORK INTERFACES.`)
    }
});

// --------------------------------------------------------------------------------------------------------
// ATTACK PROTECTION
// --------------------------------------------------------------------------------------------------------

server.headersTimeout = 5000;   
server.requestTimeout = 15000;     
server.timeout = 30000;             
server.keepAliveTimeout = 5000;     

// --------------------------------------------------------------------------------------------------------
// ADMIN
// --------------------------------------------------------------------------------------------------------

app.post('/api/admin/', (req,res) => {
    if (!req.body) {
        return res.status(400).json({ error: "Missing or invalid request body." });
    }
    const hInputPass = req.headers['x-password-auth']
    const bInputAType = req.body['x-priv-action']  

 
    if (!req.headers || !hInputPass || hInputPass !== adminPass || !bInputAType || bInputAType !== 'sclose') {
        return res.status(401).json({"error":"Missing/Invalid headers/body."});
    };
    if (bInputAType === 'sclose') {
        console.log('An authorised user has requested the server to stop.');
        console.log('Stopping the server process...');
        res.json({"status":"Shutting down the server... (It can fail or succeed without notification)"})
        server.close(() => {
            console.log('Server stopped.');
        });
    };
    
});

// --------------------------------------------------------------------------------------------------------
// ERROR HANDLING
// --------------------------------------------------------------------------------------------------------

// 5xx

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({"error":" (500) Something went wrong on the server. Please contact a maintainer to fix a bug."})
});
