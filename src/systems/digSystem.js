import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';
import { spawnFromDefinition } from '../core/spawn.js';
import { workEffort } from './workEffort.js';

const DIG_TICKS = 10;

export class DigSystem {
    constructor(jobBoard, terrain, stoneDefinition, oreDefinition) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
        this.stoneDefinition = stoneDefinition;
        this.oreDefinition = oreDefinition;
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
                const dug = this.terrain.get(target.x, target.y);
                this.terrain.set(target.x, target.y, 'floor');
                const dropped = dug === 'ore' ? this.oreDefinition : this.stoneDefinition;
                spawnFromDefinition(world, dropped, target);
                this.jobBoard.complete(currentJob.job);
                this.jobBoard.resetUnreachable();
                world.removeComponent(entityId, 'currentJob');
                eventBus.emit(EVENTS.WALL_DUG, { entityId, x: target.x, y: target.y });
            }
        }
    }
}
