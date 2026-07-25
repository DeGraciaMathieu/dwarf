export class Zone {
    constructor() {
        this.tiles = new Map();
    }

    add(x, y, kind) {
        this.tiles.set(`${x},${y}`, { x, y, kind });
    }

    has(x, y) {
        return this.tiles.has(`${x},${y}`);
    }

    remove(x, y) {
        this.tiles.delete(`${x},${y}`);
    }

    list() {
        return [...this.tiles.values()];
    }
}
