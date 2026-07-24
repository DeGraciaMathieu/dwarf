import { findPath } from '../core/pathfinding.js';

export class HostileSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world) {
        const targets = world.query('worker', 'position');
        for (const hostileId of world.query('hostile', 'position')) {
            const hostile = world.getComponent(hostileId, 'hostile');
            const position = world.getComponent(hostileId, 'position');

            let nearest = null;
            let nearestDistance = Infinity;
            for (const targetId of targets) {
                const targetPosition = world.getComponent(targetId, 'position');
                const distance = Math.max(
                    Math.abs(targetPosition.x - position.x),
                    Math.abs(targetPosition.y - position.y)
                );
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = targetPosition;
                }
            }

            const chasing = nearest !== null && nearestDistance <= hostile.visionRange;
            this.setActivity(world, hostileId, chasing ? 'chase' : 'wander');
            if (!chasing) {
                continue;
            }
            const path = findPath(this.terrain, position, nearest);
            if (path && path.length > 0) {
                position.x = path[0].x;
                position.y = path[0].y;
            }
        }
    }

    setActivity(world, entityId, type) {
        const activity = world.getComponent(entityId, 'activity');
        if (activity) {
            activity.type = type;
        } else {
            world.addComponent(entityId, 'activity', { type });
        }
    }
}
