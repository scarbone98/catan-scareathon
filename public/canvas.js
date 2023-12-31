import {
    hexes,
    gameState,
    players,
    hexSize,
    selectedCards,
    canEndTurn,
    setupState
} from "./main.js";
import { startGame, isPlayersTurn, endTurn, getPlayerWithCurrentTurn, rollDice, socket, discardCards, stealCard } from "./socket.js";


const resources = [
    { name: 'WOOD', url: 'assets/woods.png' },
    { name: 'BRICK', url: 'assets/brick.png' },
    { name: 'WHEAT', url: 'assets/wheat.png' },
    { name: 'SHEEP', url: 'assets/graveyard.png' },
    { name: 'ROCK', url: 'assets/stone.png' },
];
const resourceImages = {};

for (let { name, url } of resources) {
    const image = new Image();
    image.src = url;
    resourceImages[name] = image;
}


const resourceColors = {
    'WOOD': '#228B22',
    'BRICK': '#B22222',
    'WHEAT': '#FFD700',
    'SHEEP': '#ADFF2F',
    'ROCK': '#808080',
    'DESERT': '#000'
};

const canvas = document.getElementById('catanBoard');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const cardWidth = 50;
const cardHeight = 80;
const cardSpacing = 10;

export let hexHighlightData = {
    number: 0,
    shouldHighlight: false,
    timeout: null
}

export let discardCardsData = {
    areWeDiscarding: false,
    amount: 0
}

const buttonLocations = {};

canvas.addEventListener('pointerdown', buttonClicked);
canvas.addEventListener('pointerdown', cardClicked);
canvas.addEventListener('pointerdown', discardCardsButtonClicked);
canvas.addEventListener('pointerdown', stealCardTargetClicked);

function buttonClicked(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if the click is within the bounds of the start button
    if (gameState.currentState === "LOBBY" && x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        startGame();
    }

    // Check if the click is within the bounds of the end turn button
    else if (isPlayersTurn() && x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        if (gameState.currentState === "SETUP") {
            setupState.placedSetupRoad = false;
            setupState.placedSetupSettlement = false;
        }
        endTurn();
    } else if (isPlayersTurn() && gameState.currentState === "ROLLING-DICE" && x >= 0 && x <= 100 && y >= 110 && y <= 210) {
        rollDice();
    }
}

function cardClicked(event) {
    if (!isPlayersTurn() && !discardCardsData.areWeDiscarding) return;
    const rect = canvas.getBoundingClientRect();
    const xClick = event.clientX - rect.left;
    const yClick = event.clientY - rect.top;
    const playerCards = players.find(player => player.id === socket.id)?.cards;
    for (let i = 0; i < playerCards?.length; i++) {
        const x = (i * (cardWidth + cardSpacing)) + cardSpacing;
        const y = canvas.height - cardHeight - cardSpacing;
        if (xClick >= x && xClick <= x + cardWidth && yClick >= y && yClick <= y + cardHeight) {
            if (selectedCards[i]) {
                delete selectedCards[i];
            } else {
                selectedCards[i] = playerCards[i];
            }
            drawBoard();
        }
    }
}


function discardCardsButtonClicked(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (
        x >= buttonLocations.discardButton?.xStart && x <= buttonLocations.discardButton?.xEnd
        && y >= buttonLocations.discardButton?.yStart && y <= buttonLocations.discardButton?.yEnd
    ) {
        let playerCards = [...players.find(player => player.id === socket.id)?.cards];
        for (let key of Object.keys({ ...selectedCards })) {
            playerCards[key] = null;
            delete selectedCards[key];
        }
        playerCards = playerCards.filter(card => card);
        discardCards(playerCards);
    }
}


