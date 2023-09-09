// Requiring module
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Creating express object
const app = express();

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

class Game {
    constructor(id, round, players) {
        this.id = id;
        this.round = 1;
        this.players = [];
    }
}

class Player {
    constructor(id, number) {
        this.id = id;
        this.name = `Player ${number}`;
        this.choice = "";
        this.score = 0;
        this.ready = false;
    }
}

app.set( "ipaddr", "127.0.0.1" );
app.set( "port", 3000 );

let gameId = uuidv4();
const game = new Game(gameId, 0, []);

// Handling GET request
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/home.html");
});

io.sockets.on('connection', (socket) => {
    console.log('a user connected');
    let id = socket.id;

    if (game.players.length < 2) {
        if (game.players.length == 0) {
            number = 1;
        } else {
            number = 2;
        }

        let player = new Player(id, number);
        game.players.push(player);
        socket.emit('receive id', {game: game.id, player: player.id});

        socket.on('disconnect', () => {
            console.log('user disconnected');
            game.players = game.players.filter(player => player.id != socket.id);
            console.log(game.players);
        });

        socket.on('made choice', (info) => {
            console.log(info);

            let playerId = info.player;
            let choice = info.choice;

            let currentPlayer = game.players.find(p => p.id == playerId);
            currentPlayer.choice = choice;
            currentPlayer.ready = true;

            console.log(game.players);
            console.log(game.players.filter(p => p.ready == false).length);

            if (game.players.length == 2 && game.players.filter(p => p.ready == false).length == 0) {
                let winnerId = decideWinner();

                if (winnerId == "") {
                    io.emit('tie');
                } else if (playerId == winnerId) {
                    game.players.find(p => p.id == playerId).score += 1;
                    socket.emit('winner', game.players);
                    socket.broadcast.emit('loser', game.players);
                } else {
                    game.players.find(p => p.id != playerId).score += 1;
                    socket.emit('loser', game.players);
                    socket.broadcast.emit('winner', game.players);
                }

                game.players.forEach((player) => {
                    player.choice = '';
                    player.ready = false;
                });
            }
            else {
                socket.emit('waiting');
            }
        });
    } else {
        socket.emit('max players');
        socket.disconnect();
    }
});

function decideWinner() {
    let player1 = game.players[0];
    let player2 = game.players[1];

    if (player1.choice == player2.choice) {
        console.log("tie game!");
        return "";
    } else if (player1.choice == "rock" && player2.choice == "scissors") {
        console.log("player 1 win!");
        return player1.id;
    } else if (player1.choice == "paper" && player2.choice == "rock") {
        console.log("player 1 win!");
        return player1.id;
    } else if (player1.choice == "scissors" && player2.choice == "paper") {
        console.log("player 1 win!");
        return player1.id;
    } else {
        console.log("player 2 win!");
        return player2.id;
    }
}
 
// Port Number
const PORT = process.env.PORT || 3000;
 
// Server Setup
server.listen(PORT,console.log(
  `Listening on *${PORT}`));