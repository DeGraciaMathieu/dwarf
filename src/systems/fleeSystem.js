import { EVENTS } from '../events/events.js';

export class FleeSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world, eventBus) {
        const hostilePositions = world
            .query('hostile', 'position')
            .map((hostileId) => world.getComponent(hostileId, 'position'));

        for (const entityId of world.query('activity', 'worker')) {
            const activity = world.getComponent(entityId, 'activity');
            const fleeing = world.getComponent(entityId, 'fleeing');
            if (activity.type !== 'flee') {
                if (fleeing) {
                    world.removeComponent(entityId, 'fleeing');
                }
                continue;
            }
            if (!fleeing) {
                world.addComponent(entityId, 'fleeing', {});
                eventBus.emit(EVENTS.DWARF_FLEES, { entityId });
            }
            this.stepAway(world, entityId, hostilePositions);
        }
    }

    stepAway(world, entityId, hostilePositions) {
        if (hostilePositions.length === 0) {
            return;
        }
        const position = world.getComponent(entityId, 'position');
        let best = null;
        let bestDistance = distanceToNearest(position, hostilePositions);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) {
                    continue;
                }
                const candidate = { x: position.x + dx, y: position.y + dy };
                if (!this.terrain.isWalkable(candidate.x, candidate.y)) {
                    continue;
                }
                const distance = distanceToNearest(candidate, hostilePositions);
                if (distance > bestDistance) {
                    bestDistance = distance;
                    best = candidate;
                }
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
