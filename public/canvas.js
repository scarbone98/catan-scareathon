import {
    hexes,
    gameState,
    hexSize
} from "./main.js";

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

function isRobberOnHex(hexX, hexY) {
    const dx = hexX - robber.x;
    const dy = hexY - robber.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < 15;  // 5 pixels or some small threshold
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
