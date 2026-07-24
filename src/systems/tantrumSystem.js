import { EVENTS } from '../events/events.js';

const VENT_RATE = 0.3;
const SMASH_CHANCE = 0.2;

export class TantrumSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world, eventBus) {
        for (const entityId of world.query('activity', 'worker')) {
            const activity = world.getComponent(entityId, 'activity');
            const tantruming = world.getComponent(entityId, 'tantruming');
            if (activity.type !== 'tantrum') {
                if (tantruming) {
                    world.removeComponent(entityId, 'tantruming');
                    eventBus.emit(EVENTS.DWARF_CALMED, { entityId });
                }
                continue;
            }
            if (!tantruming) {
                world.addComponent(entityId, 'tantruming', {});
                eventBus.emit(EVENTS.DWARF_TANTRUM, { entityId });
            }
            const morale = world.getComponent(entityId, 'morale');
            morale.value = Math.min(morale.max, morale.value + VENT_RATE);
            this.rampage(world, eventBus, entityId);
        }
    }

    rampage(world, eventBus, entityId) {
        const position = world.getComponent(entityId, 'position');
        const dx = Math.floor(Math.random() * 3) - 1;
        const dy = Math.floor(Math.random() * 3) - 1;
        if (this.terrain.isWalkable(position.x + dx, position.y + dy)) {
            position.x += dx;
            position.y += dy;
        }
        if (Math.random() >= SMASH_CHANCE) {
            return;
        }
        const victim = world.query('item', 'position').find((itemId) => {
            const itemPosition = world.getComponent(itemId, 'position');
            const distance = Math.max(
                Math.abs(itemPosition.x - position.x),
                Math.abs(itemPosition.y - position.y)
            );
            return distance <= 1;
        });
        if (victim !== undefined) {
            world.destroyEntity(victim);
            eventBus.emit(EVENTS.ITEM_SMASHED, { entityId });
        }
    }
}
