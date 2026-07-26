import { EVENTS } from '../events/events.js';

// borne la taille sérialisée des hauts faits nommés : on ne garde que les plus
// récents par catégorie (les compteurs, eux, restent exhaustifs)
const MAX_HIGHLIGHTS = 20;

// jalons de colonie dérivés de l'état, marqués une seule fois dans `chronicle`
const MILESTONES = [
    { key: 'winter-1', label: 'Premier hiver traversé', test: (c) => c.wintersSurvived >= 1 },
    { key: 'winter-3', label: 'Trois hivers traversés', test: (c) => c.wintersSurvived >= 3 },
    { key: 'winter-5', label: 'Cinq hivers traversés', test: (c) => c.wintersSurvived >= 5 },
    { key: 'pop-10', label: 'Colonie de dix nains', test: (c) => c.peakPopulation >= 10 },
    { key: 'pop-15', label: 'Colonie de quinze nains', test: (c) => c.peakPopulation >= 15 },
    { key: 'rich-20', label: 'Colonie prospère', test: (c) => c.peakRichness >= 20 },
];

// pondération du score : la survie longue et la prospérité priment, les pertes coûtent
const SCORE_WEIGHTS = {
    wintersSurvived: 100,
    peakPopulation: 20,
    goblinsSlain: 15,
    masterworks: 10,
    friendships: 5,
    deaths: -25,
};

// score agrégé dérivé des compteurs de la chronique (lecture seule)
export function chronicleScore(chronicle) {
    return Object.entries(SCORE_WEIGHTS).reduce(
        (total, [key, weight]) => total + (chronicle[key] ?? 0) * weight,
        0
    );
}

function newChronicle() {
    return {
        ticks: 0,
        ended: false,
        peakPopulation: 0,
        peakRichness: 0,
        wintersSurvived: 0,
        arrivals: 0,
        deaths: 0,
        goblinsSlain: 0,
        masterworks: 0,
        friendships: 0,
        rivalries: 0,
        deathsLog: [],
        friendshipsLog: [],
        rivalriesLog: [],
        masterworksLog: [],
        milestones: [],
    };
}

// Tient la « légende » de la colonie : (a) s'abonne aux faits accomplis du bus pour
// l'agrégation narrative (comme moraleSystem/eventLog), (b) lit le monde chaque tick
// pour les jalons dérivés et émet `colony.ended` à l'extinction, une seule fois.
export class ChronicleSystem {
    constructor(eventBus) {
        this.pending = [];
        eventBus.on(EVENTS.MIGRANT_ARRIVED, () => this.pending.push({ type: 'arrival' }));
        eventBus.on(EVENTS.DWARF_DIED, ({ name, cause }) =>
            this.pending.push({ type: 'death', name, cause })
        );
        eventBus.on(EVENTS.GOBLIN_SLAIN, () => this.pending.push({ type: 'goblinSlain' }));
        eventBus.on(EVENTS.ITEM_CRAFTED, ({ label }) =>
            this.pending.push({ type: 'masterwork', label })
        );
        eventBus.on(EVENTS.DWARF_BEFRIENDED, ({ entityId, otherId }) =>
            this.pending.push({ type: 'friendship', entityId, otherId })
        );
        eventBus.on(EVENTS.DWARF_FELL_OUT, ({ entityId, otherId }) =>
            this.pending.push({ type: 'rivalry', entityId, otherId })
        );
        eventBus.on(EVENTS.SEASON_CHANGED, ({ isWinter }) => {
            if (isWinter) {
                this.pending.push({ type: 'winter' });
            }
        });
    }

    update(world, eventBus) {
        const chronicle = this.chronicleState(world);

        for (const event of this.pending) {
            this.apply(world, chronicle, event);
        }
        this.pending = [];

        chronicle.ticks++;
        const population = world.query('worker').length;
        chronicle.peakPopulation = Math.max(chronicle.peakPopulation, population);
        chronicle.peakRichness = Math.max(chronicle.peakRichness, this.richness(world));
        this.markMilestones(chronicle);

        // extinction : la colonie n'est déclarée éteinte que si elle a vécu (au moins
        // un nain a existé), et l'émission est garantie unique par le flag `ended`
        if (!chronicle.ended && chronicle.peakPopulation > 0 && population === 0) {
            chronicle.ended = true;
            eventBus.emit(EVENTS.COLONY_ENDED, {
                ticks: chronicle.ticks,
                score: chronicleScore(chronicle),
                wintersSurvived: chronicle.wintersSurvived,
                peakPopulation: chronicle.peakPopulation,
                goblinsSlain: chronicle.goblinsSlain,
                deaths: chronicle.deaths,
            });
        }
    }

    apply(world, chronicle, event) {
        if (event.type === 'arrival') {
            chronicle.arrivals++;
        } else if (event.type === 'death') {
            chronicle.deaths++;
            this.pushHighlight(chronicle.deathsLog, { name: event.name, cause: event.cause });
        } else if (event.type === 'goblinSlain') {
            chronicle.goblinsSlain++;
        } else if (event.type === 'masterwork') {
            chronicle.masterworks++;
            this.pushHighlight(chronicle.masterworksLog, { label: event.label });
        } else if (event.type === 'friendship') {
            chronicle.friendships++;
            this.pushHighlight(chronicle.friendshipsLog, {
                a: this.name(world, event.entityId),
                b: this.name(world, event.otherId),
            });
        } else if (event.type === 'rivalry') {
            chronicle.rivalries++;
            this.pushHighlight(chronicle.rivalriesLog, {
                a: this.name(world, event.entityId),
                b: this.name(world, event.otherId),
            });
        } else if (event.type === 'winter') {
            chronicle.wintersSurvived++;
        }
    }

    markMilestones(chronicle) {
        for (const milestone of MILESTONES) {
            if (!chronicle.milestones.includes(milestone.key) && milestone.test(chronicle)) {
                chronicle.milestones.push(milestone.key);
            }
        }
    }

    // mêmes agrégats que goblinSpawnSystem.richness : armes + armures + ateliers
    richness(world) {
        return (
            world.query('weapon').length +
            world.query('armor').length +
            world.query('workshop').length
        );
    }

    pushHighlight(list, entry) {
        list.push(entry);
        if (list.length > MAX_HIGHLIGHTS) {
            list.shift();
        }
    }

    name(world, entityId) {
        const identity = world.getComponent(entityId, 'identity');
        return identity?.name ?? 'Un nain';
    }

    chronicleState(world) {
        const existing = world.query('chronicle')[0];
        if (existing !== undefined) {
            return world.getComponent(existing, 'chronicle');
        }
        const stateId = world.createEntity();
        const state = newChronicle();
        world.addComponent(stateId, 'chronicle', state);
        return state;
    }
}

export { MILESTONES };
