/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IMPORTS
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
const express = require('express');
const expressratelimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const port = 3000
const BindingHost = '0.0.0.0'
const InformaticHost = 'localhost'
const InformaticProtocol = 'http'
const app = express()
const publicDir = path.join(__dirname, 'public'); 
const UserGeneratedFolder = path.join(publicDir, 'UGC');

const allowedKeys = ['no', 'key2']

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MIDDLEWARE
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.use(express.json({ limit:'1 kb' }));
app.use(express.text({ limit:'50 mb' }));
app.use(express.urlencoded({ extended:true, limit:'50 mb' }))
app.use(express.static(publicDir));
app.use(cors())
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ENDPOINTS (HTML)
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/', (req,res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Text Uploader</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <h1 style="color:blue;">Text Uploader</h1>
    <label class="textLabel" id="resultLabel"></label>
    <label class="textLabel">Text (file) name:</label>
    <input class="textInput" id="incomingTextName" type="text">
    <label class="textLabel">Text (file) extension:</label>
    <input class="textInput" id="incomingTextExt" type="text">
    <label class="textLabel">Text content:</label>
    <textArea class="textArea" id="incomingText"></textArea>
    <label class="textLabel">API key:</label>
    <input class="textInput" id="incomingAPIkey" type="text">
    <button class="textButton" id="submitBTN">Submit</button>
</body>
<script>
    const pageOrigin = window.location.origin
    const port = window.location.port
    const rLabel = document.getElementById("resultLabel");
    const tNameForm = document.getElementById("incomingTextName");
    const tExtForm = document.getElementById("incomingTextExt");
    const tForm = document.getElementById("incomingText");
    const apiKeyForm = document.getElementById("incomingAPIkey");
    const tButtonForm = document.getElementById("submitBTN");
    
    tButtonForm.addEventListener('click', () => {   
        fetch('/api/upload-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   'x-api-key' : apiKeyForm.value.trim() },
        body: JSON.stringify({ 'text' : tForm.value.trim(),
                'textName' : tNameForm.value.trim(),
                'textExtension' : tExtForm.value.trim()})
        })
        .then(res => res.json())
        .then(data => {
            const info = data.info
            rLabel.textContent = info;
            rLabel.style.color = "green";
            
        });
        
    });
</script>
</html>
    `)
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ENDPOINTS (API)
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/api/upload-text', (req,res) => {
    const inputText = req.body.text
    const inputTextName = req.body.textName
    const inputTextExt = req.body.textExtension
   
    const inputAPIkey = req.headers["x-api-key"]

    if (!inputText || !inputTextExt || !inputTextName || !inputAPIkey) {
        return res.status(400).json({"error": 'Bad Request'});
    }

    if (!allowedKeys.includes(inputAPIkey)) {
        return res.status(401).json({"error": 'Invalid API key'});
    }

    const safeName = inputTextName.replace(/[^a-z0-9_\-]/gi, '_');
    const safeExt = inputTextExt.replace(/[^a-z0-9]/gi, '');

    fs.writeFile(path.join(UserGeneratedFolder, `${safeName}.${safeExt}`), inputText, (err) => {
        if (err) {
            console.error(`User File Creation error: ${err}`);
            res.status(400).json({"error":`Error: ${err}`})
        } else {
            console.log('User File created successfully');
            res.status(200).json({"info":`Your text has been successfully uploaded at ${protocol}://${InformaticHost}:${port}/UGC/${safeName}.${safeExt}`})
        }
    });
    
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SERVER
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

const server = app.listen(port, host, () => {
    console.log(`Server running on http://${BindingHost}:${port}.`)
});

