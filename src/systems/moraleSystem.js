import { EVENTS } from '../events/events.js';

const WITNESS_RANGE = 8;
const ROT_RANGE = 4;
const ROT_MALUS = 0.1;
const EFFECTS = {
    ate: 10,
    drank: 5,
    drankBeer: 15,
    rested: 10,
    restedOnGround: 3,
    victory: 15,
    buried: 8,
    injured: -10,
    hungry: -5,
    thirsty: -5,
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
        eventBus.on(EVENTS.DWARF_WOKE, ({ entityId, rested, inBed }) =>
            this.pending.push({ type: 'woke', entityId, rested, inBed })
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
        eventBus.on(EVENTS.DWARF_THIRSTY, ({ entityId }) =>
            this.pending.push({ type: 'thirsty', entityId })
        );
        eventBus.on(EVENTS.DWARF_DRANK, ({ entityId }) =>
            this.pending.push({ type: 'drank', entityId })
        );
        eventBus.on(EVENTS.DWARF_DRANK_BEER, ({ entityId }) =>
            this.pending.push({ type: 'drankBeer', entityId })
        );
        eventBus.on(EVENTS.DWARF_FLEES, ({ entityId }) =>
            this.pending.push({ type: 'fled', entityId })
        );
        eventBus.on(EVENTS.DWARF_DIED, ({ x, y }) =>
            this.pending.push({ type: 'death', x, y })
        );
        eventBus.on(EVENTS.CORPSE_BURIED, ({ x, y }) =>
            this.pending.push({ type: 'buried', x, y })
        );
    }

    update(world) {
        for (const event of this.pending) {
            this.apply(world, event);
        }
        this.pending = [];

        this.stenchOfDecay(world);

        for (const entityId of world.query('morale')) {
            const morale = world.getComponent(entityId, 'morale');
            if (morale.value < morale.baseline) {
                morale.value = Math.min(morale.baseline, morale.value + morale.drift);
            } else if (morale.value > morale.baseline) {
                morale.value = Math.max(morale.baseline, morale.value - morale.drift);
            }
        }
    }

    // un cadavre putréfié laissé à l'air libre ronge le moral des nains alentour
    stenchOfDecay(world) {
        for (const corpseId of world.query('rotten', 'position')) {
            const corpsePosition = world.getComponent(corpseId, 'position');
            for (const entityId of world.query('morale', 'position')) {
                const position = world.getComponent(entityId, 'position');
                const distance = Math.max(
                    Math.abs(position.x - corpsePosition.x),
                    Math.abs(position.y - corpsePosition.y)
                );
                if (distance <= ROT_RANGE) {
                    this.adjust(world, entityId, -ROT_MALUS);
                }
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
        if (event.type === 'buried') {
            for (const entityId of world.query('morale', 'position')) {
                const position = world.getComponent(entityId, 'position');
                const distance = Math.max(
                    Math.abs(position.x - event.x),
                    Math.abs(position.y - event.y)
                );
                if (distance <= WITNESS_RANGE) {
                    this.adjust(world, entityId, EFFECTS.buried);
                }
            }
            return;
        }
        if (event.type === 'woke') {
            if (event.rested) {
                this.adjust(
                    world,
                    event.entityId,
                    event.inBed ? EFFECTS.rested : EFFECTS.restedOnGround
                );
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
