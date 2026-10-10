const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const adminPass = "UHOJS"
const multer = require('multer')
const DisallowedInput = ['/', '../', ':', '*', '?','"','<','>','|','\\']
const FileDir = "C:\\Users\\YEP\\OneDrive\\Documents\\audio"
let Filenames = fs.readdirSync(FileDir)
const bannedIPs = new Set()
app.use((req,res,next) => {
    const IP = normalIP(req.socket.remoteAddress)
    if (bannedIPs.has(IP)) {
        return res.status(403).json({"error":"you are banned"})
    }
    next()
})
app.use(express.json())
fs.watch(FileDir, () => {
    Filenames = fs.readdirSync(FileDir)
})

const strg = multer.diskStorage({
    destination:FileDir,
    filename: (req,file,func) => {
        
        for (const character of DisallowedInput) {
            if (file.originalname.includes(character)) {
                return func(new Error('invalid file name'))
            }
        }
        if (Filenames.includes(file.originalname)) {
            return func(new Error('file name is taken'))
        }
        console.log(`A user has uploaded file: ${file.originalname}`)
        func(null, path.basename(file.originalname))
    }
})
const upload = multer({ storage:strg,limits: { fileSize: 10 * 1024 * 1024 }})

app.get('/GetFile', (req,res) => {
    const ReqFile = req.query.file
    const ReqDownloadOption = req.query.download || 'false' 
    if (!ReqFile || !Filenames.includes(ReqFile)) {
        return res.status(404).json({"error":"Unknown File"})
    }
    if (ReqDownloadOption === 'true') {
        res.download(path.join(FileDir, ReqFile))
    } else {
        res.sendFile(path.join(FileDir, ReqFile))
    }
})

app.get('/GetFileList', (req,res) => {
    res.json({"info":"success","data":Filenames})
})

app.post('/PostFile', (req,res) => {
    upload.array('files',5)(req, res, (err) => {
        if (err) {
            return res.status(400).json({"error":err.message})
        }

        if (!req.files || req.files === [] || req.files === ['']) {
            return res.status(400).json({"error":'no file provided'})
        }
        Filenames = fs.readdirSync(FileDir)
        return res.json({'info':'success'})
    })
})

app.post('/admin/:action', async (req,res) => {
    const IP = normalIP(req.socket.remoteAddress)
    const password = req.body.password ?? undefined
    const action = req.params.action
    if (!req.secure && (req.hostname !== "localhost" || normalIP(req.socket.remoteAddress) !== '127.0.0.1')) {
        return res.status(400).json({"error":'ineligible unsecure context'})
    }
    if (!password || !action || password !== adminPass) {
        return res.status(400).json({"error":'bad request'})
    }
    if (action === "evaluate") {
        const code = req.body.code ? req.body.code : "console.log('Undefined code.')"
        try {
            eval(code) }
        catch (error) { 
            console.log(`Something went wrong from evaluation: ${error.message}`)
            return res.status(500).json({"error":error.message})
        }
        res.json({"info":"success","data":"evaluated code"})
    } else if (action === "ipban") {
        const TargIP = normalIP(req.body.ip)
        bannedIPs.add(TargIP)
        res.json({"info":"success","data":"banned IP " + TargIP})
    } else {
        res.status(400).json({"error":"unknown action"})
    }
})

app.listen(80, '0.0.0.0', () => {
    console.log(`✔️SERVER IS ON✔️`)
})

function normalIP(ip) {return ip.replace('::ffff:','').replace('::1','127.0.0.1')}
