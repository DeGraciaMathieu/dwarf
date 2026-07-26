import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';

const GROUND_HEAL = 0.2;

// qualité du lieu de repos, recalculée à chaque réveil (aucun composant stocké) :
// 'ground' (sol nu) < 'bed' (lit hors chambre) < 'room' (lit en chambre avec brasero).
export function roomQuality(world, bedrooms, position) {
    if (!bedAtTile(world, position)) {
        return 'ground';
    }
    if (bedrooms && bedrooms.has(position.x, position.y) && brazierNear(world, position)) {
        return 'room';
    }
    return 'bed';
}

function bedAtTile(world, position) {
    for (const bedId of world.query('bed', 'position')) {
        const bedPosition = world.getComponent(bedId, 'position');
        if (bedPosition.x === position.x && bedPosition.y === position.y) {
            return true;
        }
    }
    return false;
}

function brazierNear(world, position) {
    for (const sourceId of world.query('comfort', 'position')) {
        const source = world.getComponent(sourceId, 'position');
        const comfort = world.getComponent(sourceId, 'comfort');
        const distance = Math.max(
            Math.abs(source.x - position.x),
            Math.abs(source.y - position.y)
        );
        if (distance <= comfort.range) {
            return true;
        }
    }
    return false;
}

export class SleepSystem {
    constructor(terrain, bedrooms) {
        this.terrain = terrain;
        this.bedrooms = bedrooms;
    }

    update(world, eventBus) {
        for (const entityId of world.query('activity', 'fatigue')) {
            const activity = world.getComponent(entityId, 'activity');
            const sleeping = world.getComponent(entityId, 'sleeping');
            if (activity.type !== 'sleep') {
                if (sleeping) {
                    world.removeComponent(entityId, 'sleeping');
                    eventBus.emit(EVENTS.DWARF_WOKE, { entityId, rested: false });
                }
                world.removeComponent(entityId, 'bedTarget');
                continue;
            }
            if (!sleeping && this.headingToBed(world, entityId)) {
                continue;
            }
            if (!sleeping) {
                world.addComponent(entityId, 'sleeping', {});
                eventBus.emit(EVENTS.DWARF_ASLEEP, { entityId });
            }
            this.rest(world, entityId);
            const fatigue = world.getComponent(entityId, 'fatigue');
            if (fatigue.value === 0) {
                const position = world.getComponent(entityId, 'position');
                const quality = roomQuality(world, this.bedrooms, position);
                world.removeComponent(entityId, 'sleeping');
                world.removeComponent(entityId, 'bedTarget');
                eventBus.emit(EVENTS.DWARF_WOKE, {
                    entityId,
                    rested: true,
                    inBed: quality !== 'ground',
                    roomQuality: quality,
                });
            }
        }
    }

    headingToBed(world, entityId) {
        let bedTarget = world.getComponent(entityId, 'bedTarget');
        if (!bedTarget) {
            const bedId = this.findFreeBed(world, entityId);
            if (bedId === undefined) {
                return false;
            }
            bedTarget = { bedId, path: null };
            world.addComponent(entityId, 'bedTarget', bedTarget);
        }
        const bedPosition = world.getComponent(bedTarget.bedId, 'position');
        if (!bedPosition) {
            world.removeComponent(entityId, 'bedTarget');
            return false;
        }
        const status = approach(world, this.terrain, entityId, bedTarget, bedPosition, 'onto');
        if (status === 'unreachable') {
            world.removeComponent(entityId, 'bedTarget');
            return false;
        }
        return status !== 'arrived';
    }

    rest(world, entityId) {
        const fatigue = world.getComponent(entityId, 'fatigue');
        const bed = this.bedAt(world, world.getComponent(entityId, 'position'));
        const recovery = bed ? fatigue.recovery * bed.recoveryMultiplier : fatigue.recovery;
        fatigue.value = Math.max(0, fatigue.value - recovery);
        const health = world.getComponent(entityId, 'health');
        if (health && health.value < health.max) {
            health.value = Math.min(health.max, health.value + (bed ? bed.heal : GROUND_HEAL));
        }
    }

    findFreeBed(world, entityId) {
        const position = world.getComponent(entityId, 'position');
        const claimed = new Set();
        for (const otherId of world.query('bedTarget')) {
            if (otherId !== entityId) {
                claimed.add(world.getComponent(otherId, 'bedTarget').bedId);
            }
        }
        const occupied = new Set();
        for (const sleeperId of world.query('sleeping', 'position')) {
            const sleeperPosition = world.getComponent(sleeperId, 'position');
            occupied.add(`${sleeperPosition.x},${sleeperPosition.y}`);
        }
        let best;
        let bestDistance = Infinity;
        for (const bedId of world.query('bed', 'position')) {
            if (claimed.has(bedId)) {
                continue;
            }
            const bedPosition = world.getComponent(bedId, 'position');
            if (occupied.has(`${bedPosition.x},${bedPosition.y}`)) {
                continue;
            }
            const distance = Math.max(
                Math.abs(bedPosition.x - position.x),
                Math.abs(bedPosition.y - position.y)
            );
            if (distance < bestDistance) {
                bestDistance = distance;
                best = bedId;
            }
        }
        return best;
    }

    bedAt(world, position) {
        for (const bedId of world.query('bed', 'position')) {
            const bedPosition = world.getComponent(bedId, 'position');
            if (bedPosition.x === position.x && bedPosition.y === position.y) {
                return world.getComponent(bedId, 'bed');
            }
        }
        return null;
    }
}
