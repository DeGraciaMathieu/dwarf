import { EVENTS } from '../events/events.js';
import { kill } from './death.js';

const HEALTH_DECAY = 0.15;
const MORALE_DECAY = 0.2;

export class StarvationSystem {
    constructor(jobBoard, corpseDefinition) {
        this.jobBoard = jobBoard;
        this.corpseDefinition = corpseDefinition;
    }

    update(world, eventBus) {
        for (const entityId of world.query('hunger', 'health')) {
            const hunger = world.getComponent(entityId, 'hunger');
            const starving = world.getComponent(entityId, 'starving');
            if (hunger.value < hunger.max) {
                if (starving) {
                    world.removeComponent(entityId, 'starving');
                }
                continue;
            }
            if (!starving) {
                world.addComponent(entityId, 'starving', {});
                eventBus.emit(EVENTS.DWARF_STARVING, { entityId });
            }
            const morale = world.getComponent(entityId, 'morale');
            if (morale) {
                morale.value = Math.max(0, morale.value - MORALE_DECAY);
            }
            const health = world.getComponent(entityId, 'health');
            health.value -= HEALTH_DECAY;
            if (health.value <= 0) {
                kill(world, eventBus, this.jobBoard, this.corpseDefinition, entityId, {
                    cause: 'starvation',
                });
            }
        }
    }
}
