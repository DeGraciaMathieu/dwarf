import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';
import { spawnFromDefinition } from '../core/spawn.js';
import { workEffort } from './workEffort.js';

const DIG_TICKS = 10;

export class DigSystem {
    constructor(jobBoard, terrain, stoneDefinition) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
        this.stoneDefinition = stoneDefinition;
    }

    update(world, eventBus) {
        for (const entityId of world.query('currentJob', 'position')) {
            const currentJob = world.getComponent(entityId, 'currentJob');
            if (currentJob.job.type !== 'dig') {
                continue;
            }
            const { target } = currentJob.job;
            const status = approach(world, this.terrain, entityId, currentJob, target, 'adjacent');
            if (status === 'unreachable') {
                this.jobBoard.markUnreachable(currentJob.job);
                world.removeComponent(entityId, 'currentJob');
                continue;
            }
            if (status !== 'arrived') {
                continue;
            }
            currentJob.progress += workEffort(world, entityId);
            if (currentJob.progress >= DIG_TICKS) {
                this.terrain.set(target.x, target.y, 'floor');
                spawnFromDefinition(world, this.stoneDefinition, target);
                this.jobBoard.complete(currentJob.job);
                this.jobBoard.resetUnreachable();
                world.removeComponent(entityId, 'currentJob');
                eventBus.emit(EVENTS.WALL_DUG, { entityId, x: target.x, y: target.y });
            }
        }
    }
}
