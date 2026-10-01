const express = require('express');
const expressws = require('express-ws');
const net = require('net');
const cors = require('cors');
const tcpPort = 81;
const port = 80;
const host = '0.0.0.0'
const bannedIPs = new Set()
const app = express();
const erlt = require('express-rate-limit');
const rateLimiter = erlt({
    windowMs: 60 * 1000,
    limit: 100
})

app.use(rateLimiter)
app.use(cors())
app.use(express.static('public'))
expressws(app);



function normaliseIP(i) {
    const step1 = i.replace('::ffff:', '')
    const step2 = step1.replace('::1', '127.0.0.1')
    return step2
}
function ipNameHandler(a) {
    if (a === "127.0.0.1" || a === "::1") {
        return "loopback"
    } else if (a.startsWith("192.168.") || a.startsWith("172.16.") || a.startsWith("10.0.")) {
        return "private"
    } else {
        return "standard public"
    }
}

  /////////////////////////////////
 //            HTML             //
/////////////////////////////////
app.get('/', (req,res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Services</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <h1 style="color:green;">List of Services</h1>
    <ol class="left" style="font-size:150%;">
        <li><a href="/clicker">Clicking Simulator</a></li>
    </ol>
</body>
</html>
`)
});

app.get('/clicker', (req,res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Clicking Simulator</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <h1>Clicking Simulator</h1>
    <h2 id="clickCountlabel" class="left"><u><i>Click Count</i></u>: 0</h2>
    <button id="clickButton" class="textButton">Click!</button>
    <h1 style="color:green;">UPGRADES</h1>
    <h2 class="left"><i><u>2x Click Multiplier</u></i></h2>
    <button id="DCBButton" class="textButton">Buy</button>
</body>
<script>
    const ws = new WebSocket("/clicker");

    const cLabel = document.getElementById("clickCountlabel");
    const cBtn = document.getElementById("clickButton");
    const dcbBtn = document.getElementById("DCBButton");
    cBtn.addEventListener('click', () => {
        ws.send("CLIENT:sendClickEvent;");
    });
    dcbBtn.addEventListener('click', () => {
        ws.send("CLIENT:buyDoubleClick;");
    });
    ws.onmessage = (bMsg) => {
        const msg = bMsg.data;

        if (msg.startsWith("SERVER;currentClickCount:")) {
            const serverCCount = Number(msg.split(":")[1].replace(";", ""));

            cLabel.innerHTML = "<i>Click Count</i>: " + serverCCount;
        }
    };
</script>
</html>
    `)
});

////////////////////////////////
// WS
///////////////////////////////


app.ws('/clicker', (ws,req) => {
    
    const wsIP = normaliseIP(req.socket.remoteAddress)
    if (bannedIPs.has(wsIP)) {
        ws.send(`STATUS:BANNED;EXPIRATION:SERVER_RESTART;`)
        ws.close()
        console.log(`A banned user has tried connecting to the server.`)
        return
    }
    let userOwnedItems = []
    let clientClickCount = 0;
    function addUserItem(item) {
        userOwnedItems.push(item)
    }
    ws.send(`STATUS:CONNECTED;`)
    ws.send(`SERVER;currentClickCount:${clientClickCount};`);
    console.log(`A user with ${ipNameHandler(wsIP)} IP has connected to the server.`)
   
    ws.on('message', (bMsg) => {
        const doubleClicks = userOwnedItems.filter(
            item => item === "DoubleClick"
        ).length;
        const msg = bMsg.toString()
        
        if (msg === "CLIENT:sendClickEvent;") {
            if (userOwnedItems.includes("DoubleClick")) {
                clientClickCount += doubleClicks + 1;
            } else {
                clientClickCount++;
            }
            ws.send(`SERVER;currentClickCount:${clientClickCount};`);
            if (clientClickCount === 1000) {
                console.log(`A client has reached the 1000 clicks milestone!`)
            }
        } else if (msg === "CLIENT:buyDoubleClick;") {
            if (clientClickCount >= 500) {
                addUserItem("DoubleClick")
                clientClickCount = clientClickCount - 500;
                ws.send(`SERVER;currentClickCount:${clientClickCount};`)
            } else {
                ws.send(`SERVER:notEnoughClicks;`)
            }
        } else {
            bannedIPs.add(wsIP);
            ws.close()
            console.log(`A user with IP ${wsIP} has sent an unknown message, disconnecting them from the server and banning them until next restart.`)
        }
        
    });
    
});

  ///////////////////////////////
 // TCP                       //
///////////////////////////////
const tcpApp = net.createServer()
tcpApp.on('connection', (tcpSocket) => {
    tcpSocket.setTimeout(600000)

    let msg = ``
    const TCPmaxMSGlength = 50
    const deviceIP = normaliseIP(tcpSocket.remoteAddress)
    console.log(`A user with ${ipNameHandler(deviceIP)} IP has connected to the TCP endpoint.`)
    if (bannedIPs.has(deviceIP)) {
        tcpSocket.end(`STATUS: BANNED \nEXPIRATION: SERVER RESTART\r\nEND\r\n`)
        console.log(`A banned user has tried connecting to the server.`)
        return
    }
    

    let userOwnedItems = []
    let clientClickCount = 0;
    function addUserItem(item) {
        userOwnedItems.push(item)
    }
    tcpSocket.on('data', (data) => {
        msg += data.toString()
        if (msg.length > TCPmaxMSGlength) {
            msg = ``
            tcpSocket.end(`SERVER\nMESSAGE TOO LONG\r\nEND\r\n`)
            return
        }
        if (!msg.endsWith('\r\nEND\r\n')) {
            return
        }
        const doubleClicks = userOwnedItems.filter(
            item => item === "DoubleClick"
        ).length;
        
        if (msg === "CLIENT\nSEND CLICK EVENT\r\nEND\r\n") {
            if (userOwnedItems.includes("DoubleClick")) {
                clientClickCount += doubleClicks + 1;
            } else {
                clientClickCount++;
            }
            tcpSocket.write(`SERVER\nCURRENT CLICK COUNT: ${clientClickCount}\r\nEND\r\n`);
            if (clientClickCount === 1000) {
                console.log(`A client has reached the 1000 clicks milestone!`)
            }
            msg = ``
        } else if (msg === "CLIENT\nBUY DOUBLE CLICK\r\nEND\r\n") {
            if (clientClickCount >= 500) {
                addUserItem("DoubleClick")
                clientClickCount = clientClickCount - 500;
                tcpSocket.write(`SERVER\nCURRENT CLICK COUNT: ${clientClickCount}\r\nEND\r\n`)
            } else {
                tcpSocket.write(`SERVER\nNOT ENOUGH CLICKS\r\nEND\r\n`)
            }
            msg = ``
        } else {
            bannedIPs.add(deviceIP);
            msg = ``
            tcpSocket.end(`SERVER\nWRONG MESSAGE\r\nEND\r\n`)
            console.log(`A user with IP ${deviceIP} has sent an unknown message, disconnecting them from the server and banning them until next restart.`)
        }
    })
    tcpSocket.on('timeout', () => {
        console.log(`A user (${deviceIP}) timed out.`)
        tcpSocket.end(`SERVER\nTIMED OUT\r\nEND\r\n`)
    })
    tcpSocket.on('error', (err) => {
        console.log(`A user (${deviceIP}) has errored: ${err}`)
    });
});

app.listen(port, host, () => {
    console.log(`SERVER_URL: http://localhost:80`)
});
tcpApp.listen(tcpPort, host, () => {
    console.log(`TCP_SERVER_URL: localhost 81`)
});
