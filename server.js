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
            if (rooms[key].players.length < 4) {
                roomToJoin = key;
                break;
            }
        }

        if (!roomToJoin) {
            roomToJoin = uuidv4();
            rooms[roomToJoin] = {};
            rooms[roomToJoin].players = [{ id: socket.id, color: colors[Math.floor(Math.random() * colors.length)] }];
            rooms[roomToJoin].gameState = initializeGameState();
            rooms[roomToJoin].id = roomToJoin;
        } else if (rooms[roomToJoin].gameState.currentState === 'LOBBY') {
            // Filter out remaining colors
            colors = colors.filter(color => !rooms[roomToJoin].players.find(player => player.color === color));
            rooms[roomToJoin].players.push({ id: socket.id, color: colors[Math.floor(Math.random() * colors.length)] });
        }

        playerToRoomMap[socket.id] = roomToJoin;

        socket.join(roomToJoin);
        io.to(roomToJoin).emit('joined-room', rooms[roomToJoin]);
    });

    socket.on('start-game', (roomId) => {
        const room = rooms[roomId];
        if (!room) return;

        room.gameState.currentState = 'SETUP';
        room.gameState.playerOrder = [...room.players];
        shuffle(room.gameState.playerOrder);

        room.gameState.currentTurnIndex = 0;

        io.to(roomId).emit('update-game-state', room);
    });

    socket.on('end-turn', (id) => {
        if (!rooms[id]) return;
        const gameState = rooms[id].gameState;
        const nextTurnIndex = ((gameState.currentTurnIndex + 1) % gameState.playerOrder.length);
        rooms[id].gameState.currentTurnIndex = nextTurnIndex;
        io.to(id).emit('update-game-state', rooms[id]);
    });

    socket.on('roll-die', (gameState) => {

    });

    socket.on('make-move', (gameState) => {
        if (!rooms[gameState.id]) return;
        rooms[gameState.id].gameState = gameState;
        io.to(gameState.id).emit('update-game-state', rooms[gameState.id]);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        const roomId = playerToRoomMap[socket.id];
        if (!rooms[roomId]) return;

        rooms[roomId].players = rooms[roomId]?.players?.filter(player => player === socket.id);
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