import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';

export class HaulSystem {
    constructor(jobBoard, terrain, stockpiles) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
        this.stockpiles = stockpiles;
        this.reservedTiles = new Set();
    }

    update(world, eventBus) {
        this.pruneReservations(world);
        this.dropOrphanedItems(world);
        this.postHaulJobs(world);
        for (const entityId of world.query('currentJob', 'position')) {
            const currentJob = world.getComponent(entityId, 'currentJob');
            if (currentJob.job.type !== 'haul') {
                continue;
            }
            const carrying = world.getComponent(entityId, 'carrying');
            if (carrying) {
                this.deliver(world, eventBus, entityId, currentJob, carrying);
            } else {
                this.fetch(world, entityId, currentJob);
            }
        }
    }

    pruneReservations(world) {
        const active = new Set();
        for (const entityId of world.query('carrying')) {
            const carrying = world.getComponent(entityId, 'carrying');
            if (carrying.destination) {
                active.add(`${carrying.destination.x},${carrying.destination.y}`);
            }
        }
        for (const key of this.reservedTiles) {
            if (!active.has(key)) {
                this.reservedTiles.delete(key);
            }
        }
    }

    dropOrphanedItems(world) {
        for (const entityId of world.query('carrying', 'position')) {
            const carrying = world.getComponent(entityId, 'carrying');
            const currentJob = world.getComponent(entityId, 'currentJob');
            const usedItemId = currentJob ? currentJob.job.itemId ?? currentJob.materialId : undefined;
            if (usedItemId === carrying.itemId) {
                continue;
            }
            const position = world.getComponent(entityId, 'position');
            world.addComponent(carrying.itemId, 'position', { x: position.x, y: position.y });
            if (carrying.destination) {
                this.reservedTiles.delete(`${carrying.destination.x},${carrying.destination.y}`);
            }
            world.removeComponent(entityId, 'carrying');
        }
    }

    postHaulJobs(world) {
        const pendingJobs = this.jobBoard.jobs.filter((job) => job.type === 'haul');
        let capacity = this.freeStockpileTiles(world).length - pendingJobs.length;
        for (const itemId of world.query('item', 'position')) {
            if (capacity <= 0) {
                break;
            }
            const position = world.getComponent(itemId, 'position');
            if (this.stockpiles.has(position.x, position.y)) {
                continue;
            }
            if (pendingJobs.some((job) => job.itemId === itemId)) {
                continue;
            }
            this.jobBoard.post({ type: 'haul', itemId, target: { x: position.x, y: position.y } });
            capacity--;
        }
    }

    freeStockpileTiles(world) {
        const occupied = new Set();
        for (const itemId of world.query('item', 'position')) {
            const position = world.getComponent(itemId, 'position');
            occupied.add(`${position.x},${position.y}`);
        }
        return this.stockpiles
            .list()
            .filter(
                ({ x, y }) =>
                    this.terrain.isWalkable(x, y) &&
                    !occupied.has(`${x},${y}`) &&
                    !this.reservedTiles.has(`${x},${y}`)
            );
    }

    fetch(world, entityId, currentJob) {
        const { itemId } = currentJob.job;
        const itemPosition = world.getComponent(itemId, 'position');
        if (!itemPosition) {
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
        const destination = this.nearestFreeTile(world, itemPosition);
        if (!destination) {
            this.jobBoard.complete(currentJob.job);
            world.removeComponent(entityId, 'currentJob');
            return;
        }
        this.reservedTiles.add(`${destination.x},${destination.y}`);
        world.removeComponent(itemId, 'position');
        world.addComponent(entityId, 'carrying', { itemId, destination });
        currentJob.path = null;
    }

    deliver(world, eventBus, entityId, currentJob, carrying) {
        const status = approach(
            world,
            this.terrain,
            entityId,
            currentJob,
            carrying.destination,
            'onto'
        );
        if (status === 'moving') {
            return;
        }
        const dropAt =
            status === 'arrived'
                ? carrying.destination
                : world.getComponent(entityId, 'position');
        world.addComponent(carrying.itemId, 'position', { x: dropAt.x, y: dropAt.y });
        this.reservedTiles.delete(`${carrying.destination.x},${carrying.destination.y}`);
        world.removeComponent(entityId, 'carrying');
        this.jobBoard.complete(currentJob.job);
        world.removeComponent(entityId, 'currentJob');
        if (status === 'arrived') {
            eventBus.emit(EVENTS.ITEM_STORED, { entityId, itemId: carrying.itemId });
        }
    }

    nearestFreeTile(world, position) {
        let best = null;
        let bestDistance = Infinity;
        for (const tile of this.freeStockpileTiles(world)) {
            const distance = Math.max(
                Math.abs(tile.x - position.x),
                Math.abs(tile.y - position.y)
            );
            if (distance < bestDistance) {
                bestDistance = distance;
                best = tile;
            }
        }
        return best;
    }
}
