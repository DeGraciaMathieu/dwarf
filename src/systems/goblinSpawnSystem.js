import { EVENTS } from '../events/events.js';
import { spawnFromDefinition } from '../core/spawn.js';
import { randomEdgeTile } from '../core/terrain.js';

const FIRST_SPAWN_TICK = 500;
const SPAWN_INTERVAL = 750;

export class GoblinSpawnSystem {
    constructor(terrain, goblinDefinition) {
        this.terrain = terrain;
        this.goblinDefinition = goblinDefinition;
        this.ticks = 0;
        this.nextSpawn = FIRST_SPAWN_TICK;
    }

    update(world, eventBus) {
        this.ticks++;
        if (this.ticks < this.nextSpawn) {
            return;
        }
        this.nextSpawn = this.ticks + SPAWN_INTERVAL;
        const tile = randomEdgeTile(this.terrain, { hostile: true });
        if (!tile) {
            return;
        }
        const goblinId = spawnFromDefinition(world, this.goblinDefinition, tile);
        eventBus.emit(EVENTS.GOBLIN_ARRIVED, { entityId: goblinId });
    }
}
