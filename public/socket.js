import { setGameState, drawInitialBoard, setPlayerColor, getGameState } from "./main.js";
import { drawBoard, hexHighlightData } from "./canvas.js";




export let username = localStorage.getItem('username');

// Get username
while (!username) {
    username = prompt('Enter a username');
    if (username) {
        localStorage.setItem('username', username);
    }
}


export const socket = io.connect('/', {
    query: { username }
});

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

export function rollDice() {
    socket.emit('roll-dice', getGameState().id);
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
    window.gameState = gameState;
    setGameState(gameState);
    drawBoard();
});

socket.on('joined-room', (gameState) => {
    setGameState(gameState);
    setPlayerColor(gameState.players.find(({ id }) => id === socket.id).color);
    drawInitialBoard();
});

socket.on('dice-rolled', (gameState) => {
    setGameState(gameState);
    document.getElementById('dice-roll').play();
    hexHighlightData.timeout = null;
    hexHighlightData.number = gameState.gameState.diceValues[0] + gameState.gameState.diceValues[1];
    hexHighlightData.shouldHighlight = true;
    drawBoard();
});

socket.on('discard-cards', ({ amount }) => {
    console.log(amount);
});

socket.emit('join-room');

