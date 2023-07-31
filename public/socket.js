import { setRoads, setSettlements } from "./main.js";
import { drawBoard } from "./canvas.js";

const socket = io.connect('/');

// Emit a move to the server
export function sendMove(move) {
    socket.emit('make-move', move);
}

// Listen for moves made by other clients
socket.on('move-made', function (move) {
    // Handle the received move
    // For example, update the game board UI based on the move details
    switch (move.type) {
        case 'PLACE_SETTLEMENT':
            console.log({ move });
            setSettlements(move.payload.settlements);
            drawBoard();
            break;
        case 'PLACE_ROAD':
            console.log({ move });
            setRoads(move.payload.roads);
            drawBoard();
            break;
        default:
            break;
    }
});