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
    restedInRoom: 18,
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

// durée de vie d'une pensée par type (ticks, 5/s) : une mort marque bien plus
// longtemps qu'un verre bu. Défaut si absent.
const DEFAULT_TTL = 300;
const THOUGHT_TTL = {
    ate: 300,
    ateMeal: 400,
    drank: 200,
    drankBeer: 300,
    rested: 400,
    restedOnGround: 250,
    restedInRoom: 500,
    victory: 400,
    buried: 400,
    injured: 300,
    wounded: 500,
    healed: 300,
    hungry: 200,
    thirsty: 200,
    fled: 250,
    deathWitnessed: 1500,
    deathHeard: 800,
    grief: 2000,
};

// pensées mutuellement exclusives : satisfaire un besoin chasse la pensée de manque
// correspondante (et inversement), pour ne pas afficher « a mangé à sa faim » et
// « a le ventre vide » en même temps
const OPPOSITE_THOUGHTS = {
    ate: ['hungry'],
    ateMeal: ['hungry'],
    hungry: ['ate', 'ateMeal'],
    drank: ['thirsty'],
    drankBeer: ['thirsty'],
    thirsty: ['drank', 'drankBeer'],
};

// libellés français des pensées, lus par la fiche d'inspection (UI en lecture seule)
export const THOUGHT_LABELS = {
    ate: 'a mangé à sa faim',
    ateMeal: 'a savouré un bon plat',
    drank: "s'est désaltéré",
    drankBeer: 'a bu une bonne bière',
    rested: 'a bien dormi',
    restedOnGround: 'a dormi à même le sol',
    restedInRoom: 'a dormi dans une belle chambre',
    victory: 'a terrassé un ennemi',
    buried: 'a rendu hommage à un mort',
    injured: 'a encaissé des coups',
    wounded: 'a été grièvement blessé',
    healed: 'a été soigné',
    hungry: 'a le ventre vide',
    thirsty: 'a la gorge sèche',
    fled: "a fui devant l'ennemi",
    deathWitnessed: 'a vu quelqu\'un mourir',
    deathHeard: 'a appris une mort',
    grief: 'pleure un proche disparu',
};

export class MoraleSystem {
    constructor(eventBus) {
        this.pending = [];
        this.tick = 0;
        eventBus.on(EVENTS.DWARF_ATE, ({ entityId, cooked }) =>
            this.pending.push({ type: cooked ? 'ateMeal' : 'ate', entityId })
        );
        eventBus.on(EVENTS.DWARF_WOKE, ({ entityId, rested, inBed, roomQuality }) =>
            this.pending.push({ type: 'woke', entityId, rested, inBed, roomQuality })
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
        this.tick++;
        for (const event of this.pending) {
            this.apply(world, event);
        }
        this.pending = [];

        this.purgeThoughts(world);
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
                const heardType = distance <= WITNESS_RANGE ? 'deathWitnessed' : 'deathHeard';
                this.remember(world, entityId, heardType, EFFECTS[heardType]);
                const griefDelta = this.grief(world, entityId, event.deceasedId);
                if (griefDelta !== 0) {
                    this.remember(world, entityId, 'grief', griefDelta);
                }
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
                    this.remember(world, entityId, 'buried', EFFECTS.buried);
                }
            }
            return;
        }
        if (event.type === 'woke') {
            if (event.rested) {
                // repli rétrocompatible si l'événement ne porte pas encore la qualité
                const quality = event.roomQuality ?? (event.inBed ? 'bed' : 'ground');
                const effect = { ground: 'restedOnGround', bed: 'rested', room: 'restedInRoom' }[
                    quality
                ];
                this.remember(world, event.entityId, effect, EFFECTS[effect]);
            }
            return;
        }
        this.remember(world, event.entityId, event.type, EFFECTS[event.type]);
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

    // applique le delta au moral ET dépose une pensée horodatée qui explique l'humeur
    // (barème lu dans EFFECTS, inchangé). La pile est créée à la volée pour les nains
    // issus d'anciennes sauvegardes sans composant `thoughts`.
    remember(world, entityId, type, delta) {
        this.adjust(world, entityId, delta);
        if (delta === undefined || delta === 0) {
            return;
        }
        let thoughts = world.getComponent(entityId, 'thoughts');
        if (!thoughts) {
            thoughts = { list: [] };
            world.addComponent(entityId, 'thoughts', thoughts);
        }
        const opposites = OPPOSITE_THOUGHTS[type];
        if (opposites) {
            thoughts.list = thoughts.list.filter((thought) => !opposites.includes(thought.type));
        }
        thoughts.list.push({
            type,
            delta,
            addedAtTick: this.tick,
            expiresAtTick: this.tick + (THOUGHT_TTL[type] ?? DEFAULT_TTL),
        });
    }

    // pile auto-purgeante : on retire les pensées expirées (affichage), le retour du
    // moral vers la baseline étant assuré par la dérive
    purgeThoughts(world) {
        for (const entityId of world.query('thoughts')) {
            const thoughts = world.getComponent(entityId, 'thoughts');
            thoughts.list = thoughts.list.filter((thought) => thought.expiresAtTick > this.tick);
        }
    }

    adjust(world, entityId, delta) {
        const morale = world.getComponent(entityId, 'morale');
        if (!morale || delta === undefined) {
            return;
        }
        morale.value = Math.max(0, Math.min(morale.max, morale.value + delta));
    }
}
