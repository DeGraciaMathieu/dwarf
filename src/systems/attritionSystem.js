import { kill } from './death.js';

export class AttritionSystem {
    constructor(jobBoard, corpseDefinition, needs) {
        this.jobBoard = jobBoard;
        this.corpseDefinition = corpseDefinition;
        this.needs = needs;
    }

    update(world, eventBus) {
        for (const config of this.needs) {
            for (const entityId of world.query(config.component, 'health')) {
                const need = world.getComponent(entityId, config.component);
                const marker = world.getComponent(entityId, config.marker);
                if (need.value < need.max) {
                    if (marker) {
                        world.removeComponent(entityId, config.marker);
                    }
                    continue;
                }
                if (!marker) {
                    world.addComponent(entityId, config.marker, {});
                    eventBus.emit(config.event, { entityId });
                }
                const morale = world.getComponent(entityId, 'morale');
                if (morale) {
                    morale.value = Math.max(0, morale.value - config.moraleDecay);
                }
                const health = world.getComponent(entityId, 'health');
                health.value -= config.healthDecay;
                if (health.value <= 0) {
                    kill(world, eventBus, this.jobBoard, this.corpseDefinition, entityId, {
                        cause: config.cause,
                    });
                }
            }
        }
    }
}
