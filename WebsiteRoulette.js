const express = require('express')
const app = express()
const possibleURLs = [
    "https://google.com",
    "https://youtube.com",
    "https://wikipedia.org",
    "https://reddit.com",
    "https://github.com",
    "https://stackoverflow.com",
    "https://chatgpt.com",
    "https://openai.com",
    "https://discord.com",
    "https://twitch.tv",
    "https://instagram.com",
    "https://facebook.com",
    "https://x.com",
    "https://threads.net",
    "https://tiktok.com",
    "https://snapchat.com",
    "https://pinterest.com",
    "https://linkedin.com",
    "https://medium.com",
    "https://dev.to",
    "https://news.ycombinator.com",
    "https://lobste.rs",
    "https://npmjs.com",
    "https://nodejs.org",
    "https://expressjs.com",
    "https://developer.mozilla.org",
    "https://w3schools.com",
    "https://codepen.io",
    "https://codesandbox.io",
    "https://replit.com",
    "https://jsfiddle.net",
    "https://glitch.com",
    "https://gitlab.com",
    "https://bitbucket.org",
    "https://vercel.com",
    "https://netlify.com",
    "https://cloudflare.com",
    "https://docker.com",
    "https://kaggle.com",
    "https://roblox.com",
    "https://minecraft.net",
    "https://store.steampowered.com",
    "https://itch.io",
    "https://justice.gov/epstein",
    "https://justice.gov/epstein",
    "https://justice.gov/epstein",
    "https://justice.gov/epstein",
    "https://dribbble.com",
    "https://edx.org",
    "https://khanacademy.org",
    "https://archiveofourown.org",
    "https://itch.io",
    "https://producthunt.com",
    "https://haveibeenpwned.com",
    "https://fast.com",
    "https://speedtest.net",
    "https://example.com"
]

app.get('/', (req,res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Mystery Website Roulette</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@6.0.0-alpha.1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-B/GM4XqrwHnWXNOWMbloTmrYXZg10cakYGmpfsR/bbzQ6JAJI4ihuyADKLnBgrCe" crossorigin="anonymous">
    <script type="module" src="https://cdn.jsdelivr.net/npm/bootstrap@6.0.0-alpha.1/dist/js/bootstrap.bundle.min.js" integrity="sha384-1a/pXj49ZQ1aHEmrJ+gMw1otqoVsYwlEnlD8mIfY2TV03r20Y0CN7uqx1tQogjPL" crossorigin="anonymous"></script>
</head>
<body class="bg-dark text-light min-vh-100">
    <main class="container py-5 text-center">
        <div class="mb-5">
            <h1 style="color:blue;" class="text-danger fw-bold mb-4">Mystery Website Roulette</h1>
        </div>
        <div class="mb-4">
            <h2 style="color:green;" class="text-success mb-3">Test your luck!</h2>
        </div>
        <div class="mt-5">
            <button id="rbtn" type="button" class="btn btn-primary btn-lg w-100">Discover the website...</button>
        </div>
        <!--i dont always get shit on my parents, but when i do, i dont know what to do-->
    </main>
</body>
<script>
    const btn = document.getElementById("rbtn");

    btn.addEventListener('click', () => {
        window.location = "/redirect"
    })
</script>
</html>
    `)
})
app.get('/redirect', (req,res) => {
    const choice = Math.floor(Math.random() * possibleURLs.length)
    
    res.redirect(possibleURLs[choice])
    
})


app.listen(80, () => {
    console.log('server is on http://localhost:80/')
})
