import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';
import { workEffort } from './workEffort.js';
import { nearestFreeMaterial } from './materials.js';

const BUILD_TICKS = 8;

export class BuildSystem {
    constructor(jobBoard, terrain) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
    }

    update(world, eventBus) {
        for (const entityId of world.query('currentJob', 'position')) {
            const currentJob = world.getComponent(entityId, 'currentJob');
            if (currentJob.job.type !== 'build') {
                continue;
            }
            const carrying = world.getComponent(entityId, 'carrying');
            if (carrying && carrying.itemId === currentJob.materialId) {
                this.buildWall(world, eventBus, entityId, currentJob, carrying);
            } else {
                this.fetchMaterial(world, entityId, currentJob);
            }
        }
    }

    fetchMaterial(world, entityId, currentJob) {
        let materialPosition =
            currentJob.materialId !== undefined
                ? world.getComponent(currentJob.materialId, 'position')
                : undefined;
        if (!materialPosition) {
            const position = world.getComponent(entityId, 'position');
            const material = nearestFreeMaterial(world, position, currentJob);
            if (!material) {
                this.jobBoard.markUnreachable(currentJob.job);
                world.removeComponent(entityId, 'currentJob');
                return;
            }
            currentJob.materialId = material.id;
            currentJob.path = null;
            materialPosition = material.position;
        }

        const status = approach(world, this.terrain, entityId, currentJob, materialPosition, 'onto');
        if (status === 'unreachable') {
            this.jobBoard.markUnreachable(currentJob.job);
            world.removeComponent(entityId, 'currentJob');
            return;
        }
        if (status !== 'arrived') {
            return;
        }
        world.removeComponent(currentJob.materialId, 'position');
        world.addComponent(entityId, 'carrying', { itemId: currentJob.materialId });
        currentJob.path = null;
    }

    buildWall(world, eventBus, entityId, currentJob, carrying) {
        const { target } = currentJob.job;
        const status = approach(world, this.terrain, entityId, currentJob, target, 'adjacent');
        if (status === 'unreachable') {
            const position = world.getComponent(entityId, 'position');
            world.addComponent(carrying.itemId, 'position', { x: position.x, y: position.y });
            world.removeComponent(entityId, 'carrying');
            this.jobBoard.markUnreachable(currentJob.job);
            world.removeComponent(entityId, 'currentJob');
            return;
        }
        if (status !== 'arrived') {
            return;
        }
        currentJob.progress += workEffort(world, entityId);
        if (currentJob.progress < BUILD_TICKS || this.tileOccupied(world, target)) {
            return;
        }
        world.destroyEntity(carrying.itemId);
        world.removeComponent(entityId, 'carrying');
        this.terrain.set(target.x, target.y, 'wall');
        this.jobBoard.complete(currentJob.job);
        world.removeComponent(entityId, 'currentJob');
        eventBus.emit(EVENTS.WALL_BUILT, { entityId, x: target.x, y: target.y });
    }

    tileOccupied(world, target) {
        return world.query('position').some((entityId) => {
            const position = world.getComponent(entityId, 'position');
            return position.x === target.x && position.y === target.y;
        });
    }
}
