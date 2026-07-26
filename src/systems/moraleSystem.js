import { EVENTS } from '../events/events.js';
import { FRIEND_THRESHOLD } from './socializeSystem.js';

const WITNESS_RANGE = 8;
const ROT_RANGE = 4;
const ROT_MALUS = 0.1;
const GRIEF_FACTOR = 0.4;
const EFFECTS = {
    ate: 10,
    ateMeal: 20,
    drank: 5,
    drankBeer: 15,
    rested: 10,
    restedOnGround: 3,
    victory: 15,
    buried: 8,
    injured: -10,
    wounded: -20,
    healed: 12,
    hungry: -5,
    thirsty: -5,
    fled: -5,
    deathWitnessed: -25,
    deathHeard: -8,
};

export class MoraleSystem {
    constructor(eventBus) {
        this.pending = [];
        eventBus.on(EVENTS.DWARF_ATE, ({ entityId, cooked }) =>
            this.pending.push({ type: cooked ? 'ateMeal' : 'ate', entityId })
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
        eventBus.on(EVENTS.DWARF_WOUNDED, ({ entityId }) =>
            this.pending.push({ type: 'wounded', entityId })
        );
        eventBus.on(EVENTS.DWARF_HEALED, ({ entityId }) =>
            this.pending.push({ type: 'healed', entityId })
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
        eventBus.on(EVENTS.DWARF_DIED, ({ entityId, x, y }) =>
            this.pending.push({ type: 'death', deceasedId: entityId, x, y })
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

        this.comfortOfHome(world);
    }

    // un meuble de confort (brasero) réchauffe le moral des nains à portée —
    // un seul bonus par nain (le meilleur), sans cumul entre sources
    comfortOfHome(world) {
        const sources = world
            .query('comfort', 'position')
            .map((id) => ({
                position: world.getComponent(id, 'position'),
                comfort: world.getComponent(id, 'comfort'),
            }));
        if (sources.length === 0) {
            return;
        }
        for (const entityId of world.query('morale', 'position')) {
            const position = world.getComponent(entityId, 'position');
            let bonus = 0;
            for (const source of sources) {
                const distance = Math.max(
                    Math.abs(position.x - source.position.x),
                    Math.abs(position.y - source.position.y)
                );
                if (distance <= source.comfort.range) {
                    bonus = Math.max(bonus, source.comfort.bonus);
                }
            }
            if (bonus > 0) {
                this.adjust(world, entityId, bonus);
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
                this.adjust(world, entityId, this.grief(world, entityId, event.deceasedId));
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

    // deuil : la mort d'un ami proche pèse plus qu'un simple décès aperçu,
    // proportionnellement à l'affinité tissée avec le défunt
    grief(world, entityId, deceasedId) {
        if (deceasedId === undefined) {
            return 0;
        }
        const relationships = world.getComponent(entityId, 'relationships');
        const affinity = relationships?.affinities[deceasedId] ?? 0;
        if (affinity < FRIEND_THRESHOLD) {
            return 0;
        }
        return -Math.round(affinity * GRIEF_FACTOR);
    }

    adjust(world, entityId, delta) {
        const morale = world.getComponent(entityId, 'morale');
        if (!morale || delta === undefined) {
            return;
        }
        morale.value = Math.max(0, Math.min(morale.max, morale.value + delta));
    }
}
