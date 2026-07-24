const NEIGHBORS = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
];

export function findPath(terrain, from, to) {
    if (!terrain.isWalkable(to.x, to.y)) {
        return null;
    }
    const key = (x, y) => y * terrain.width + x;
    const goalKey = key(to.x, to.y);
    const startKey = key(from.x, from.y);
    if (startKey === goalKey) {
        return [];
    }

    const open = new Map([[startKey, { x: from.x, y: from.y, g: 0, f: heuristic(from, to) }]]);
    const cameFrom = new Map();
    const closed = new Set();

    while (open.size > 0) {
        let currentKey = null;
        let current = null;
        for (const [candidateKey, node] of open) {
            if (!current || node.f < current.f) {
                current = node;
                currentKey = candidateKey;
            }
        }
        if (currentKey === goalKey) {
            return reconstructPath(cameFrom, current, key, startKey);
        }
        open.delete(currentKey);
        closed.add(currentKey);

        for (const [dx, dy] of NEIGHBORS) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            if (!terrain.isWalkable(nx, ny)) {
                continue;
            }
            const neighborKey = key(nx, ny);
            if (closed.has(neighborKey)) {
                continue;
            }
            const g = current.g + 1;
            const existing = open.get(neighborKey);
            if (!existing || g < existing.g) {
                open.set(neighborKey, {
                    x: nx,
                    y: ny,
                    g,
                    f: g + heuristic({ x: nx, y: ny }, to),
                });
                cameFrom.set(neighborKey, current);
            }
        }
    }
    return null;
}

function heuristic(from, to) {
    return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
}

function reconstructPath(cameFrom, goalNode, key, startKey) {
    const path = [];
    let node = goalNode;
    while (node && key(node.x, node.y) !== startKey) {
        path.push({ x: node.x, y: node.y });
        node = cameFrom.get(key(node.x, node.y));
    }
    return path.reverse();
}
