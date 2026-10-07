// CONVENIANCE MODULE
// made by iamcheese-man on gittyhub

function GetSocketType(socket) {
    if (!socket) {
        throw new Error('UNSPECIFIED/INVALID PARAMETERS: socket?: REQUIRED parameter')
    }
    if (typeof socket.write === "function" && typeof socket.end === "function") {return "TCP"}
    if (typeof socket.send === "function" && typeof socket.close === "function") {return "WS"}   
    throw new Error('UNKNOWN REALTIME SOCKET FUNCTIONS')
}

function GetIPFromSocket(socket, type) {
    if (!socket || !['WebSocket', 'TCP'].includes(type) || !type) {
        throw new Error('UNSPECIFIED/INVALID PARAMETERS: socket?: REQUIRED parameter, type?: REQUIRED string')
    }
    if (type === "WebSocket") {
        return socket._socket?.remoteAddress.replace('::ffff:','').replace('::1','127.0.0.1').replace('::','') 
    } else if (type === "TCP") {
        return socket.remoteAddress.replace('::ffff:','').replace('::1','127.0.0.1').replace('::','') 
    }
}

function KickSocket(socket, type, reason, code) {
    if (!socket || !['WebSocket', 'TCP'].includes(type) || !type) {
        throw new Error('UNSPECIFIED/INVALID PARAMETERS: socket?: REQUIRED parameter, type?: REQUIRED string, reason?: OPTIONAL WEBSOCKET/TCP string, code?: OPTIONAL WEBSOCKET value')
    }
    if (type === "WebSocket") {
        socket.close(code, reason)
    } else if (type === "TCP") {
        socket.end(reason) // right here the server would actually SEND data before closing a socket, not always a reason for closing socket but i still named it 
                           // 'reason' because of WebSocket
    } 
}

module.exports = {GetIPFromSocket, KickSocket}
