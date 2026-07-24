import { EVENTS } from '../events/events.js';

export class SleepSystem {
    update(world, eventBus) {
        for (const entityId of world.query('activity', 'fatigue')) {
            const activity = world.getComponent(entityId, 'activity');
            const sleeping = world.getComponent(entityId, 'sleeping');
            if (activity.type !== 'sleep') {
                if (sleeping) {
                    world.removeComponent(entityId, 'sleeping');
                    eventBus.emit(EVENTS.DWARF_WOKE, { entityId });
                }
                continue;
            }
            const fatigue = world.getComponent(entityId, 'fatigue');
            if (!sleeping) {
                world.addComponent(entityId, 'sleeping', {});
                eventBus.emit(EVENTS.DWARF_ASLEEP, { entityId });
            }
            fatigue.value = Math.max(0, fatigue.value - fatigue.recovery);
            if (fatigue.value === 0) {
                world.removeComponent(entityId, 'sleeping');
                eventBus.emit(EVENTS.DWARF_WOKE, { entityId });
            }
        }
    }
}
