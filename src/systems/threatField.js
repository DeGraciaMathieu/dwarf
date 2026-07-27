// Carte de distance-menace : pour chaque case, le nombre de pas de cheminement
// qu'un hostile doit franchir pour l'atteindre (Infinity si inaccessible — au-delà
// d'une porte ou d'un mur). Recalculée à chaque tick, partagée par l'arbitre (danger
// réellement proche) et la fuite (choix d'un refuge) pour n'être calculée qu'une fois.
export class ThreatField {
    constructor(terrain) {
        this.terrain = terrain;
        this.field = this.emptyField();
    }

    update(world) {
        const hostilePositions = world
            .query('hostile', 'position')
            .map((hostileId) => world.getComponent(hostileId, 'position'));
        this.field = this.compute(hostilePositions);
    }

    distanceAt(x, y) {
        return this.field[y][x];
    }

    emptyField() {
        const { width, height } = this.terrain;
        return Array.from({ length: height }, () => new Array(width).fill(Infinity));
    }

    compute(hostilePositions) {
        const dist = this.emptyField();
        const queue = [];
        let head = 0;
        for (const { x, y } of hostilePositions) {
            if (dist[y][x] === Infinity) {
                dist[y][x] = 0;
                queue.push({ x, y });
            }
        }
        while (head < queue.length) {
            const { x, y } = queue[head++];
            for (const next of this.neighbors(x, y)) {
                if (dist[next.y][next.x] === Infinity) {
                    dist[next.y][next.x] = dist[y][x] + 1;
                    queue.push(next);
                }
            }
        }
        return dist;
    }

    neighbors(x, y) {
        const result = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) {
                    continue;
                }
                const nx = x + dx;
                const ny = y + dy;
                if (this.terrain.isWalkable(nx, ny, { hostile: true })) {
                    result.push({ x: nx, y: ny });
                }
            }
        }
        return result;
    }
}
