import { isPlayersTurn, moveKnight, sendMove, socket } from './socket.js';
import { drawBoard } from "./canvas.js";

const canvas = document.getElementById('catanBoard');

export let gameState = {
    roads: [],
    settlements: [],
    diceValues: null,
    robberIndex: 0,
    desertIndex: 0,
    tokenDistribution: [],
    arrangedTiles: [],
    id: null,
    currentState: 'LOBBY',
    currentTurnIndex: 0,
    playerOrder: [],
    playersDiscardingCards: [],
    playersGettingRobbed: [],
    bank: {
        'WHEAT': 20,
        'BRICK': 20,
        'ROCK': 20,
        'SHEEP': 20,
        'WOOD': 20
    }
}


window.gameState = gameState;

export let players = [];

export let playerColor = 'WHITE';

export let hexes = []; // Store hexagon positions and resource types

export let diceValues = null;

export let desertIndex = 0;

export let selectedCards = {};

export const tokenDistribution = [];
export const arrangedTiles = [];

export const hexSize = 100;

const hexWidth = Math.sqrt(3) * hexSize;
const hexHeight = 2 * hexSize;
const vertDist = hexHeight * 0.75;


export function getGameState() {
    return gameState;
}


export function setGameState({ gameState: newGameState, id, players: incomingPlayers }) {
    gameState = { ...gameState, ...newGameState, id };
    players = incomingPlayers;
}

export function setPlayerColor(color) {
    playerColor = color;
}

export function drawInitialBoard() {
    // Drawing the board
    let resourceMapIndex = 0;
    let tokenIndex = 0;
    let startColOffset = 2;
    for (let row = 0; row < 5; row++) {
        let cols;
        let leftOffset = 0;
        switch (row) {
            case 0:
            case 4:
                cols = 3;
                leftOffset = -hexWidth / 2;
                break;
            case 1:
            case 3:
                cols = 4;
                leftOffset = -hexWidth / 4;
                break;
            case 2:
                cols = 5;
                break;
        }

        for (let col = 0; col < cols; col++) {
            const x = (col * 1.33 + startColOffset) * hexWidth * .75 + leftOffset + 200;
            const y = vertDist * row * 0.75
                * 1.25 + 100;
            const resource = gameState.arrangedTiles[resourceMapIndex];
            hexes.push({ x, y, resource, tokenValue: resource === 'DESERT' ? 0 : gameState.tokenDistribution[tokenIndex] });
            if (resource !== 'DESERT') {
                tokenIndex += 1;
            }
            resourceMapIndex++;
        }

        if (row < 2) {
            startColOffset--;
        } else if (row >= 2) {
            startColOffset++;
        }
    }

    drawBoard();
}


function getHexCorners(x, y) {
    let corners = [];
    for (let i = 0; i < 6; i++) {
        corners.push({
            x: x + hexSize * Math.cos((i * 60 + 30) * Math.PI / 180),
            y: y + hexSize * Math.sin((i * 60 + 30) * Math.PI / 180)
        });
    }
    return corners;
}

function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

function isValidSettlementLocation(x, y) {
    for (let settlement of gameState.settlements) {
        const dx = x - settlement.x;
        const dy = y - settlement.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if the distance is less than two edge lengths of a hexagon
        if (distance < 1.5 * hexSize) {
            return false; // Too close to an existing settlement
        }
    }
    return true; // The location is valid
}



function getAdjacentHexes(x, y) {
    // This is nasty but we 'skip' over the desert when rendering the tokens in the hexes this will account for that
    function getTokenDistributionIndex(end) {
        let res = 0;
        for (let i = 0; i < end; i++) {
            if (hexes[i].resource === "DESERT") {
                continue;
            }
            res++;
        }
        return res;
    }

    const adjacentHexes = [];
    for (let i = 0; i < hexes.length; i++) {
        const dx = x - hexes[i].x;
        const dy = y - hexes[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 1.5 * hexSize) {
            adjacentHexes.push({ resource: hexes[i].resource, tokenNumber: gameState.tokenDistribution[getTokenDistributionIndex(i)], hexIndex: i });
        }
    }
    return adjacentHexes;
}

