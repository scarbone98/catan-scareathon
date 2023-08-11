import { setGameState, drawInitialBoard, setPlayerColor, getGameState } from "./main.js";
import { drawBoard, hexHighlightData, discardCardsData } from "./canvas.js";




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

export function discardCards(newCards) {
    socket.emit('discard-cards', { roomId: getGameState().id, newCards });
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

    const areWeDiscardingCards = gameState.gameState.playersDiscardingCards.find(({ playerId }) => playerId === socket.id);

    discardCardsData.areWeDiscarding = false;
    discardCardsData.amount = 0;

    if (areWeDiscardingCards) {
        discardCardsData.areWeDiscarding = !!areWeDiscardingCards;
        discardCardsData.amount = areWeDiscardingCards.amount;
    }

    drawBoard();
});

socket.on('joined-room', (gameState) => {
    setGameState(gameState);
    setPlayerColor(gameState.players.find(({ id }) => id === socket.id)?.color);
    drawInitialBoard();
});

socket.on('dice-rolled', (gameState) => {
    setGameState(gameState);

    const diceRollAudio = document.getElementById('dice-roll');
    diceRollAudio.pause();
    diceRollAudio.currentTime = 0;
    diceRollAudio.play();

    hexHighlightData.timeout = null;
    hexHighlightData.number = gameState.gameState.diceValues[0] + gameState.gameState.diceValues[1];
    hexHighlightData.shouldHighlight = true;
    drawBoard();
});

socket.on('knight-rolled', (gameState) => {
    setGameState(gameState);
    const diceRollAudio = document.getElementById('dice-roll');
    diceRollAudio.pause();
    diceRollAudio.currentTime = 0;
    diceRollAudio.play();

    const areWeDiscardingCards = gameState.gameState.playersDiscardingCards.find(({ playerId }) => playerId === socket.id);

    if (areWeDiscardingCards) {
        discardCardsData.areWeDiscarding = !!areWeDiscardingCards;
        discardCardsData.amount = areWeDiscardingCards.amount;
    }

    drawBoard();
});

socket.emit('join-room');

