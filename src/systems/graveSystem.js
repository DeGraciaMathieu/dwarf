import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';

const ROT_THRESHOLD = 120;

export class GraveSystem {
    constructor(jobBoard, terrain, graves) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
        this.graves = graves;
        this.reservedTiles = new Set();
    }

    update(world, eventBus) {
        this.rot(world, eventBus);
        this.pruneReservations(world);
        this.postBuryJobs(world);
        for (const entityId of world.query('currentJob', 'position')) {
            const currentJob = world.getComponent(entityId, 'currentJob');
            if (currentJob.job.type !== 'bury') {
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

    rot(world, eventBus) {
        for (const corpseId of world.query('corpse')) {
            const corpse = world.getComponent(corpseId, 'corpse');
            corpse.decay++;
            if (corpse.decay >= ROT_THRESHOLD && !world.getComponent(corpseId, 'rotten')) {
                world.addComponent(corpseId, 'rotten', {});
                eventBus.emit(EVENTS.CORPSE_ROTTED, {});
            }
        }
    }

    pruneReservations(world) {
        const active = new Set();
        for (const entityId of world.query('carrying')) {
            const carrying = world.getComponent(entityId, 'carrying');
            if (carrying.destination && world.getComponent(entityId, 'currentJob')?.job.type === 'bury') {
                active.add(`${carrying.destination.x},${carrying.destination.y}`);
            }
        }
        for (const key of this.reservedTiles) {
            if (!active.has(key)) {
                this.reservedTiles.delete(key);
            }
        }
    }

    postBuryJobs(world) {
        const pendingJobs = this.jobBoard.jobs.filter((job) => job.type === 'bury');
        let capacity = this.freeGraveTiles(world).length - pendingJobs.length;
        for (const corpseId of world.query('corpse', 'position')) {
            if (capacity <= 0) {
                break;
            }
            if (pendingJobs.some((job) => job.itemId === corpseId)) {
                continue;
            }
            const position = world.getComponent(corpseId, 'position');
            this.jobBoard.post({ type: 'bury', itemId: corpseId, target: { x: position.x, y: position.y } });
            capacity--;
        }
    }

    freeGraveTiles(world) {
        const occupied = new Set();
        for (const entityId of world.query('position')) {
            if (world.getComponent(entityId, 'corpse') || world.getComponent(entityId, 'buried')) {
                const position = world.getComponent(entityId, 'position');
                occupied.add(`${position.x},${position.y}`);
            }
        }
        return this.graves
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
        const corpsePosition = world.getComponent(itemId, 'position');
        if (!corpsePosition || !world.getComponent(itemId, 'corpse')) {
            this.jobBoard.complete(currentJob.job);
            world.removeComponent(entityId, 'currentJob');
            return;
        }
        const status = approach(world, this.terrain, entityId, currentJob, corpsePosition, 'onto');
        if (status === 'unreachable') {
            this.jobBoard.markUnreachable(currentJob.job);
            world.removeComponent(entityId, 'currentJob');
            return;
        }
        if (status !== 'arrived') {
            return;
        }
        const destination = this.nearestFreeGrave(world, corpsePosition);
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
        const status = approach(world, this.terrain, entityId, currentJob, carrying.destination, 'onto');
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
            this.bury(world, carrying.itemId);
            eventBus.emit(EVENTS.CORPSE_BURIED, { entityId, x: dropAt.x, y: dropAt.y });
        }
    }

    bury(world, corpseId) {
        world.removeComponent(corpseId, 'corpse');
        world.removeComponent(corpseId, 'rotten');
        world.removeComponent(corpseId, 'item');
        world.addComponent(corpseId, 'buried', {});
    }

    nearestFreeGrave(world, position) {
        let best = null;
        let bestDistance = Infinity;
        for (const tile of this.freeGraveTiles(world)) {
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
