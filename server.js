const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { initializeGameState } = require('./game-server');
const { shuffle } = require("./utils.js");

const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
    cors: {
        origin: '*'
    }
});


app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
const playerToRoomMap = {};

io.on('connection', (socket) => {
    console.log('a player connected');

    socket.on('join-room', () => {
        let colors = ['RED', 'BLUE', 'GREEN', 'ORANGE'];

        let roomToJoin = null;
        for (let key of Object.keys(rooms)) {
            if (rooms[key].players.length < 4 && rooms[roomToJoin].gameState.currentState === 'LOBBY') {
                roomToJoin = key;
                break;
            }
        }

        if (!roomToJoin) {
            roomToJoin = uuidv4();
            rooms[roomToJoin] = {};
            rooms[roomToJoin].players = [{
                id: socket.id,
                username: socket.handshake.query.username || 'unknown',
                color: colors[Math.floor(Math.random() * colors.length)],
                cards: []
            }];
            rooms[roomToJoin].gameState = initializeGameState();
            rooms[roomToJoin].id = roomToJoin;

        } else if (rooms[roomToJoin].gameState.currentState === 'LOBBY') {
            // Filter out remaining colors
            colors = colors.filter(color => !rooms[roomToJoin].players.find(player => player.color === color));
            rooms[roomToJoin].players.push({
                id: socket.id,
                username: socket.handshake.query.username || 'unknown',
                color: colors[Math.floor(Math.random() * colors.length)],
                cards: []
            });
        }

        playerToRoomMap[socket.id] = roomToJoin;

        socket.join(roomToJoin);
        io.to(roomToJoin).emit('joined-room', rooms[roomToJoin]);
    });

    socket.on('start-game', (roomId) => {
        const room = rooms[roomId];
        if (!room) return;

        room.gameState.currentState = "SETUP";
        room.gameState.setupTurnCount = 1;
        room.gameState.playerOrder = [...room.players];
        shuffle(room.gameState.playerOrder);

        room.gameState.currentTurnIndex = 0;
        room.gameState.diceValues = [1, 1];

        io.to(roomId).emit('update-game-state', room);
    });

    socket.on('end-turn', (id) => {
        if (!rooms[id]) return;
        const gameState = rooms[id].gameState;
        const room = rooms[id];

        if (gameState.currentState === "SETUP") {
            if (gameState.setupTurnCount === room.players.length * 2) {
                room.gameState.currentState = "ROLLING-DICE";
                room.gameState.diceValues = [1, 1];
                room.gameState.currentTurnIndex = 0;
            } else {
                if (room.gameState.setupTurnCount === room.players.length) {
                    room.gameState.currentTurnIndex = room.gameState.currentTurnIndex;
                }
                else if (room.gameState.setupTurnCount > room.players.length) {
                    room.gameState.currentTurnIndex = Math.max(room.gameState.currentTurnIndex - 1, 0);
                }
                else {
                    room.gameState.currentTurnIndex = room.gameState.currentTurnIndex + 1;
                }
                room.gameState.setupTurnCount += 1;
            }
            io.to(id).emit('update-game-state', room);
            return;
        }

        const nextTurnIndex = ((gameState.currentTurnIndex + 1) % gameState.playerOrder.length);

        room.gameState.currentTurnIndex = nextTurnIndex;
        room.gameState.diceValues = [1, 1];
        room.gameState.currentState = "ROLLING-DICE";
        io.to(id).emit('update-game-state', room);
    });

    socket.on('roll-dice', (id) => {
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        rooms[id].gameState.diceValues = [dice1, dice2];
        rooms[id].gameState.currentState = "PLAYER-TURN";

        const playerToCardsMap = {};

        const rolledNumber = dice1 + dice2;
        // const rolledNumber = 7;


        // KNIGHT
        if (rolledNumber === 7) {
            rooms[id].gameState.currentState = "PLAYER-TURN-KNIGHT";
            const playersDiscardingCards = [];
            for (let player of rooms[id].players) {
                if (player.cards.length > 7) {
                    playersDiscardingCards.push({ amount: Math.floor(player.cards.length / 2), playerId: player.id });
                }
            }
            rooms[id].gameState.playersDiscardingCards = playersDiscardingCards;
            io.to(id).emit('knight-rolled', rooms[id]);
            return;
        }

        for (let settlement of rooms[id].gameState.settlements) {
            for (let adjacentResouce of settlement.adjacentResources) {
                if (adjacentResouce.tokenNumber === rolledNumber) {
                    if (!playerToCardsMap[settlement.owner]) {
                        playerToCardsMap[settlement.owner] = [];
                    }
                    if (adjacentResouce.resource !== "DESERT") {
                        playerToCardsMap[settlement.owner].push(adjacentResouce.resource);
                    }
                }
            }
        }

        for (let key of Object.keys(playerToCardsMap)) {
            const player = rooms[id].players.find(({ id }) => id === key);
            if (player) {
                player.cards = [...player.cards, ...playerToCardsMap[key]];
            }
        }

        io.to(id).emit('dice-rolled', rooms[id]);
    });

    socket.on('make-move', (gameState) => {
        if (!rooms[gameState.id]) return;
        rooms[gameState.id].gameState = gameState;
        io.to(gameState.id).emit('update-game-state', rooms[gameState.id]);
    });

    socket.on('discard-cards', ({ roomId, newCards }) => {
        if (!rooms[roomId]) return;
        const room = rooms[roomId];
        const player = room.players.find(player => player.id === socket.id);
        player.cards = newCards;
        room.gameState.playersDiscardingCards = room.gameState.playersDiscardingCards.filter(({ playerId }) => playerId !== socket.id);
        io.to(roomId).emit('update-game-state', room);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        const roomId = playerToRoomMap[socket.id];
        if (!rooms[roomId]) return;

        rooms[roomId].players = rooms[roomId]?.players?.filter(player => player.id !== socket.id);
        rooms[roomId].gameState.playerOrder = rooms[roomId].gameState?.playerOrder?.filter(player => player.id !== socket.id);

        if (rooms[roomId].players.length <= 0) {
            delete rooms[roomId];
        } else {
            io.to(roomId).emit('update-game-state', rooms[roomId]);
        }
    });

});

const port = process.env.PORT || 4000;

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});