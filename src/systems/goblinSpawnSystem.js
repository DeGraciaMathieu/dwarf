import { EVENTS } from '../events/events.js';
import { spawnFromDefinition } from '../core/spawn.js';

const FIRST_SPAWN_TICK = 500;
const SPAWN_INTERVAL = 750;
const EDGE_MARGIN = 3;

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
        const tile = this.randomEdgeTile();
        if (!tile) {
            return;
        }
        const goblinId = spawnFromDefinition(world, this.goblinDefinition, tile);
        eventBus.emit(EVENTS.GOBLIN_ARRIVED, { entityId: goblinId });
    }

    randomEdgeTile() {
        const candidates = [];
        for (let y = 0; y < this.terrain.height; y++) {
            for (let x = 0; x < this.terrain.width; x++) {
                const nearEdge =
                    x < EDGE_MARGIN ||
                    y < EDGE_MARGIN ||
                    x >= this.terrain.width - EDGE_MARGIN ||
                    y >= this.terrain.height - EDGE_MARGIN;
                if (nearEdge && this.terrain.isWalkable(x, y, { hostile: true })) {
                    candidates.push({ x, y });
                }
            }
        }
        if (candidates.length === 0) {
            return null;
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    }
}
