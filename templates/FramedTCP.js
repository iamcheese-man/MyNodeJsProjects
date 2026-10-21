const net = require('net');
const fsocket = require('framed-socket');
const app = net.createServer();
const port = 81;
const host = "0.0.0.0";

app.on('connection', (rSocket) => {
    // here you can check the validation of the RAW message
    const socket = new fsocket(rSocket);
    // here you just do usual stuff
    socket.on('message',(BMSG) => {
        const msg = BMSG.toString();
        // your code here to handle messages
    });
});

app.listen(port, host, () => {
    console.log(`ServerRunning;PORT:${port}`)
    console.log(`              HOST:${host}`)
});
