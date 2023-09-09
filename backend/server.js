// Requiring module
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Creating express object for the web app you are building
const app = express();

const http = require('http');

//Creates an HTTP Server for your backend
const server = http.createServer(app);

//Creates a new separate server object that will be responsible for
//  handling websockets requests
const { Server } = require("socket.io");
const io = new Server(server);

//Game class
class Game {
    constructor(id, round, players) {
        this.id = id;
        this.round = 1;
        this.players = [];
    }
}

//Player class
class Player {
    constructor(id, number) {
        this.id = id;
        this.name = `Player ${number}`;
        this.choice = "";
        this.score = 0;
        this.ready = false;
    }
}

//Something weird with socket.io and express, idk i looked this up
app.set( "ipaddr", "127.0.0.1" );
app.set( "port", 3000 );

//Playing around with Game Ids lol.
let gameId = uuidv4();
const game = new Game(gameId, 0, []);

//When a client connects to this web server, they will be returned the home.html file
//  This is what is displayed on the page.
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/home.html");
});

//When a client has loaded home.html in their browser, there is a script which
//  initializes a connection to the socket.io server we set up on line 16 in this file.
//  The code below is what runs when that connection is established.
//  This code runs every time a new browser connects to the socket.io server, creating a "web socket"
//  per say, which will then be able to pass data between clients without needing a postback
io.sockets.on('connection', (socket) => {
    console.log('a user connected');

    //We only want two people per game
    if (game.players.length < 2) {
        if (game.players.length == 0) {
            number = 1;
        } else {
            number = 2;
        }

        //Create a new instance of the Player class
        //  Using the id of the socket as the player id here made sense to me.
        //  It makes it easier to manage connections.
        let id = socket.id;
        let player = new Player(id, number);
        
        //Add the new player to the game's player list
        game.players.push(player);

        //I will rename this at some point, but there is no need for this now that
        //  the socket id and player id are the same.
        //  We may need this eventually for game id information? Maybe not.
        socket.emit('receive id', {game: game.id, player: player.id});

        //If a player disconnects, this code runs.
        socket.on('disconnect', () => {
            console.log('user disconnected');
            game.players = game.players.filter(player => player.id != socket.id);
            console.log(game.players);
        });

        //If a client sends a request with the method name of 'made choice', this code will run
        //  In code terms, a client "sends a request" by running the 'socket.emit()' method
        socket.on('made choice', (info) => {
            console.log(info);

            //More cleanup needed here, I can just grab the player Id from the socket Id
            let playerId = info.player;
            let choice = info.choice;

            //Grab the current player from the player list using the playerId
            let currentPlayer = game.players.find(p => p.id == playerId);

            //  And set their choice as well as their ready status
            currentPlayer.choice = choice;
            currentPlayer.ready = true;

            //Debugging
            console.log(game.players);
            console.log(game.players.filter(p => p.ready == false).length);

            //This code will run IFF there are two players in the game AND both players are ready
            if (game.players.length == 2 && game.players.filter(p => p.ready == false).length == 0) {
                //See decideWinner method for notes on getting the winner id.
                let winnerId = decideWinner(game.players);

                //Logic for returning results to clients
                if (winnerId == "") {
                    io.emit('tie');
                } else if (playerId == winnerId) {
                    //Handle score change
                    game.players.find(p => p.id == playerId).score += 1;

                    //Call 'winner' method for ONLY the current Player
                    socket.emit('winner', game.players);

                    //Call 'loser' method for other player
                    socket.broadcast.emit('loser', game.players);
                } else {
                    game.players.find(p => p.id != playerId).score += 1;

                    //Call 'loser' method for ONLY the current Player
                    socket.emit('loser', game.players);

                    //Call 'winner' method for other player
                    socket.broadcast.emit('winner', game.players);
                }

                //Reset player choices and ready status
                game.players.forEach((player) => {
                    player.choice = '';
                    player.ready = false;
                });
            }
            //Runs if there is only one player in the game OR
            //  If the other player is not ready
            else {
                socket.emit('waiting');
            }
        });
    } 
    //Disconnect all others
    else {
        socket.emit('max players');
        socket.disconnect();
    }
});

//Runs the logic for determining the winner of the round
function decideWinner(players) {
    let player1 = players[0];
    let player2 = players[1];

    //If the choices are the same, it's a tie.
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
    } 
    //I figured here that if the circumstance didn't fall into one of the above four categories
    //  it must be a player 2 win (please let me know if you disagree.)
    else {
        console.log("player 2 win!");
        return player2.id;
    }
}
 
// Port Number
const PORT = process.env.PORT || 3000;
 
// Server Setup
server.listen(PORT,console.log(
  `Listening on *${PORT}`));