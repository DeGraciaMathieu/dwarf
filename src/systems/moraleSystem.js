import { EVENTS } from '../events/events.js';

const WITNESS_RANGE = 8;
const EFFECTS = {
    ate: 10,
    rested: 10,
    victory: 15,
    injured: -10,
    hungry: -5,
    fled: -5,
    deathWitnessed: -25,
    deathHeard: -8,
};

export class MoraleSystem {
    constructor(eventBus) {
        this.pending = [];
        eventBus.on(EVENTS.DWARF_ATE, ({ entityId }) =>
            this.pending.push({ type: 'ate', entityId })
        );
        eventBus.on(EVENTS.DWARF_WOKE, ({ entityId }) =>
            this.pending.push({ type: 'woke', entityId })
        );
        eventBus.on(EVENTS.GOBLIN_SLAIN, ({ killerId }) =>
            this.pending.push({ type: 'victory', entityId: killerId })
        );
        eventBus.on(EVENTS.DWARF_INJURED, ({ entityId }) =>
            this.pending.push({ type: 'injured', entityId })
        );
        eventBus.on(EVENTS.DWARF_HUNGRY, ({ entityId }) =>
            this.pending.push({ type: 'hungry', entityId })
        );
        eventBus.on(EVENTS.DWARF_FLEES, ({ entityId }) =>
            this.pending.push({ type: 'fled', entityId })
        );
        eventBus.on(EVENTS.DWARF_DIED, ({ x, y }) =>
            this.pending.push({ type: 'death', x, y })
        );
    }

    update(world) {
        for (const event of this.pending) {
            this.apply(world, event);
        }
        this.pending = [];

        for (const entityId of world.query('morale')) {
            const morale = world.getComponent(entityId, 'morale');
            if (morale.value < morale.baseline) {
                morale.value = Math.min(morale.baseline, morale.value + morale.drift);
            } else if (morale.value > morale.baseline) {
                morale.value = Math.max(morale.baseline, morale.value - morale.drift);
            }
        }
    }

    apply(world, event) {
        if (event.type === 'death') {
            for (const entityId of world.query('morale', 'position')) {
                const position = world.getComponent(entityId, 'position');
                const distance = Math.max(
                    Math.abs(position.x - event.x),
                    Math.abs(position.y - event.y)
                );
                this.adjust(
                    world,
                    entityId,
                    distance <= WITNESS_RANGE ? EFFECTS.deathWitnessed : EFFECTS.deathHeard
                );
            }
            return;
        }
        if (event.type === 'woke') {
            const fatigue = world.getComponent(event.entityId, 'fatigue');
            if (fatigue && fatigue.value === 0) {
                this.adjust(world, event.entityId, EFFECTS.rested);
            }
            return;
        }
        this.adjust(world, event.entityId, EFFECTS[event.type]);
    }

    adjust(world, entityId, delta) {
        const morale = world.getComponent(entityId, 'morale');
        if (!morale || delta === undefined) {
            return;
        }
        morale.value = Math.max(0, Math.min(morale.max, morale.value + delta));
    }
}
