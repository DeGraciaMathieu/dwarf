import { EVENTS } from '../events/events.js';

export class FleeSystem {
    constructor(terrain, threatField) {
        this.terrain = terrain;
        this.threatField = threatField;
    }

    update(world, eventBus) {
        const hostilePositions = world
            .query('hostile', 'position')
            .map((hostileId) => world.getComponent(hostileId, 'position'));
        const threat = this.threatField.field;

        // 'flee' (panique) et 'hold' (aux aguets) partagent le même repli vers l'abri ;
        // seul 'flee' porte la panique (marqueur + événement, malus de moral)
        for (const entityId of world.query('activity', 'worker')) {
            const activity = world.getComponent(entityId, 'activity');
            const fleeing = world.getComponent(entityId, 'fleeing');
            const retreating = activity.type === 'flee' || activity.type === 'hold';
            if (!retreating) {
                if (fleeing) {
                    world.removeComponent(entityId, 'fleeing');
                }
                continue;
            }
            if (activity.type === 'flee' && !fleeing) {
                world.addComponent(entityId, 'fleeing', {});
                eventBus.emit(EVENTS.DWARF_FLEES, { entityId });
            } else if (activity.type === 'hold' && fleeing) {
                world.removeComponent(entityId, 'fleeing');
            }
            this.retreat(world, entityId, hostilePositions, threat);
        }
    }

    retreat(world, entityId, hostilePositions, threat) {
        const position = world.getComponent(entityId, 'position');
        const refuge = this.chooseRefuge(position, threat);
        if (refuge?.stay) {
            return; // déjà hors de portée des hostiles
        }
        if (refuge?.firstStep) {
            position.x = refuge.firstStep.x;
            position.y = refuge.firstStep.y;
            return;
        }
        // aucun refuge atteignable : repli sur l'éloignement glouton
        this.stepAway(world, entityId, hostilePositions);
    }

    // refuge = case atteignable la plus proche que les hostiles ne peuvent atteindre
    // (hors case-porte elle-même, qu'on traverse sans y camper)
    chooseRefuge(position, threat) {
        if (threat[position.y][position.x] === Infinity && !this.isDoor(position.x, position.y)) {
            return { stay: true };
        }
        const { width } = this.terrain;
        const visited = new Set([position.y * width + position.x]);
        const parent = new Map();
        const queue = [position];
        let head = 0;
        while (head < queue.length) {
            const current = queue[head++];
            for (const next of this.neighbors(current.x, current.y)) {
                const key = next.y * width + next.x;
                if (visited.has(key)) {
                    continue;
                }
                visited.add(key);
                parent.set(key, current);
                if (threat[next.y][next.x] === Infinity && !this.isDoor(next.x, next.y)) {
                    return { firstStep: this.firstStep(position, next, parent) };
                }
                queue.push(next);
            }
        }
        return null;
    }

    firstStep(start, target, parent) {
        const { width } = this.terrain;
        let node = target;
        let previous = parent.get(node.y * width + node.x);
        while (!(previous.x === start.x && previous.y === start.y)) {
            node = previous;
            previous = parent.get(node.y * width + node.x);
        }
        return node;
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
                if (this.terrain.isWalkable(nx, ny)) {
                    result.push({ x: nx, y: ny });
                }
            }
        }
        return result;
    }

    isDoor(x, y) {
        return Boolean(this.terrain.tileDefinitions[this.terrain.get(x, y)].blocksHostiles);
    }

    stepAway(world, entityId, hostilePositions) {
        if (hostilePositions.length === 0) {
            return;
        }
        const position = world.getComponent(entityId, 'position');
        let best = null;
        let bestDistance = distanceToNearest(position, hostilePositions);
        for (const candidate of this.neighbors(position.x, position.y)) {
            const distance = distanceToNearest(candidate, hostilePositions);
            if (distance > bestDistance) {
                bestDistance = distance;
                best = candidate;
            }
        }
        if (best) {
            position.x = best.x;
            position.y = best.y;
        }
    }
}

function distanceToNearest(position, hostilePositions) {
    return Math.min(
        ...hostilePositions.map((hostile) =>
            Math.max(Math.abs(hostile.x - position.x), Math.abs(hostile.y - position.y))
        )
    );
}
