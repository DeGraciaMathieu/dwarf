import { EVENTS } from '../events/events.js';
import { findPath } from '../core/pathfinding.js';

export class FightSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world, eventBus) {
        for (const entityId of world.query('activity', 'worker')) {
            const activity = world.getComponent(entityId, 'activity');
            const fighting = world.getComponent(entityId, 'fighting');
            if (activity.type !== 'fight') {
                if (fighting) {
                    world.removeComponent(entityId, 'fighting');
                }
                continue;
            }
            if (!fighting) {
                world.addComponent(entityId, 'fighting', {});
                eventBus.emit(EVENTS.DWARF_FIGHTS, { entityId });
            }
            this.engage(world, entityId);
        }
    }

    engage(world, entityId) {
        const position = world.getComponent(entityId, 'position');
        let nearest = null;
        let nearestDistance = Infinity;
        for (const hostileId of world.query('hostile', 'position')) {
            const hostilePosition = world.getComponent(hostileId, 'position');
            const distance = Math.max(
                Math.abs(hostilePosition.x - position.x),
                Math.abs(hostilePosition.y - position.y)
            );
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = hostilePosition;
            }
        }
        if (!nearest || nearestDistance <= 1) {
            return;
        }
        const path = findPath(this.terrain, position, nearest);
        if (path && path.length > 1) {
            position.x = path[0].x;
            position.y = path[0].y;
        }
    }
}
