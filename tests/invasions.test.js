import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeGame, restoreGame } from '../src/save.js';
import { GoblinSpawnSystem } from '../src/systems/goblinSpawnSystem.js';
import { EVENTS, data, openTerrain, makeTerrain, setupColony, addDwarf } from './helpers.js';

// Un bunker scellé au centre : les vagues arrivent, personne ne meurt, la population est stable.
const bunkerTerrain = () =>
    makeTerrain([
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '............#######...........',
        '............#.....#...........',
        '............#######...........',
        '..............................',
        '..............................',
        '..............................',
    ]);

function bunkeredColony(population) {
    const colony = setupColony(bunkerTerrain(), { goblinSpawner: true });
    for (let i = 0; i < population; i++) {
        addDwarf(colony.world, 13 + (i % 5), 5, { name: `Reclus${i}` });
    }
    return colony;
}

test('invasions : les vagues grossissent et se rapprochent', () => {
    const colony = bunkeredColony(5);
    const waves = colony.collect(EVENTS.GOBLIN_ARRIVED);
    colony.run(1200);
    // vagues aux ticks 250 (1), 700 (1), 1100 (2)
    assert.deepEqual(
        waves.map((wave) => wave.count),
        [1, 1, 2]
    );
    assert.equal(colony.world.query('hostile').length, 4);
    assert.equal(colony.world.query('worker').length, 5, 'le bunker protège');
});

test('invasions : une grosse colonie attire des bandes plus nombreuses', () => {
    const colony = bunkeredColony(12);
    const waves = colony.collect(EVENTS.GOBLIN_ARRIVED);
    colony.run(300);
    assert.equal(waves.length, 1);
    assert.equal(waves[0].count, 3, 'dès la première vague, la prospérité attire');
});

test('invasions : l escalade survit à la sauvegarde', () => {
    const colony = bunkeredColony(5);
    const waves = colony.collect(EVENTS.GOBLIN_ARRIVED);
    colony.run(300);
    assert.equal(waves.length, 1, 'la première vague est passée');

    const snapshot = JSON.parse(JSON.stringify(serializeGame(colony)));
    restoreGame(colony, snapshot);

    colony.run(410);
    assert.equal(waves.length, 2, 'la vague 2 arrive à l heure, pas remise à zéro');
});

test('invasions : la première vague arrive à FIRST_WAVE_DELAY', () => {
    const colony = setupColony(openTerrain(10, 10), { goblinSpawner: true });
    addDwarf(colony.world, 5, 5);
    const waves = colony.collect(EVENTS.GOBLIN_ARRIVED);

    colony.run(249);
    assert.equal(waves.length, 0, 'pas de vague avant le délai');
    colony.run(1);
    assert.equal(waves.length, 1, 'la vague tombe pile au tick 250');
});

test('invasions : la taille scale sur population, richesse et plafonne selon la colonie', () => {
    const spawn = new GoblinSpawnSystem(openTerrain(5, 5), data.creatures.goblin);
    // petite colonie pauvre : croissance lente
    assert.equal(spawn.waveSize(1, 5, 0), 1);
    assert.equal(spawn.waveSize(3, 5, 0), 2);
    // la richesse (armes, armures, ateliers) grossit la vague
    assert.equal(spawn.waveSize(1, 5, 6), 3);
    // grande colonie prospère : la vague peut dépasser 6
    assert.equal(spawn.waveSize(9, 12, 9), 10);
    // petite colonie : plafond dérivé qui la ménage
    assert.equal(spawn.waveSize(20, 5, 0), 5);
});