function stealCardTargetClicked(event) {
    if (isPlayersTurn() && gameState.currentState === "PLAYER-STEALING-CARD") {

        const rect = canvas.getBoundingClientRect();
        const xClick = event.clientX - rect.left;
        const yClick = event.clientY - rect.top;

        for (let i = 0; i < stealPlayerCardsPositions.length; i++) {
            const { startX, endX, startY, endY, playerId } = stealPlayerCardsPositions[i];
            if (xClick >= startX && xClick <= endX && yClick >= startY && yClick <= endY) {
                stealCard(playerId);
                stealPlayerCardsPositions = [];
                return;
            }
        }

    }
}


export function drawBoard() {
    // Clear the whole board
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the board
    for (let { x, y, resource, tokenValue } of hexes) {
        drawHex(x, y, resource, tokenValue);
    }

    // Highlight for whenever a dice is rolled
    if (hexHighlightData.shouldHighlight) {
        let tokenIndex = 0;
        hexes.forEach((tile, index) => {
            if (gameState.tokenDistribution[tokenIndex] === hexHighlightData.number) {  // Ensure there's a token for this tile (excludes desert)
                drawHex(tile.x, tile.y, tile.resource, tile.tokenValue, true);
                if (!hexHighlightData.timeout) {
                    hexHighlightData.timeout = setTimeout(() => {
                        hexHighlightData.timeout = null;
                        hexHighlightData.shouldHighlight = false;
                        hexHighlightData.number = 0;
                        drawBoard();
                    }, 1500);
                }
            }
            if (gameState.desertIndex !== index) {
                tokenIndex += 1;
            }
        });
    }

    // Draw robber
    for (let i = 0; i < hexes.length; i++) {
        if (i === gameState.robberIndex) {
            drawRobber(hexes[i].x, hexes[i].y);
        }
    }
    // Draw roads
    for (let { start, end, color } of gameState.roads) {
        drawRoad(start, end, color);
    }
    // Draw settlements
    for (let { x, y, color } of gameState.settlements) {
        drawSettlement(x, y, color);
    }

    // Draw dice
    if (gameState.diceValues) {
        const size = 100;  // Dice size
        const spacing = 20;  // Space between dice

        // Draw dice
        drawDice(ctx, ctx.canvas.width / 2 - size - spacing / 2 + 450, ctx.canvas.height / 1.5 - size / 2, size, gameState.diceValues[0]);
        drawDice(ctx, ctx.canvas.width / 2 + spacing / 2 + 450, ctx.canvas.height / 1.5 - size / 2, size, gameState.diceValues[1]);
        if (gameState.currentState === "ROLLING-DICE" && isPlayersTurn()) {
            drawRollDiceButton();
        }
    }

    // Draw player cards
    for (let i = 0; i < players.length; i++) {
        const currentPlayer = players[i];
        drawPlayerCard({ x: canvas.width / 2 + 300, y: 105 * i + 10 + 150, name: currentPlayer.username, color: currentPlayer.color, id: currentPlayer.id, cards: currentPlayer.cards });
    }

    // Draw buttons
    if (gameState.currentState === "LOBBY") {
        drawStartButton();
    } else if (canEndTurn()) {
        drawEndTurnButton();
    }

    // Draw player resource cards
    const playerCards = players.find(player => player.id === socket.id)?.cards;
    for (let i = 0; i < playerCards?.length; i++) {
        drawCard(playerCards[i], i);
    }

    // Discard button next to cards
    if (discardCardsData.areWeDiscarding) {
        drawDiscardButton();
    }

    // Stealing Cards prompt
    if (isPlayersTurn() && gameState.currentState === "PLAYER-STEALING-CARD") {
        drawSelectCardPrompt();
    }

    // Draw the bank
    drawBank();

}

function drawHex(x, y, resource, tokenValue, isHighlight = false) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        ctx.lineTo(
            x + hexSize * Math.cos((i * 60 + 30) * Math.PI / 180),
            y + hexSize * Math.sin((i * 60 + 30) * Math.PI / 180)
        );  // Added 30 degrees here
    }
    ctx.closePath();

    if (isHighlight) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    } else {
        ctx.fillStyle = resourceColors[resource];
    }
    ctx.fill();

    if (resourceImages[resource] && !isHighlight) {
        ctx.drawImage(resourceImages[resource], x - Math.sqrt(3) / 2 * hexSize, y - hexSize, Math.sqrt(3) / 2 * hexSize * 2, hexSize * 2);
    }
    drawToken(ctx, x, y, 26, tokenValue || '');
}


