import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';
import { findPath } from '../core/pathfinding.js';

const NO_WATER_RETRY_DELAY = 50;

export class DrinkSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world, eventBus) {
        for (const entityId of world.query('noWaterAccess')) {
            const noWater = world.getComponent(entityId, 'noWaterAccess');
            noWater.cooldown--;
            if (noWater.cooldown <= 0) {
                world.removeComponent(entityId, 'noWaterAccess');
            }
        }

        for (const entityId of world.query('activity', 'thirst')) {
            const activity = world.getComponent(entityId, 'activity');
            if (activity.type !== 'drink') {
                world.removeComponent(entityId, 'drinkTarget');
                continue;
            }
            let drinkTarget = world.getComponent(entityId, 'drinkTarget');
            if (!drinkTarget) {
                drinkTarget = this.reachableBankTarget(world, entityId);
                if (!drinkTarget) {
                    // renoncement : il continuera à vivre et travailler en se déshydratant
                    world.addComponent(entityId, 'noWaterAccess', { cooldown: NO_WATER_RETRY_DELAY });
                    continue;
                }
                world.addComponent(entityId, 'drinkTarget', drinkTarget);
            }
            const status = approach(world, this.terrain, entityId, drinkTarget, drinkTarget.spot, 'onto');
            if (status === 'unreachable') {
                world.removeComponent(entityId, 'drinkTarget');
                continue;
            }
            if (status !== 'arrived') {
                continue;
            }
            const thirst = world.getComponent(entityId, 'thirst');
            thirst.value = 0;
            world.removeComponent(entityId, 'drinkTarget');
            eventBus.emit(EVENTS.DWARF_DRANK, { entityId });
        }
    }

    reachableBankTarget(world, entityId) {
        const position = world.getComponent(entityId, 'position');
        const banks = [];
        for (let y = 0; y < this.terrain.height; y++) {
            for (let x = 0; x < this.terrain.width; x++) {
                if (!this.terrain.isWalkable(x, y) || !this.touchesWater(x, y)) {
                    continue;
                }
                const distance = Math.max(Math.abs(x - position.x), Math.abs(y - position.y));
                banks.push({ x, y, distance });
            }
        }
        banks.sort((a, b) => a.distance - b.distance);
        for (const { x, y } of banks) {
            const path = findPath(this.terrain, position, { x, y });
            if (path) {
                return { spot: { x, y }, path };
            }
        }
        return null;
    }

    touchesWater(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                const inBounds =
                    nx >= 0 && nx < this.terrain.width && ny >= 0 && ny < this.terrain.height;
                if (inBounds && (dx !== 0 || dy !== 0) && this.terrain.get(nx, ny) === 'water') {
                    return true;
                }
            }
        }
        return false;
    }
}
