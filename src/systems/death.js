import { EVENTS } from '../events/events.js';
import { spawnFromDefinition } from '../core/spawn.js';

export function kill(world, eventBus, jobBoard, corpseDefinition, targetId, { cause, killerId } = {}) {
    const isDwarf = world.getComponent(targetId, 'worker') !== undefined;
    if (isDwarf) {
        const position = world.getComponent(targetId, 'position');
        const currentJob = world.getComponent(targetId, 'currentJob');
        if (currentJob) {
            jobBoard.release(currentJob.job);
        }
        const carrying = world.getComponent(targetId, 'carrying');
        if (carrying) {
            world.addComponent(carrying.itemId, 'position', { x: position.x, y: position.y });
        }
        spawnFromDefinition(world, corpseDefinition, position);
        const identity = world.getComponent(targetId, 'identity');
        eventBus.emit(EVENTS.DWARF_DIED, {
            name: identity?.name ?? 'Un nain',
            x: position.x,
            y: position.y,
            cause,
        });
    } else {
        eventBus.emit(EVENTS.GOBLIN_SLAIN, { killerId });
    }
    world.destroyEntity(targetId);
}
