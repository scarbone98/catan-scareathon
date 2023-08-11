const { shuffle } = require("./utils.js");

function getTilesArray() {

    const resourceMap = {
        BRICK: 3,
        WOOD: 4,
        SHEEP: 4,
        WHEAT: 4,
        ROCK: 3,
        DESERT: 1
    };

    const tilesArray = [];
    let remainingResources = Object.keys(resourceMap);
    while (remainingResources.length) {
        const resourceIndex = Math.floor(Math.random() * remainingResources.length);
        tilesArray.push(remainingResources[resourceIndex]);
        resourceMap[remainingResources[resourceIndex]] -= 1;
        if (resourceMap[remainingResources[resourceIndex]] <= 0) {
            delete resourceMap[remainingResources[resourceIndex]];
        }
        remainingResources = Object.keys(resourceMap);
    }

    return tilesArray;
}

function initializeGameState() {
    const currentState = 'LOBBY';
    let hexes = []; // Store hexagon positions and resource types
    let roads = []; // Store roads placed
    let settlements = [];
    let diceValues = null;
    let robberIndex = 0;
    let playersDiscardingCards = [];

    // Board setup stuff
    const tokenDistribution = shuffle([2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]);
    const arrangedTiles = getTilesArray();
    const desertIndex = arrangedTiles.indexOf('DESERT');
    robberIndex = desertIndex;


    return {
        currentState,
        hexes,
        roads,
        settlements,
        diceValues,
        robberIndex,
        desertIndex,
        tokenDistribution,
        arrangedTiles,
        playersDiscardingCards
    }
}

module.exports = {
    initializeGameState
}