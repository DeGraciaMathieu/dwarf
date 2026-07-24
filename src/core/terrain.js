export class Terrain {
    constructor(width, height, tiles, tileDefinitions) {
        this.width = width;
        this.height = height;
        this.tiles = tiles;
        this.tileDefinitions = tileDefinitions;
    }

    get(x, y) {
        return this.tiles[y][x];
    }

    set(x, y, type) {
        this.tiles[y][x] = type;
    }

    isWalkable(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        return this.tileDefinitions[this.get(x, y)].walkable;
    }
}

const WALL_CHANCE = 0.38;
const SMOOTHING_PASSES = 4;
const TREE_CHANCE = 0.04;

export function generateTerrain(width, height, tileDefinitions) {
    let tiles = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => (Math.random() < WALL_CHANCE ? 'wall' : 'floor'))
    );

    for (let pass = 0; pass < SMOOTHING_PASSES; pass++) {
        tiles = smooth(tiles, width, height);
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
            if (isBorder) {
                tiles[y][x] = 'wall';
            } else if (tiles[y][x] === 'floor' && Math.random() < TREE_CHANCE) {
                tiles[y][x] = 'tree';
            }
        }
    }

    return new Terrain(width, height, tiles, tileDefinitions);
}

export function largestWalkableRegion(terrain) {
    const visited = new Set();
    let largest = [];
    for (let y = 0; y < terrain.height; y++) {
        for (let x = 0; x < terrain.width; x++) {
            if (visited.has(y * terrain.width + x) || !terrain.isWalkable(x, y)) {
                continue;
            }
            const region = floodFill(terrain, x, y, visited);
            if (region.length > largest.length) {
                largest = region;
            }
        }
    }
    return largest;
}

function floodFill(terrain, startX, startY, visited) {
    const region = [];
    const stack = [{ x: startX, y: startY }];
    visited.add(startY * terrain.width + startX);
    while (stack.length > 0) {
        const { x, y } = stack.pop();
        region.push({ x, y });
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                const key = ny * terrain.width + nx;
                if (!visited.has(key) && terrain.isWalkable(nx, ny)) {
                    visited.add(key);
                    stack.push({ x: nx, y: ny });
                }
            }
        }
    }
    return region;
}

function smooth(tiles, width, height) {
    return tiles.map((row, y) =>
        row.map((_, x) => (countWallNeighbors(tiles, width, height, x, y) >= 5 ? 'wall' : 'floor'))
    );
}

function countWallNeighbors(tiles, width, height, x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) {
                continue;
            }
            const nx = x + dx;
            const ny = y + dy;
            const outOfBounds = nx < 0 || nx >= width || ny < 0 || ny >= height;
            if (outOfBounds || tiles[ny][nx] === 'wall') {
                count++;
            }
        }
    }
    return count;
}
