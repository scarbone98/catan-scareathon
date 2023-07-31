const express = require('express');
const http = require('http');
const socketIO  = require('socket.io');
const cors = require('cors');
const app = express();
const path = require('path');


const server = http.createServer(app);

const io = socketIO(server, {
    cors: {
        origin: '*'
    }
});


app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('make-move', (move) => {
        console.log(move);
        // Broadcasting the move to all other clients
        socket.broadcast.emit('move-made', move);
    });
});

const port = process.env.PORT || 4000;

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});