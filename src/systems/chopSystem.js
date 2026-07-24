import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';
import { spawnFromDefinition } from '../core/spawn.js';

const CHOP_TICKS = 8;

export class ChopSystem {
    constructor(jobBoard, terrain, logDefinition) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
        this.logDefinition = logDefinition;
    }

    update(world, eventBus) {
        for (const entityId of world.query('currentJob', 'position')) {
            const currentJob = world.getComponent(entityId, 'currentJob');
            if (currentJob.job.type !== 'chop') {
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
            currentJob.progress++;
            if (currentJob.progress >= CHOP_TICKS) {
                this.terrain.set(target.x, target.y, 'floor');
                spawnFromDefinition(world, this.logDefinition, target);
                this.jobBoard.complete(currentJob.job);
                this.jobBoard.resetUnreachable();
                world.removeComponent(entityId, 'currentJob');
                eventBus.emit(EVENTS.TREE_CHOPPED, { entityId, x: target.x, y: target.y });
            }
        }
    }
}
