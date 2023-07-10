const url = require('url');
const http = require('http');
const dotenv = require('dotenv');
const express = require('express');
const nunjucks = require('nunjucks');
const SHA256 = require('fast-sha256');
const arrayBufferToHex = require('array-buffer-to-hex');
const { Server: WSServer } = require('ws');
const UptimeWSServer = require('./uptimeWS');
const { startServer } = require('./moomoo/moomoo');
const { getGame } = require('./moomoo/Game');
const { TextEncoder } = require('util');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT;

dotenv.config();

nunjucks.configure('views', {
  autoescape: true,
  express: app
});

const VERSION = "0.0.0a";

function format(timestamp) {
  var hours = Math.floor(timestamp / (60 * 60));
  var minutes = Math.floor((timestamp % (60 * 60)) / 60);
  var seconds = Math.floor(timestamp % 60);

  return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
}

app.get('/moomoo', (req, res) => {
  if (req.accepts('html')) {
    res.render('version.html', { version: VERSION, nodeVersion: process.version, uptime: format(process.uptime()) });
    return;
  }

  res.send('Sanctuary v${VERSION}');
});

app.get('/uptime', (req, res) => {
  if (req.accepts('html')) {
    res.redirect('/serverData');
    return;
  }

  res.send(format(process.uptime()));
});

app.get('/moomoo', (req, res) => {
  res.redirect(`${req.protocol}://moomoo.io`);
});

app.get('/api/v1/playerCount', (_req, res) => {
  let game = getGame();

  if (!game) {
    res.send(JSON.stringify({ type: "error", message: "No game active." }));
  } else {
    res.send(JSON.stringify({ type: "success", playerCount: game.clients.length }));
  }
});

app.get('/api/v1/players', (req, res) => {
  let game = getGame();

  if (!game) {
    res.send(JSON.stringify({ type: "error", message: "No game active." }));
  } else {
    let clients = [];

    for (let client of game.clients) {
      clients.push({
        clientIPHash: arrayBufferToHex(SHA256(new TextEncoder().encode(client.ip))),
        playerName: client.player?.name || "unknown",
        playerID: client.player?.id || -1
      });
    }

    res.send(JSON.stringify({ type: "success", clients: clients }));
  }
});

let wss = new WSServer({ noServer: true });
startServer(wss);

let uptimeServer = new WSServer({ noServer: true });

new UptimeWSServer(uptimeServer);

server.on('upgrade', function upgrade(request, socket, head) {
  const pathname = url.parse(request.url).pathname?.replace(/\/$/, '');

  if (pathname === '/uptimeWS') {
    uptimeServer.handleUpgrade(request, socket, head, function done(ws) {
      uptimeServer.emit('connection', ws, request);
    });
  } else if (pathname === '/bundle') {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(port || 3000, () => console.log(`Sanctuary listening at https://localhost:${port || 3000}`));
