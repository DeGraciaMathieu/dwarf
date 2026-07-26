import { EVENTS } from '../events/events.js';
import { findPath } from '../core/pathfinding.js';

const HEAL_RATE = 1.5;
const RECOVERED_AT = 8; // même seuil que la blessure : repasser au-dessus remet sur pied

// exécutant de l'activité 'heal' : un nain valide rejoint un blessé à l'infirmerie et
// restaure sa santé ; un lit accélère la guérison. Franchi le seuil, la blessure est
// retirée. Sans état durable : la cible est recalculée chaque tick (auto-réparable).
export class HealSystem {
    constructor(terrain, infirmary) {
        this.terrain = terrain;
        this.infirmary = infirmary;
    }

    update(world, eventBus) {
        for (const entityId of world.query('activity', 'worker', 'position')) {
            if (world.getComponent(entityId, 'activity').type !== 'heal') {
                continue;
            }
            const woundedId = this.nearestWoundedInInfirmary(world, entityId);
            if (woundedId === null) {
                continue;
            }
            this.tend(world, eventBus, entityId, woundedId);
        }
    }

    tend(world, eventBus, healerId, woundedId) {
        const healer = world.getComponent(healerId, 'position');
        const wounded = world.getComponent(woundedId, 'position');
        const distance = Math.max(
            Math.abs(healer.x - wounded.x),
            Math.abs(healer.y - wounded.y)
        );
        if (distance > 1) {
            const path = findPath(this.terrain, healer, wounded);
            if (path && path.length > 1) {
                healer.x = path[0].x;
                healer.y = path[0].y;
            }
            return;
        }
        const health = world.getComponent(woundedId, 'health');
        const bed = this.bedAt(world, wounded);
        const recovery = bed ? HEAL_RATE * bed.recoveryMultiplier : HEAL_RATE;
        health.value = Math.min(health.max, health.value + recovery);
        if (health.value > RECOVERED_AT) {
            world.removeComponent(woundedId, 'injury');
            eventBus.emit(EVENTS.DWARF_HEALED, { entityId: woundedId });
        }
    }

    nearestWoundedInInfirmary(world, healerId) {
        const healer = world.getComponent(healerId, 'position');
        let nearest = null;
        let nearestDistance = Infinity;
        for (const woundedId of world.query('injury', 'position')) {
            const position = world.getComponent(woundedId, 'position');
            if (!this.infirmary.has(position.x, position.y)) {
                continue;
            }
            const distance = Math.max(
                Math.abs(position.x - healer.x),
                Math.abs(position.y - healer.y)
            );
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = woundedId;
            }
        }
        return nearest;
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
