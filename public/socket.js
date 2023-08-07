import { setGameState, drawInitialBoard, setPlayerColor, getGameState } from "./main.js";
import { drawBoard } from "./canvas.js";

const socket = io.connect('/');

// Emit a move to the server
export function sendMove() {
    socket.emit('make-move', getGameState());
}

// // Listen for moves made by other clients
// socket.on('move-made', function (move) {
//     // Handle the received move
//     // For example, update the game board UI based on the move details
//     switch (move.type) {
//         case 'PLACE_SETTLEMENT':
//             console.log({ move });
//             setSettlements(move.payload.settlements);
//             drawBoard();
//             break;
//         case 'PLACE_ROAD':
//             console.log({ move });
//             setRoads(move.payload.roads);
//             drawBoard();
//             break;
//         default:
//             break;
//     }
// });


socket.on('update-game-state', (gameState) => {
    setGameState(gameState);
    drawBoard();
});

socket.on('joined-room', (gameState) => {
    setGameState(gameState);
    setPlayerColor(gameState.players.find(({ id }) => id === socket.id).color);
    drawInitialBoard();
});

socket.emit('join-room');

