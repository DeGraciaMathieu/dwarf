import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';
import { spawnFromDefinition } from '../core/spawn.js';
import { workEffort } from './workEffort.js';

const PLANT_TICKS = 5;
const HARVEST_TICKS = 5;

export class FarmSystem {
    constructor(jobBoard, terrain, farms, plantDefinition, produceDefinition) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
        this.farms = farms;
        this.plantDefinition = plantDefinition;
        this.produceDefinition = produceDefinition;
    }

    update(world, eventBus) {
        this.growCrops(world);
        this.postJobs(world);
        for (const entityId of world.query('currentJob', 'position')) {
            const currentJob = world.getComponent(entityId, 'currentJob');
            if (currentJob.job.type === 'plant') {
                this.plant(world, entityId, currentJob);
            } else if (currentJob.job.type === 'harvest') {
                this.harvest(world, eventBus, entityId, currentJob);
            }
        }
    }

    growCrops(world) {
        for (const cropId of world.query('crop', 'renderable')) {
            const crop = world.getComponent(cropId, 'crop');
            if (crop.growth >= crop.matureAt) {
                continue;
            }
            crop.growth++;
            if (crop.growth >= crop.matureAt) {
                const renderable = world.getComponent(cropId, 'renderable');
                renderable.glyph = this.plantDefinition.mature.glyph;
                renderable.color = this.plantDefinition.mature.color;
            }
        }
    }

    postJobs(world) {
        const cropsByTile = new Map();
        for (const cropId of world.query('crop', 'position')) {
            const position = world.getComponent(cropId, 'position');
            cropsByTile.set(`${position.x},${position.y}`, cropId);
        }
        for (const { x, y } of this.farms.list()) {
            const cropId = cropsByTile.get(`${x},${y}`);
            if (!cropId) {
                if (this.terrain.isWalkable(x, y) && !this.jobBoard.hasJobAt(x, y, 'plant')) {
                    this.jobBoard.post({ type: 'plant', target: { x, y } });
                }
                continue;
            }
            const crop = world.getComponent(cropId, 'crop');
            if (crop.growth >= crop.matureAt && !this.jobBoard.hasJobAt(x, y, 'harvest')) {
                this.jobBoard.post({ type: 'harvest', target: { x, y } });
            }
        }
    }

    plant(world, entityId, currentJob) {
        const { target } = currentJob.job;
        const status = this.workOnTile(world, entityId, currentJob, target, PLANT_TICKS);
        if (status !== 'done') {
            return;
        }
        const cropId = world.createEntity();
        world.addComponent(cropId, 'position', { x: target.x, y: target.y });
        world.addComponent(cropId, 'renderable', { ...this.plantDefinition.young });
        world.addComponent(cropId, 'crop', {
            growth: 0,
            matureAt: this.plantDefinition.growthTicks,
        });
        this.jobBoard.complete(currentJob.job);
        world.removeComponent(entityId, 'currentJob');
    }

    harvest(world, eventBus, entityId, currentJob) {
        const { target } = currentJob.job;
        const status = this.workOnTile(world, entityId, currentJob, target, HARVEST_TICKS);
        if (status !== 'done') {
            return;
        }
        const cropId = world
            .query('crop', 'position')
            .find((id) => {
                const position = world.getComponent(id, 'position');
                return position.x === target.x && position.y === target.y;
            });
        if (cropId !== undefined) {
            world.destroyEntity(cropId);
            spawnFromDefinition(world, this.produceDefinition, target);
            eventBus.emit(EVENTS.CROP_HARVESTED, { entityId });
        }
        this.jobBoard.complete(currentJob.job);
        world.removeComponent(entityId, 'currentJob');
    }

    workOnTile(world, entityId, currentJob, target, requiredTicks) {
        const status = approach(world, this.terrain, entityId, currentJob, target, 'onto');
        if (status === 'unreachable') {
            this.jobBoard.markUnreachable(currentJob.job);
            world.removeComponent(entityId, 'currentJob');
            return 'stopped';
        }
        if (status !== 'arrived') {
            return 'moving';
        }
        currentJob.progress += workEffort(world, entityId);
        return currentJob.progress >= requiredTicks ? 'done' : 'working';
    }
}
