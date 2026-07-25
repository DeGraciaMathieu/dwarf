import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeGame, restoreGame } from '../src/save.js';
import { EVENTS, makeTerrain, setupColony, addDwarf } from './helpers.js';

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
    colony.run(1860);
    // vague 1 au tick 500 (1 gobelin), vague 2 à 1200 (1), vague 3 à 1850 (2)
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
    colony.run(510);
    assert.equal(waves.length, 1);
    assert.equal(waves[0].count, 2, 'dès la première vague, la prospérité attire');
});

test('invasions : l escalade survit à la sauvegarde', () => {
    const colony = bunkeredColony(5);
    const waves = colony.collect(EVENTS.GOBLIN_ARRIVED);
    colony.run(900);
    assert.equal(waves.length, 1, 'la première vague est passée');

    const snapshot = JSON.parse(JSON.stringify(serializeGame(colony)));
    restoreGame(colony, snapshot);

    colony.run(310);
    assert.equal(waves.length, 2, 'la vague 2 arrive à l heure, pas remise à zéro');
});
