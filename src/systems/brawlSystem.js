import { EVENTS } from '../events/events.js';
import { findPath } from '../core/pathfinding.js';
import { RIVAL_THRESHOLD } from './socializeSystem.js';

// exécutant de l'activité 'brawl' : le nain rejoint son rival au corps à corps
// (les coups eux-mêmes sont portés par combatSystem, à mains nues). Gère aussi la
// décroissance de la provocation (état volatil auto-réparable).
export class BrawlSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world, eventBus) {
        for (const entityId of world.query('provoked')) {
            const provoked = world.getComponent(entityId, 'provoked');
            provoked.ttl--;
            if (provoked.ttl <= 0 || !world.getComponent(provoked.by, 'position')) {
                world.removeComponent(entityId, 'provoked');
            }
        }

        for (const entityId of world.query('activity', 'worker')) {
            const activity = world.getComponent(entityId, 'activity');
            const brawling = world.getComponent(entityId, 'brawling');
            if (activity.type !== 'brawl') {
                if (brawling) {
                    world.removeComponent(entityId, 'brawling');
                }
                continue;
            }
            if (!brawling) {
                world.addComponent(entityId, 'brawling', {});
                eventBus.emit(EVENTS.DWARF_BRAWLS, { entityId });
            }
            this.approachRival(world, entityId);
        }
    }

    approachRival(world, entityId) {
        const rivalId = this.pickRival(world, entityId);
        if (rivalId === null) {
            return;
        }
        const position = world.getComponent(entityId, 'position');
        const rivalPosition = world.getComponent(rivalId, 'position');
        const distance = Math.max(
            Math.abs(rivalPosition.x - position.x),
            Math.abs(rivalPosition.y - position.y)
        );
        if (distance <= 1) {
            return;
        }
        const path = findPath(this.terrain, position, rivalPosition);
        if (path && path.length > 1) {
            position.x = path[0].x;
            position.y = path[0].y;
        }
    }

    // la victime poursuit son agresseur ; sinon l'ivrogne s'en prend de préférence à
    // un rival proche, à défaut au nain le plus proche
    pickRival(world, entityId) {
        const provoked = world.getComponent(entityId, 'provoked');
        if (provoked && world.getComponent(provoked.by, 'position')) {
            return provoked.by;
        }
        return (
            this.nearestWorker(world, entityId, true) ??
            this.nearestWorker(world, entityId, false)
        );
    }

    nearestWorker(world, entityId, rivalsOnly) {
        const position = world.getComponent(entityId, 'position');
        const relationships = world.getComponent(entityId, 'relationships');
        let nearest = null;
        let nearestDistance = Infinity;
        for (const otherId of world.query('worker', 'position')) {
            if (otherId === entityId) {
                continue;
            }
            if (rivalsOnly && (relationships?.affinities[otherId] ?? 0) > -RIVAL_THRESHOLD) {
                continue;
            }
            const other = world.getComponent(otherId, 'position');
            const distance = Math.max(
                Math.abs(other.x - position.x),
                Math.abs(other.y - position.y)
            );
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = otherId;
            }
        }
        return nearest;
    }
}
