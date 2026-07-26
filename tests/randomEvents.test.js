import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeGame, restoreGame } from '../src/save.js';
import { World } from '../src/core/world.js';
import { EventBus } from '../src/core/eventBus.js';
import { spawnFromDefinition } from '../src/core/spawn.js';
import { RandomEventSystem } from '../src/systems/randomEventSystem.js';
import {
    EVENTS,
    data,
    openTerrain,
    setupColony,
    addDwarf,
    addGoblin,
    eventDefinitions,
} from './helpers.js';

// PRNG déterministe (mulberry32) pour rendre la séquence d'événements reproductible
const seededRandom = (seed) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const WOLF_ROSTER = [{ creature: 'wolf', weight: 1 }];

const beastTable = (overrides = {}) => ({
    firstCheck: 5,
    checkInterval: 100,
    jitter: 0,
    events: [
        {
            id: 'wildBeast',
            weight: 1,
            cooldown: 1000,
            conditions: {},
            effect: { type: 'spawnBeast', count: 1, roster: WOLF_ROSTER },
        },
    ],
    ...overrides,
});

const beastColony = (table, random = () => 0.5) => {
    const colony = setupColony(openTerrain(12, 12), {
        randomEvents: { table, definitions: eventDefinitions() },
        random,
    });
    addDwarf(colony.world, 6, 6, { name: 'Urist' });
    return colony;
};

// monde minimal isolé du combat : un nain sain qui ne meurt pas (l'éligibilité reste
// stable) pour observer le seul tirage d'événements piloté par le RNG injecté
const isolatedColony = (table, random) => {
    const world = new World();
    const bus = new EventBus();
    const id = world.createEntity();
    world.addComponent(id, 'worker', {});
    world.addComponent(id, 'health', { value: 100, max: 100 });
    world.registerSystem(
        new RandomEventSystem(openTerrain(12, 12), table, eventDefinitions(), random)
    );
    return {
        world,
        bus,
        run(ticks) {
            for (let i = 0; i < ticks; i++) {
                world.tick(bus);
            }
        },
    };
};

test('événements : un rendez-vous déclenche l effet et l annonce', () => {
    const colony = beastColony(beastTable());
    const beasts = colony.collect(EVENTS.EVENT_BEAST_APPEARED);

    colony.run(5);
    assert.equal(beasts.length, 1, 'la bête arrive au premier rendez-vous');
    assert.ok(colony.world.query('hostile').length >= 1, 'une créature hostile est apparue');
});

test('événements : le cooldown bloque puis relâche un événement', () => {
    const table = {
        firstCheck: 10,
        checkInterval: 50,
        jitter: 0,
        events: [
            {
                id: 'wildBeast',
                weight: 1,
                cooldown: 100,
                conditions: {},
                effect: { type: 'spawnBeast', count: 1, roster: WOLF_ROSTER },
            },
        ],
    };
    const colony = beastColony(table);
    const beasts = colony.collect(EVENTS.EVENT_BEAST_APPEARED);

    colony.run(10); // trigger #1 au tick 10
    assert.equal(beasts.length, 1);
    colony.run(50); // tick 60 : 60-10=50 < 100 → bloqué
    assert.equal(beasts.length, 1);
    colony.run(50); // tick 110 : 110-10=100 >= 100 → éligible
    assert.equal(beasts.length, 2, 'le cooldown écoulé, l événement revient');
});

test('événements : une condition non satisfaite écarte l unique événement', () => {
    const table = {
        firstCheck: 5,
        checkInterval: 20,
        jitter: 0,
        events: [
            {
                id: 'plague',
                weight: 1,
                cooldown: 100,
                conditions: { minPopulation: 99 },
                effect: { type: 'plague', victims: 1, healthLoss: 5 },
            },
        ],
    };
    const colony = beastColony(table);
    const struck = colony.collect(EVENTS.EVENT_PLAGUE_STRUCK);

    colony.run(200);
    assert.equal(struck.length, 0, 'jamais tiré tant que la condition manque');
});