function hasCardsSelected(target) {
    let targetCount = {};
    switch (target) {
        case 'ROAD':
            targetCount = {
                'BRICK': 1,
                'WOOD': 1
            }
            break;
        case 'SETTLEMENT':
            targetCount = {
                'WHEAT': 1,
                'SHEEP': 1,
                'BRICK': 1,
                'WOOD': 1
            }
            break
        case 'CITY':
            targetCount = {
                'WHEAT': 2,
                'ROCK': 3
            }
            break
        case 'DEV_CARD':
            targetCount = {
                'SHEEP': 1,
                'ROCK': 1,
                'WHEAT': 1
            }
            break
    }

    for (let cardValue of Object.values(selectedCards)) {
        if (targetCount[cardValue]) {
            targetCount[cardValue] -= 1;
        } else {
            return false;
        }
    }
    return Object.values(targetCount).reduce((partialSum, a) => partialSum + a, 0) === 0;
}

export function canEndTurn() {
    if (isPlayersTurn() && gameState.currentState === "SETUP" && (!setupState.placedSetupRoad || !setupState.placedSetupSettlement)) {
        return false;
    }
    // Knight roll can't skip stealing and placing knight
    if (isPlayersTurn() && (gameState.currentState === "PLAYER-STEALING-CARD" || gameState.currentState === "PLAYER-TURN-KNIGHT")) {
        return false;
    }
    return isPlayersTurn();
}


export const setupState = {
    placedSetupRoad: false,
    placedSetupSettlement: false
}

// SETTLEMENT PLACEMENT
canvas.addEventListener('pointerdown', function (event) {
    if (gameState.currentState === "LOBBY" || !isPlayersTurn() || (!hasCardsSelected('SETTLEMENT') && gameState.currentState !== "SETUP")) return;

    const x = event.clientX - canvas.offsetLeft;
    const y = event.clientY - canvas.offsetTop;

    for (let hex of hexes) {
        for (let angle of [30, 90, 150, 210, 270, 330]) {
            const cornerX = hex.x + (hexSize - 2.5) * Math.cos(degreesToRadians(angle));
            const cornerY = hex.y + (hexSize - 2.5) * Math.sin(degreesToRadians(angle));

            const dx = x - cornerX;
            const dy = y - cornerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 15) { // 15 is the threshold for corner detection
                if (isValidSettlementLocation(cornerX, cornerY)) {
                    if (gameState.currentState === "SETUP" && !setupState.placedSetupSettlement) {
                        const adjacentResources = getAdjacentHexes(cornerX, cornerY);
                        gameState.settlements.push({ x: cornerX, y: cornerY - 5, color: playerColor, adjacentResources, owner: socket.id });
                        drawBoard();
                        sendMove();
                        setupState.placedSetupSettlement = true;
                        return;
                    }
                    else if (gameState.currentState !== "SETUP") {
                        const adjacentResources = getAdjacentHexes(cornerX, cornerY);
                        gameState.settlements.push({ x: cornerX, y: cornerY, color: playerColor, adjacentResources, owner: socket.id });
                        drawBoard();
                        sendMove();
                        return;
                    } else {
                        alert('Settlements must be at least two edges apart.');
                        return;
                    }
                }
            }
        }
    }
});

// DETECT EDGE CLICK
function getEdgePoints(hex) {
    let edges = [];
    let previousPoint = null;
    for (let angle of [30, 90, 150, 210, 270, 330, 390]) {  // Note the 390 to loop back to the start
        const cornerX = hex.x + (hexSize - 2.5) * Math.cos(degreesToRadians(angle));
        const cornerY = hex.y + (hexSize - 5) * Math.sin(degreesToRadians(angle));
        if (previousPoint) {
            edges.push([previousPoint, { x: cornerX, y: cornerY }]);
        }
        previousPoint = { x: cornerX, y: cornerY };
    }
    return edges;
}

function isNearSettlement(x, y) {
    for (let settlement of gameState.settlements) {
        const dx = x - settlement.x;
        const dy = y - settlement.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 15 && playerColor === settlement.color) {  // Threshold for adjacency
            return true;
        }
    }
    return false;
}

