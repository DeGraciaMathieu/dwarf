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

    isWalkable(x, y, { hostile = false } = {}) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        const tile = this.tileDefinitions[this.get(x, y)];
        if (hostile && tile.blocksHostiles) {
            return false;
        }
        return tile.walkable;
    }
}

const MOUNTAIN_MIN_RATIO = 0.5;
const MOUNTAIN_MAX_RATIO = 0.75;
const MOUNTAIN_START_RATIO = 0.6;
const OUTCROP_DENSITY = 1 / 130;
const OUTCROP_FILL = 0.7;
const GROVE_DENSITY = 1 / 110;
const GROVE_FILL = 0.55;
const VEIN_DENSITY = 1 / 200;
const VEIN_FILL = 0.6;
const LAKE_DENSITY = 1 / 450;
const LAKE_FILL = 0.8;
const RIVER_START_RATIO = 0.25;
const RIVER_WIDTH = 2;
const FORD_COUNT = 2;

const GENERATION_ATTEMPTS = 20;
const MIN_CONNECTIVITY = 0.8;

export function generateTerrain(width, height, tileDefinitions) {
    let terrain;
    for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt++) {
        terrain = generateCandidate(width, height, tileDefinitions);
        if (isPlayable(terrain)) {
            return terrain;
        }
    }
    return terrain;
}

function isPlayable(terrain) {
    let floors = 0;
    for (let y = 0; y < terrain.height; y++) {
        for (let x = 0; x < terrain.width; x++) {
            if (terrain.get(x, y) === 'floor') {
                floors++;
            }
        }
    }
    const region = largestWalkableRegion(terrain);
    if (region.length / floors < MIN_CONNECTIVITY) {
        return false;
    }
    const regionSet = new Set(region.map((tile) => tile.y * terrain.width + tile.x));
    // boire est vital : la grande région doit toucher l'eau quelque part
    const drinkable = region.some(({ x, y }) => touchesTile(terrain, x, y, 'water'));
    if (!drinkable) {
        return false;
    }
    for (let y = 1; y < terrain.height - 1; y++) {
        for (let x = Math.floor(terrain.width / 2); x < terrain.width - 1; x++) {
            if (terrain.get(x, y) !== 'wall') {
                continue;
            }
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (regionSet.has((y + dy) * terrain.width + (x + dx))) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function touchesTile(terrain, x, y, type) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            const inBounds = nx >= 0 && nx < terrain.width && ny >= 0 && ny < terrain.height;
            if (inBounds && (dx !== 0 || dy !== 0) && terrain.get(nx, ny) === type) {
                return true;
            }
        }
    }
    return false;
}

function generateCandidate(width, height, tileDefinitions) {
    const boundary = mountainBoundary(width, height);
    const tiles = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => (x >= boundary[y] ? 'wall' : 'floor'))
    );

    const riverColumns = carveRiver(tiles, width, height, boundary);
    scatterPatches(tiles, width, height, boundary, {
        count: Math.max(1, Math.floor(width * height * LAKE_DENSITY)),
        minRadius: 1,
        maxRadius: 2,
        fill: LAKE_FILL,
        type: 'water',
    });
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
    scatterVeins(tiles, width, height, boundary, {
        count: Math.floor(width * height * VEIN_DENSITY),
        minRadius: 1,
        maxRadius: 2,
        fill: VEIN_FILL,
    });
    carveFords(tiles, width, height, riverColumns);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                tiles[y][x] = 'wall';
            }
        }
    }

    return new Terrain(width, height, tiles, tileDefinitions);
}

function carveRiver(tiles, width, height, boundary) {
    const columns = [];
    let x = Math.floor(width * RIVER_START_RATIO);
    for (let y = 0; y < height; y++) {
        x = Math.max(2, Math.min(boundary[y] - RIVER_WIDTH - 2, x + Math.floor(Math.random() * 3) - 1));
        columns.push(x);
        for (let dx = 0; dx < RIVER_WIDTH; dx++) {
            tiles[y][x + dx] = 'water';
        }
    }
    return columns;
}

// Percés en dernier : rien (lac, bosquet, rocher) ne doit pouvoir sceller un gué.
function carveFords(tiles, width, height, riverColumns) {
    for (let i = 1; i <= FORD_COUNT; i++) {
        const y = Math.max(
            1,
            Math.min(height - 2, Math.floor((height * i) / (FORD_COUNT + 1)))
        );
        for (let dx = -1; dx <= RIVER_WIDTH; dx++) {
            const x = riverColumns[y] + dx;
            if (x > 0 && x < width - 1) {
                tiles[y][x] = 'floor';
            }
        }
    }
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

// Veines de minerai : des amas d'ore incrustés dans la montagne (wall → ore),
// atteignables en creusant. Symétrique de scatterPatches mais côté montagne.
function scatterVeins(tiles, width, height, boundary, { count, minRadius, maxRadius, fill }) {
    for (let i = 0; i < count; i++) {
        const cy = 1 + Math.floor(Math.random() * (height - 2));
        const mountainWidth = width - 1 - boundary[cy];
        if (mountainWidth < 1) {
            continue;
        }
        const cx = boundary[cy] + Math.floor(Math.random() * mountainWidth);
        const radius = minRadius + Math.floor(Math.random() * (maxRadius - minRadius + 1));
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                const inMountain =
                    x > 0 && x < width - 1 && y > 0 && y < height - 1 && x >= boundary[y];
                if (inMountain && tiles[y][x] === 'wall' && Math.random() < fill) {
                    tiles[y][x] = 'ore';
                }
            }
        }
    }
}

const EDGE_MARGIN = 3;

export function randomEdgeTile(terrain, movement = {}) {
    const candidates = [];
    for (let y = 0; y < terrain.height; y++) {
        for (let x = 0; x < terrain.width; x++) {
            const nearEdge =
                x < EDGE_MARGIN ||
                y < EDGE_MARGIN ||
                x >= terrain.width - EDGE_MARGIN ||
                y >= terrain.height - EDGE_MARGIN;
            if (nearEdge && terrain.isWalkable(x, y, movement)) {
                candidates.push({ x, y });
            }
        }
    }
    if (candidates.length === 0) {
        return null;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
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