test('événements : une épidémie affaiblit réellement des nains', () => {
    const table = {
        firstCheck: 5,
        checkInterval: 100,
        jitter: 0,
        events: [
            {
                id: 'plague',
                weight: 1,
                cooldown: 1000,
                conditions: { minPopulation: 1 },
                effect: { type: 'plague', victims: 1, healthLoss: 8 },
            },
        ],
    };
    const colony = beastColony(table);
    const dwarf = colony.world.query('worker', 'health')[0];
    const before = colony.world.getComponent(dwarf, 'health').value;

    colony.run(5);
    assert.ok(colony.world.getComponent(dwarf, 'health').value < before, 'la santé a chuté');
});

test('événements : la séquence est reproductible avec un RNG déterministe', () => {
    const table = {
        firstCheck: 5,
        checkInterval: 60,
        jitter: 0.5,
        events: [
            { id: 'wildBeast', weight: 2, cooldown: 30, conditions: {}, effect: { type: 'spawnBeast', count: 1, roster: WOLF_ROSTER } },
            { id: 'caveIn', weight: 2, cooldown: 30, conditions: {}, effect: { type: 'caveIn' } },
            { id: 'plague', weight: 2, cooldown: 30, conditions: { minPopulation: 1 }, effect: { type: 'plague', victims: 1, healthLoss: 1 } },
        ],
    };
    const sequenceOf = () => {
        const colony = isolatedColony(table, seededRandom(42));
        const seq = [];
        colony.bus.on(EVENTS.EVENT_BEAST_APPEARED, () => seq.push('beast'));
        colony.bus.on(EVENTS.EVENT_CAVE_IN, () => seq.push('caveIn'));
        colony.bus.on(EVENTS.EVENT_PLAGUE_STRUCK, () => seq.push('plague'));
        colony.run(500);
        return seq;
    };

    const first = sequenceOf();
    const second = sequenceOf();
    assert.ok(first.length > 0, 'des événements se sont produits');
    assert.deepEqual(first, second, 'même graine → même séquence');
});

test('événements : le roster pondéré rend certaines bêtes rares', () => {
    const table = {
        firstCheck: 1,
        checkInterval: 5,
        jitter: 0,
        events: [
            {
                id: 'wildBeast',
                weight: 1,
                cooldown: 0,
                conditions: {},
                effect: {
                    type: 'spawnBeast',
                    count: 1,
                    roster: [
                        { creature: 'wolf', weight: 8 },
                        { creature: 'dragon', weight: 1 },
                    ],
                },
            },
        ],
    };
    // monde minimal isolé du combat : on observe le tirage du roster sur ~100 apparitions
    const colony = isolatedColony(table, seededRandom(7));
    const counts = { wolf: 0, dragon: 0 };
    colony.bus.on(EVENTS.EVENT_BEAST_APPEARED, ({ creature }) => {
        counts[creature] += 1;
    });

    colony.run(500);
    assert.ok(counts.wolf > 0 && counts.dragon > 0, 'les deux bêtes apparaissent');
    assert.ok(counts.wolf > counts.dragon * 3, 'le dragon reste bien plus rare que le loup');
});

test('événements : un dragon (prédateur) s attaque aussi aux gobelins', () => {
    const colony = setupColony(openTerrain(12, 12));
    spawnFromDefinition(colony.world, data.creatures.dragon, { x: 5, y: 5 });
    const goblin = addGoblin(colony.world, 6, 5); // adjacent au dragon
    addDwarf(colony.world, 0, 0); // colonie vivante, mais loin

    colony.run(5);
    assert.equal(
        colony.world.getComponent(goblin, 'health'),
        undefined,
        'le dragon a tué le gobelin'
    );
});

test('événements : le compteur et les cooldowns survivent au save/load', () => {
    const colony = beastColony(beastTable());
    colony.run(5); // déclenche une fois → cooldowns peuplés

    const stateId = colony.world.query('randomEvents')[0];
    const before = structuredClone(colony.world.getComponent(stateId, 'randomEvents'));
    const snapshot = JSON.parse(JSON.stringify(serializeGame(colony)));

    colony.world.components.get('randomEvents').clear();
    restoreGame(colony, snapshot);

    assert.deepEqual(colony.world.getComponent(stateId, 'randomEvents'), before);
});
