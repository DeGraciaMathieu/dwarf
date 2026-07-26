import { findPath } from '../core/pathfinding.js';

const MEMORY_TTL = 12;

export class HostileSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world) {
        const workers = world.query('worker', 'position');
        for (const hostileId of world.query('hostile', 'position')) {
            const hostile = world.getComponent(hostileId, 'hostile');
            const position = world.getComponent(hostileId, 'position');
            // un prédateur (dragon) traque tout être vivant, nains comme hostiles ;
            // les hostiles ordinaires ne visent que les nains
            const targets = world.getComponent(hostileId, 'predator')
                ? this.preyFor(world, hostileId)
                : workers;
            const { target, distance } = this.nearestTarget(world, targets, position);

            if (target && distance <= hostile.visionRange) {
                // cible en vue : on mémorise sa position et on fond dessus
                world.addComponent(hostileId, 'chaseMemory', {
                    x: target.x,
                    y: target.y,
                    ttl: MEMORY_TTL,
                });
                this.setActivity(world, hostileId, 'chase');
                if (distance > 1) {
                    this.stepToward(world, position, target);
                }
                continue;
            }

            // hors de vue : on poursuit la dernière position connue tant que le TTL tient
            const memory = world.getComponent(hostileId, 'chaseMemory');
            if (memory) {
                const reached = position.x === memory.x && position.y === memory.y;
                memory.ttl--;
                if (reached || memory.ttl <= 0) {
                    world.removeComponent(hostileId, 'chaseMemory');
                    this.setActivity(world, hostileId, 'wander');
                    continue;
                }
                this.setActivity(world, hostileId, 'chase');
                this.stepToward(world, position, memory);
                continue;
            }

            this.setActivity(world, hostileId, 'wander');
        }
    }

    // proies d'un prédateur : tout ce qui a de la vie, sauf lui-même et les autres prédateurs
    preyFor(world, predatorId) {
        return world
            .query('health', 'position')
            .filter((id) => id !== predatorId && !world.getComponent(id, 'predator'));
    }

    nearestTarget(world, targets, position) {
        let target = null;
        let distance = Infinity;
        for (const targetId of targets) {
            const targetPosition = world.getComponent(targetId, 'position');
            const candidateDistance = Math.max(
                Math.abs(targetPosition.x - position.x),
                Math.abs(targetPosition.y - position.y)
            );
            if (candidateDistance < distance) {
                distance = candidateDistance;
                target = targetPosition;
            }
        }
        return { target, distance };
    }

    stepToward(world, position, destination) {
        const path = findPath(this.terrain, position, destination, { hostile: true });
        if (path && path.length > 0) {
            position.x = path[0].x;
            position.y = path[0].y;
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
