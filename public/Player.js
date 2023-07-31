export default class Player {
    constructor(name, id) {
        this.name = name;
        this.id = id;
        this.settlements = [];
        this.cards = {
            brick: 0,
            rock: 0,
            sheep: 0,
            wheat: 0,
            wood: 0,
        }
    }
    addSettlement()
}