function drawDiscardButton() {
    const playerCards = players.find(player => player.id === socket.id)?.cards;
    ctx.fillStyle = '#0099ff';

    if (Object.keys(selectedCards).length !== discardCardsData.amount) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
    }

    const x = (playerCards.length * (cardWidth + cardSpacing)) + cardSpacing;
    const y = canvas.height / 1.15;

    buttonLocations.discardButton = {
        xStart: x,
        yStart: y,
        xEnd: x + 100,
        yEnd: y + 100
    };

    ctx.fillRect(x, y, 100, 100);

    ctx.font = '24px Arcade';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('Discard', x + 50, y + 50);
}

function drawPlayerCard({ x, y, name, color, id, cards }) {
    if (gameState.currentState !== "LOBBY" && id === getPlayerWithCurrentTurn().id) {
        ctx.fillStyle = "#000";
        ctx.fillRect(x - 3, y - 3, 306, 106);
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 300, 100);
    ctx.font = '18px Arcade';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(name, x + 50, y + 30);
    ctx.fillStyle = "#FFF";
    ctx.fillRect(x + 5, y + 70, 20, 25);
    ctx.fillStyle = "#000";
    if (cards.length > 7) {
        ctx.fillStyle = "red";
    }
    ctx.font = '12px Arcade';
    ctx.fillText(cards.length, x + 15, y + 85);
}

function drawCard(resource, index) {
    const x = (index * (cardWidth + cardSpacing)) + cardSpacing;
    let y = canvas.height - cardHeight - cardSpacing;

    ctx.strokeStyle = "#000";

    // If user selected card the apply style
    if (selectedCards[index]) {
        y -= 25;
        ctx.strokeStyle = "yellow";
    }

    ctx.fillStyle = resourceColors[resource];
    ctx.fillRect(x, y, cardWidth, cardHeight);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cardWidth, cardHeight);
}

function drawEndTurnButton() {
    ctx.fillStyle = '#0099ff';
    ctx.fillRect(0, 0, 100, 100);

    ctx.font = '24px Arcade';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('End Turn', 50, 50);
}

function drawStartButton() {
    ctx.fillStyle = '#0099ff';
    ctx.fillRect(0, 0, 100, 100);

    ctx.font = '24px Arcade';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('Start', 50, 50);
}

function drawRollDiceButton() {
    ctx.fillStyle = '#0099ff';
    ctx.fillRect(0, 110, 100, 100);

    ctx.font = '24px Arcade';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('Roll Dice', 50, 160);
}

function drawRobber(x, y) {
    const hexImage = new Image();
    hexImage.src = "assets/Cthan.png";
    ctx.drawImage(hexImage, x - Math.sqrt(3) / 2 * 70, y - 70, Math.sqrt(3) / 2 * 70 * 2, 70 * 2);
}


function drawRoad(start, end, color) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = 12;
    ctx.strokeStyle = color;  // Brown for the road
    ctx.stroke();
    ctx.lineWidth = 1;  // Reset lineWidth for other drawings
}

function drawSettlement(x, y, color) {
    const circleRadius = 15;
    ctx.fillStyle = color; // Gold color for the settlement
    ctx.beginPath();
    ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
    ctx.fill();
}

// DICE ROLLING START
function drawDice(ctx, x, y, size, value) {
    // Draw the square for the dice
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "black";
    ctx.strokeRect(x, y, size, size);

    const dotRadius = size * 0.1;
    const dotDistance = size * 0.25;

    // Function to draw a dot
    const drawDot = (dx, dy) => {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = "black";
        ctx.fill();
    }

    // Draw the dots based on value
    if (value === 1 || value === 3 || value === 5) {
        drawDot(size / 2, size / 2);
    }
    if (value > 1) {
        drawDot(dotDistance, dotDistance);
        drawDot(size - dotDistance, size - dotDistance);
    }
    if (value > 3) {
        drawDot(dotDistance, size - dotDistance);
        drawDot(size - dotDistance, dotDistance);
    }
    if (value === 6) {
        drawDot(size / 2, dotDistance);
        drawDot(size / 2, size - dotDistance);
    }
}

