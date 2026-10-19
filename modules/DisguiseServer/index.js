const express = require('express')

class DisguiseServer {
    constructor(port = 3000, host = 'localhost', callback, includeMethods = ['GET','POST','DELETE']) {
        const app = express()
        this.port = port;
        this.host = host;
        this.methods = includeMethods.map(method => method.toString().toUpperCase().trim())
        this.app = app;
        
        for (const method of this.methods) {
            const sanMethod = method.toLowerCase()
            app[sanMethod](`/api/${sanMethod}Test`, (req,res) => {
                res.json({"success":"Hello World"})
            });
        }

        this.server = this.app.listen(this.port, this.host, callback) // if the startup fails, YOU are rresponsable
    }


    
}


module.exports = DisguiseServer

// usage guide for idiots
/*
// first, you need to install the module to work with this
const server = require('DisguiseServer')
const DisguiseServer = new server(80, '0.0.0.0', () => {
    console.log('server running')
}, ['GET','POST','PATCH']) // yay! browser clients can access /api/getTest and those other methods now

function shutdown() {
    DisguiseServer.server.close() // you use this.server
}
*/


/* optional data for idiots
vibe coders are illiterate
*/
