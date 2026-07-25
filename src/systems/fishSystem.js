import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';
import { workEffort } from './workEffort.js';
import { spawnFromDefinition } from '../core/spawn.js';

const FISH_TICKS = 40;

export class FishSystem {
    constructor(jobBoard, terrain, fishingSpots, fishDefinition) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
        this.fishingSpots = fishingSpots;
        this.fishDefinition = fishDefinition;
    }

    update(world, eventBus) {
        for (const { x, y } of this.fishingSpots.list()) {
            // vérifié au moment du post : un pont posé sur la case annule le coin de pêche
            if (this.terrain.get(x, y) === 'water' && !this.jobBoard.hasJobAt(x, y, 'fish')) {
                this.jobBoard.post({ type: 'fish', target: { x, y } });
            }
        }

        for (const entityId of world.query('currentJob', 'position')) {
            const currentJob = world.getComponent(entityId, 'currentJob');
            if (currentJob.job.type !== 'fish') {
                continue;
            }
            const status = approach(
                world,
                this.terrain,
                entityId,
                currentJob,
                currentJob.job.target,
                'adjacent'
            );
            if (status === 'unreachable') {
                this.jobBoard.markUnreachable(currentJob.job);
                world.removeComponent(entityId, 'currentJob');
                continue;
            }
            if (status !== 'arrived') {
                continue;
            }
            currentJob.progress += workEffort(world, entityId);
            if (currentJob.progress < FISH_TICKS) {
                continue;
            }
            const position = world.getComponent(entityId, 'position');
            spawnFromDefinition(world, this.fishDefinition, position);
            this.jobBoard.complete(currentJob.job);
            world.removeComponent(entityId, 'currentJob');
            eventBus.emit(EVENTS.FISH_CAUGHT, { entityId });
        }
    }
}
