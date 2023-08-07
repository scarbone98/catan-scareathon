import {
    hexes,
    gameState,
    players,
    hexSize
} from "./main.js";
import { startGame, isPlayersTurn, endTurn, getPlayerWithCurrentTurn } from "./socket.js";

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

canvas.addEventListener('click', buttonClicked);

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
        endTurn();
    }
}

export function drawBoard() {
    // Clear the whole board
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the board
    for (let { x, y, resource } of hexes) {
        drawHex(x, y, resource);
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

    let tokenIndex = 0;
    // Draw tile tokens
    hexes.forEach((tile, index) => {
        if (gameState.tokenDistribution[tokenIndex] && gameState.desertIndex !== index) {  // Ensure there's a token for this tile (excludes desert)
            drawToken(ctx, tile.x, tile.y, 20, gameState.tokenDistribution[tokenIndex]);
            tokenIndex += 1;
        }
    });

    // Draw dice
    // if (diceValues) {
    //     const size = 100;  // Dice size
    //     const spacing = 20;  // Space between dice

    //     // Draw dice
    //     drawDie(ctx, ctx.canvas.width / 2 - size - spacing / 2, ctx.canvas.height / 2 - size / 2, size, diceValues[0]);
    //     drawDie(ctx, ctx.canvas.width / 2 + spacing / 2, ctx.canvas.height / 2 - size / 2, size, diceValues[1]);
    // }

    for (let i = 0; i < players.length; i++) {
        const currentPlayer = players[i];
        drawPlayerCard({ x: canvas.width / 2 + 200, y: 100 * i, name: 'test', color: currentPlayer.color, id: currentPlayer.id });
    }

    if (gameState.currentState === "LOBBY") {
        drawStartButton();
    } else if (isPlayersTurn()) {
        drawEndTurnButton();
    }

}

function drawHex(x, y, resource) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        ctx.lineTo(x + hexSize * Math.cos((i * 60 + 30) * Math.PI / 180),
            y + hexSize * Math.sin((i * 60 + 30) * Math.PI / 180));  // Added 30 degrees here
    }
    ctx.closePath();
    ctx.fillStyle = resourceColors[resource];
    ctx.fill();
}


function drawPlayerCard({ x, y, name, color, id }) {
    if (gameState.currentState !== "LOBBY" && id === getPlayerWithCurrentTurn().id) {
        ctx.fillStyle = "#000";
        ctx.fillRect(x - 3, y - 3, 106, 106);
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 100, 100);
    ctx.font = '18px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(name, x + 50, y + 30);
}

function drawEndTurnButton() {
    ctx.fillStyle = '#0099ff';
    ctx.fillRect(0, 0, 100, 100);

    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('End Turn', 50, 50);
}

function drawStartButton() {
    ctx.fillStyle = '#0099ff';
    ctx.fillRect(0, 0, 100, 100);

    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('Start', 50, 50);
}

function drawRobber(x, y) {
    const circleRadius = 15;
    ctx.fillStyle = "#FFF"; // black color for the robber
    ctx.beginPath();
    ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
}


function drawRoad(start, end, color) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = 8;
    ctx.strokeStyle = color;  // Brown for the road
    ctx.stroke();
    ctx.lineWidth = 1;  // Reset lineWidth for other drawings
}

function drawSettlement(x, y, color) {
    const circleRadius = 10;
    ctx.fillStyle = color; // Gold color for the settlement
    ctx.beginPath();
    ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
    ctx.fill();
}

// DICE ROLLING START
function drawDie(ctx, x, y, size, value) {
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
    ctx.fillStyle = (value === 6 || value === 8) ? 'red' : 'black';
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);

    const probabilities = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];

    let dotCount = probabilities[value];
    let dotRadius = 3; // or choose a suitable size
    let spacing = 8; // adjust as needed

    // Calculate starting position
    let startX = x - ((dotCount - 1) * spacing) / 2;
    let startY = y + 20; // some offset below the number

    for (let i = 0; i < dotCount; i++) {
        ctx.beginPath();
        ctx.arc(startX + i * spacing, startY, dotRadius, 0, 2 * Math.PI);
        ctx.fillStyle = 'black'; // or choose a color
        ctx.fill();
        ctx.closePath();
    }

}
