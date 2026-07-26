import { EVENTS } from '../events/events.js';

const DECAY = 0.3;
const DRUNK_ENTER = 90;
const DRUNK_EXIT = 30;

// l'ébriété monte à la bière (drinkSystem) et redescend ici ; le marqueur `drunk`
// est un état d'hystérésis (entrée haute, sortie basse) — comme sommeil/rage
export class IntoxicationSystem {
    update(world, eventBus) {
        for (const entityId of world.query('intoxication')) {
            const intoxication = world.getComponent(entityId, 'intoxication');
            intoxication.value = Math.max(0, intoxication.value - DECAY);
            const drunk = world.getComponent(entityId, 'drunk');
            if (!drunk && intoxication.value >= DRUNK_ENTER) {
                world.addComponent(entityId, 'drunk', {});
                eventBus.emit(EVENTS.DWARF_DRUNK, { entityId });
            } else if (drunk && intoxication.value <= DRUNK_EXIT) {
                world.removeComponent(entityId, 'drunk');
                eventBus.emit(EVENTS.DWARF_SOBERED, { entityId });
            }
        }
    }
}