function drawToken(ctx, x, y, size, value) {
    y -= 2;
    ctx.fillStyle = (value === 6 || value === 8) ? 'gold' : 'maroon';
    ctx.font = `${size}px Arcade`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);

    const probabilities = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];

    let dotCount = probabilities[value];
    let dotRadius = 3; // or choose a suitable size

    for (let i = 0; i < dotCount; i++) {
        const centerX = x;
        const centerY = y;
        const angle = ((i / dotCount) * Math.PI * 2) + Math.PI / 2;
        const xPos = centerX + (25 / 70) * hexSize * Math.cos(angle);
        const yPos = centerY + (25 / 70) * hexSize * Math.sin(angle);
        ctx.fillStyle = (value === 6 || value === 8) ? 'gold' : 'maroon'; // or choose a color
        ctx.beginPath();
        ctx.arc(xPos, yPos, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }

}

let stealPlayerCardsPositions = [];
function drawSelectCardPrompt() {
    ctx.fillStyle = "#FFF";
    const promptWidth = 600;
    const promptHeight = 300;
    const x = canvas.width / 2 - (promptWidth / 2);
    const y = canvas.height / 2 - promptHeight;
    ctx.fillRect(x, y, promptWidth, promptHeight);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.font = '24px Arcade';
    ctx.fillText('Who do you want steal from?', x + promptWidth / 2, y + 20);

    const playerCardWidth = 200;
    const playerCardHeight = 150;
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        console.log({ player });
        ctx.font = '24px Arcade';
        ctx.fillStyle = player.color;
        const cardX = x + (playerCardWidth * i) + 5 * (i + 1);
        const cardY = y + playerCardHeight;
        ctx.fillRect(cardX, y + playerCardHeight / 2, playerCardWidth, playerCardHeight);
        ctx.fillStyle = "#000";
        ctx.textAlign = "start";
        ctx.fillText(player.username, cardX + cardWidth, cardY);
        ctx.fillStyle = "#FFF";
        ctx.fillRect(cardX + 5, cardY + cardHeight / 2, 20, 25);
        ctx.fillStyle = "#000";
        ctx.font = '12px Arcade';
        ctx.fillText(player.cards.length, cardX + 10, cardY + cardHeight / 2 + 12.5);
        stealPlayerCardsPositions.push({ startX: cardX, startY: cardY, playerId: player.id, endX: cardX + playerCardWidth, endY: cardY + cardHeight });
    }
}


function drawBank() {

    const resources = Object.keys(gameState.bank);
    resources.sort(key => key);

    ctx.fillStyle = "purple";
    const bankWidth = 350;
    const bankHeight = 150;
    const x = canvas.width - 425;
    ctx.fillRect(x, 0, bankWidth, bankHeight);

    for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        ctx.font = '24px Arcade';
        const resourceCardWidth = 50;
        const resourceCardHeight = 100;
        ctx.fillStyle = resourceColors[resource];
        const cardX = 10 * i + i * resourceCardWidth + 30 + x;
        ctx.fillRect(10 * i + i * resourceCardWidth + 30 + x, 25, resourceCardWidth, resourceCardHeight);
        ctx.fillStyle = "#FFF";
        ctx.fillRect(cardX + resourceCardWidth / 2 - 10,  resourceCardHeight / 2 + 12.5, 20, 25);
        ctx.fillStyle = "#000";
        ctx.font = '12px Arcade';
        ctx.fillText(gameState.bank[resource], cardX + resourceCardWidth / 2, resourceCardHeight / 2 + 25);
    }
}