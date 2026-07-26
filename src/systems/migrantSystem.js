import { EVENTS } from '../events/events.js';
import { spawnFromDefinition } from '../core/spawn.js';
import { randomEdgeTile } from '../core/terrain.js';
import { assignAptitude } from './workEffort.js';

const FIRST_CHECK_TICK = 900;
const CHECK_INTERVAL = 600;
const MAX_POPULATION = 12;

export class MigrantSystem {
    constructor(terrain, dwarfDefinition) {
        this.terrain = terrain;
        this.dwarfDefinition = dwarfDefinition;
        this.ticks = 0;
        this.nextCheck = FIRST_CHECK_TICK;
    }

    update(world, eventBus) {
        this.ticks++;
        if (this.ticks < this.nextCheck) {
            return;
        }
        this.nextCheck = this.ticks + CHECK_INTERVAL;

        const population = world.query('worker').length;
        if (population === 0 || population >= MAX_POPULATION) {
            return;
        }
        const foodStock = world.query('food', 'position').length;
        if (foodStock <= population) {
            return;
        }
        const beds = world.query('bed', 'position').length;
        const arrivals = Math.min(beds >= population ? 2 : 1, MAX_POPULATION - population);

        for (let i = 0; i < arrivals; i++) {
            const tile = randomEdgeTile(this.terrain);
            if (!tile) {
                return;
            }
            const migrantId = spawnFromDefinition(world, this.dwarfDefinition, tile);
            const name = this.pickName(world);
            world.addComponent(migrantId, 'identity', { name });
            assignAptitude(world, migrantId);
            eventBus.emit(EVENTS.MIGRANT_ARRIVED, { entityId: migrantId, name });
        }
    }

    pickName(world) {
        const used = new Set(
            world.query('identity').map((id) => world.getComponent(id, 'identity').name)
        );
        const names = this.dwarfDefinition.names;
        const available = names.filter((name) => !used.has(name));
        if (available.length > 0) {
            return available[Math.floor(Math.random() * available.length)];
        }
        return `${names[Math.floor(Math.random() * names.length)]} II`;
    }
}
