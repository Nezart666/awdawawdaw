const { Server: WSServer } = require('ws');
const Game = require('./bundle.js');
const { IncomingMessage } = require('http');

/**
 * Gets a unique (if game is passed) id for a MooMoo.io client
 * @param {Game|null} game A game containing client IDs to skip
 * @returns {string} The generated client ID
 */
function getID(game = null) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz1234567890=-+_$%?/";

  function randString() {
    return new Array(10).fill(0).reduce((acc) => acc + alphabet[Math.floor(Math.random() * alphabet.length)], "");
  }

  let id = randString();

  if (game) {
    while (game.clients.some(client => client.id == id)) {
      id = randString();
    }
  }

  return id;
}

/**
 * Starts a MooMoo.io/Sanctuary server on an existing ws.Server
 * @param {WSServer} server The ws.Server to use
 */
function startServer(server) {
  let game = new Game();

  server.addListener("connection", (socket, req) => {
    let ip = "";

    if (process.env.BEHIND_PROXY) {
      ip = req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
    } else if (req.socket.remoteAddress) {
      ip = req.socket.remoteAddress;
    }

    game.addClient(getID(game), socket, ip);
  });
}

module.exports = {
  startServer: startServer
};
