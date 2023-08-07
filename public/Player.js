export default class Player {
    constructor(name, id) {
        this.name = name;
        this.id = id;
        this.points = 0;
        this.resources = [];
        this.devCards = [];
        this.settlements = [];
        this.cards = {
            brick: 0,
            rock: 0,
            sheep: 0,
            wheat: 0,
            wood: 0,
        }
    }
    addSettlement(x, y) {
        this.settlements.push({ x, y });
    }
    addDevCard() {

    }
    addResource() {

    }
    removeResources() {

    }
    
}