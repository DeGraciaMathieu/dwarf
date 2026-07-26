import { EVENTS } from '../events/events.js';
import { kill } from './death.js';

// un nain blessé (composant 'injury') se vide lentement de son sang tant qu'il n'est
// pas soigné ; à 0 il meurt. État auto-réparable : le composant est posé par le combat
// et retiré par le soin (healSystem) ou à la mort (kill).
export class InjurySystem {
    constructor(jobBoard, corpseDefinition) {
        this.jobBoard = jobBoard;
        this.corpseDefinition = corpseDefinition;
    }

    update(world, eventBus) {
        for (const entityId of world.query('injury', 'health')) {
            const injury = world.getComponent(entityId, 'injury');
            const health = world.getComponent(entityId, 'health');
            health.value -= injury.bleeding;
            if (health.value <= 0) {
                eventBus.emit(EVENTS.DWARF_BLED_OUT, { entityId });
                kill(world, eventBus, this.jobBoard, this.corpseDefinition, entityId, {
                    cause: 'bleeding',
                });
            }
        }
    }
}
