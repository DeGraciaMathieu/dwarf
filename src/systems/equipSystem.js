import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';

const SLOTS = { weapon: 'weapon', armor: 'armor' };

export class EquipSystem {
    constructor(jobBoard, terrain) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
    }

    update(world, eventBus) {
        this.postEquipJobs(world);
        for (const entityId of world.query('currentJob', 'position')) {
            const currentJob = world.getComponent(entityId, 'currentJob');
            if (currentJob.job.type !== 'equip') {
                continue;
            }
            this.equip(world, eventBus, entityId, currentJob);
        }
    }

    postEquipJobs(world) {
        const pendingJobs = this.jobBoard.jobs.filter((job) => job.type === 'equip');
        for (const [slot, component] of Object.entries(SLOTS)) {
            if (!this.someWorkerLacks(world, slot)) {
                continue;
            }
            for (const itemId of world.query(component, 'position')) {
                if (pendingJobs.some((job) => job.itemId === itemId)) {
                    continue;
                }
                const position = world.getComponent(itemId, 'position');
                this.jobBoard.post({ type: 'equip', slot, itemId, target: { x: position.x, y: position.y } });
            }
        }
    }

    someWorkerLacks(world, slot) {
        return world.query('worker', 'equipment').some((workerId) => {
            const equipment = world.getComponent(workerId, 'equipment');
            return equipment[slot] === undefined || equipment[slot] === null;
        });
    }

    equip(world, eventBus, entityId, currentJob) {
        const { itemId, slot } = currentJob.job;
        const equipment = world.getComponent(entityId, 'equipment');
        const itemPosition = world.getComponent(itemId, 'position');
        // objet déjà pris, disparu, ou slot déjà occupé : on renonce sans se déplacer
        if (!itemPosition || !equipment || (equipment[slot] !== undefined && equipment[slot] !== null)) {
            this.jobBoard.complete(currentJob.job);
            world.removeComponent(entityId, 'currentJob');
            return;
        }
        const status = approach(world, this.terrain, entityId, currentJob, itemPosition, 'onto');
        if (status === 'unreachable') {
            this.jobBoard.markUnreachable(currentJob.job);
            world.removeComponent(entityId, 'currentJob');
            return;
        }
        if (status !== 'arrived') {
            return;
        }
        world.removeComponent(itemId, 'position');
        equipment[slot] = itemId;
        this.jobBoard.complete(currentJob.job);
        world.removeComponent(entityId, 'currentJob');
        eventBus.emit(EVENTS.DWARF_EQUIPPED, { entityId, itemId, slot });
    }
}
