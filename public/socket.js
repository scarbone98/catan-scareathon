import { setGameState, drawInitialBoard, setPlayerColor, getGameState } from "./main.js";
import { drawBoard } from "./canvas.js";

export const socket = io.connect('/');

// Emit a move to the server
export function sendMove() {
    socket.emit('make-move', getGameState());
}

export function startGame() {
    socket.emit('start-game', getGameState().id);
}

export function endTurn() {
    socket.emit('end-turn', getGameState().id);
}

export function getPlayerWithCurrentTurn() {
    const gameState = getGameState();
    if (gameState.currentState === "LOBBY") return null;
    return gameState.playerOrder[gameState.currentTurnIndex];
}


export function isPlayersTurn() {
    const gameState = getGameState();
    if (gameState.currentState === "LOBBY") return null;
    return gameState.playerOrder[gameState.currentTurnIndex].id === socket.id;
}

socket.on('update-game-state', (gameState) => {
    console.log(gameState.gameState.currentTurnIndex);
    setGameState(gameState);
    drawBoard();
});

socket.on('joined-room', (gameState) => {
    setGameState(gameState);
    setPlayerColor(gameState.players.find(({ id }) => id === socket.id).color);
    drawInitialBoard();
});

socket.emit('join-room');

