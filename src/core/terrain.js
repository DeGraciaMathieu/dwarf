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

const MOUNTAIN_MIN_RATIO = 0.5;
const MOUNTAIN_MAX_RATIO = 0.75;
const MOUNTAIN_START_RATIO = 0.6;
const OUTCROP_DENSITY = 1 / 130;
const OUTCROP_FILL = 0.7;
const GROVE_DENSITY = 1 / 110;
const GROVE_FILL = 0.55;

export function generateTerrain(width, height, tileDefinitions) {
    const boundary = mountainBoundary(width, height);
    const tiles = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => (x >= boundary[y] ? 'wall' : 'floor'))
    );

    scatterPatches(tiles, width, height, boundary, {
        count: Math.floor(width * height * OUTCROP_DENSITY),
        minRadius: 1,
        maxRadius: 2,
        fill: OUTCROP_FILL,
        type: 'wall',
    });
    scatterPatches(tiles, width, height, boundary, {
        count: Math.floor(width * height * GROVE_DENSITY),
        minRadius: 1,
        maxRadius: 2,
        fill: GROVE_FILL,
        type: 'tree',
    });

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                tiles[y][x] = 'wall';
            }
        }
    }

    return new Terrain(width, height, tiles, tileDefinitions);
}

function mountainBoundary(width, height) {
    const min = Math.floor(width * MOUNTAIN_MIN_RATIO);
    const max = Math.floor(width * MOUNTAIN_MAX_RATIO);
    let x = Math.floor(width * MOUNTAIN_START_RATIO);
    const boundary = [];
    for (let y = 0; y < height; y++) {
        boundary.push(x);
        x = Math.max(min, Math.min(max, x + Math.floor(Math.random() * 3) - 1));
    }
    return boundary;
}

function scatterPatches(tiles, width, height, boundary, { count, minRadius, maxRadius, fill, type }) {
    for (let i = 0; i < count; i++) {
        const cy = 1 + Math.floor(Math.random() * (height - 2));
        const plainWidth = boundary[cy] - 2;
        if (plainWidth < 1) {
            continue;
        }
        const cx = 1 + Math.floor(Math.random() * plainWidth);
        const radius = minRadius + Math.floor(Math.random() * (maxRadius - minRadius + 1));
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                const inPlain = x > 0 && y > 0 && y < height - 1 && x < boundary[y];
                if (inPlain && tiles[y][x] === 'floor' && Math.random() < fill) {
                    tiles[y][x] = type;
                }
            }
        }
    }
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