function dot(v, w) {
    return v.x * w.x + v.y * w.y;
}

function norm(v) {
    return Math.sqrt(dot(v, v));
}

function distanceToSegmentSquared(p, v, w) {
    const l2 = Math.pow(norm({ x: w.x - v.x, y: w.y - v.y }), 2);
    if (l2 === 0) return Math.pow(norm({ x: p.x - v.x, y: p.y - v.y }), 2);
    let t = dot({ x: p.x - v.x, y: p.y - v.y }, { x: w.x - v.x, y: w.y - v.y }) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.pow(norm({ x: p.x - (v.x + t * (w.x - v.x)), y: p.y - (v.y + t * (w.y - v.y)) }), 2);
}

function distanceToSegment(p, v, w) {
    return Math.sqrt(distanceToSegmentSquared(p, v, w));
}

function isNearRoad(x, y) {
    if (isPlayersTurn() && gameState.currentState === "SETUP") return false;
    for (let road of gameState.roads) {
        const distance = distanceToSegment({ x, y }, road.start, road.end);
        if (distance < 10 && playerColor === road.color) {  // Threshold for adjacency
            return true;
        }
    }
    return false;
}


function pointToLineSegmentDistance(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    }
    else if (param > 1) {
        xx = x2;
        yy = y2;
    }
    else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// ROAD CLICKED 
const edgeClickThreshold = 5; // distance in pixels to detect click near an edge
canvas.addEventListener('pointerdown', function (event) {
    if (gameState.currentState === "LOBBY" || !isPlayersTurn() || (!hasCardsSelected('ROAD') && gameState.currentState !== "SETUP")) return;
    const x = event.clientX - canvas.offsetLeft;
    const y = event.clientY - canvas.offsetTop;

    for (let hex of hexes) {
        const edges = getEdgePoints(hex);
        for (let edge of edges) {
            const middleX = (edge[0].x + edge[1].x) / 2;
            const middleY = (edge[0].y + edge[1].y) / 2;

            const dx = x - middleX;
            const dy = y - middleY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 20) {
                if (isNearSettlement(edge[0].x, edge[0].y) || isNearSettlement(edge[1].x, edge[1].y) ||
                    isNearRoad(edge[0].x, edge[0].y) || isNearRoad(edge[1].x, edge[1].y)) {
                    if (gameState.currentState === "SETUP" && !setupState.placedSetupRoad) {
                        setupState.placedSetupRoad = true;
                        gameState.roads.push({ start: edge[0], end: edge[1], color: playerColor });
                        drawBoard();
                        sendMove();
                        return true;
                    } else if (gameState.currentState !== "SETUP") {
                        gameState.roads.push({ start: edge[0], end: edge[1], color: playerColor });
                        drawBoard();
                        sendMove();
                        return true;  // Indicate that a road was drawn
                    }
                }
            }
        }
    }
    return false;
});



// Hex clicked (for knight placement)
canvas.addEventListener('pointerdown', function (event) {
    if (gameState.currentState === "PLAYER-TURN-KNIGHT" && isPlayersTurn() && !gameState.playersDiscardingCards.length) {
        const x = event.clientX - canvas.offsetLeft;
        const y = event.clientY - canvas.offsetTop;

        for (let i = 0; i < hexes.length; i++) {
            const hex = hexes[i];
            const corners = getHexCorners(hex.x, hex.y);

            if (pointInHex(x, y, corners) && gameState.robberIndex !== i) {
                // Hexagon is clicked, perform the desired action
                moveKnight(i);
                return;
            }
        }
    }
});

function pointInHex(x, y, corners) {
    let oddNodes = false;
    let j = corners.length - 1;

    for (let i = 0; i < corners.length; i++) {
        if (
            (corners[i].y < y && corners[j].y >= y) ||
            (corners[j].y < y && corners[i].y >= y)
        ) {
            if (
                corners[i].x +
                ((y - corners[i].y) / (corners[j].y - corners[i].y)) *
                (corners[j].x - corners[i].x) <
                x
            ) {
                oddNodes = !oddNodes;
            }
        }
        j = i;
    }

    return oddNodes;
}