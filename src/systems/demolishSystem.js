import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';
import { workEffort } from './workEffort.js';

const DEMOLISH_TICKS = 8;

// exécute les jobs 'demolish' : le nain rejoint la cible et la fait disparaître.
// targetId défini → entité (meuble, atelier, objet) ; sinon → tuile intégrée
// (porte, pont) repérée par sa position.
export class DemolishSystem {
    constructor(jobBoard, terrain) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
    }

    update(world, eventBus) {
        for (const entityId of world.query('currentJob', 'position')) {
            const currentJob = world.getComponent(entityId, 'currentJob');
            if (currentJob.job.type !== 'demolish') {
                continue;
            }
            const target = this.targetPosition(world, currentJob.job);
            if (!target) {
                // la cible a disparu (déjà détruite ou emportée) : rien à démolir
                this.jobBoard.complete(currentJob.job);
                world.removeComponent(entityId, 'currentJob');
                continue;
            }
            const status = approach(world, this.terrain, entityId, currentJob, target, 'adjacent');
            if (status === 'unreachable') {
                this.jobBoard.markUnreachable(currentJob.job);
                world.removeComponent(entityId, 'currentJob');
                continue;
            }
            if (status !== 'arrived') {
                continue;
            }
            currentJob.progress += workEffort(world, entityId, currentJob.job.type);
            if (currentJob.progress >= DEMOLISH_TICKS) {
                this.demolish(world, currentJob.job, target);
                this.jobBoard.complete(currentJob.job);
                world.removeComponent(entityId, 'currentJob');
                eventBus.emit(EVENTS.DEMOLISHED, { entityId });
            }
        }
    }

    targetPosition(world, job) {
        if (job.targetId !== undefined) {
            return world.getComponent(job.targetId, 'position');
        }
        return job.target;
    }

    demolish(world, job, target) {
        if (job.targetId !== undefined) {
            world.destroyEntity(job.targetId);
            return;
        }
        const tile = this.terrain.get(target.x, target.y);
        if (tile === 'door') {
            this.terrain.set(target.x, target.y, 'floor');
        } else if (tile === 'bridge') {
            this.terrain.set(target.x, target.y, 'water');
        }
    }
}
