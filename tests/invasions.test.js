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

// RNG neutre : jitter nul (intervalle = base), jamais d'accalmie, que des grunts —
// pour tester la temporisation de façon déterministe
function bunkeredColony(population) {
    const colony = setupColony(bunkerTerrain(), { goblinSpawner: true, random: () => 0.5 });
    for (let i = 0; i < population; i++) {
        addDwarf(colony.world, 13 + (i % 5), 5, { name: `Reclus${i}` });
    }
    return colony;
}

test('invasions : les vagues sont rares et espacées', () => {
    const colony = bunkeredColony(5);
    const waves = colony.collect(EVENTS.GOBLIN_ARRIVED);
    colony.run(599);
    assert.equal(waves.length, 0, 'long répit initial');
    colony.run(1);
    assert.equal(waves.length, 1, 'première vague au tick 600');
    colony.run(1000);
    assert.equal(waves.length, 1, 'toujours une seule ~1000 ticks plus tard');
    colony.run(400);
    assert.equal(waves.length, 2, 'la deuxième vague arrive seulement vers le tick 1970');
    assert.deepEqual(waves.map((wave) => wave.count), [1, 1], 'progression lente');
    assert.equal(colony.world.query('worker').length, 5, 'le bunker protège');
});

test('invasions : une grosse colonie attire des bandes plus nombreuses', () => {
    const colony = bunkeredColony(12);
    const waves = colony.collect(EVENTS.GOBLIN_ARRIVED);
    colony.run(600);
    assert.equal(waves.length, 1);
    assert.equal(waves[0].count, 2, 'la population nourrit déjà la première vague');
});

test('invasions : l escalade survit à la sauvegarde', () => {
    const colony = bunkeredColony(5);
    const waves = colony.collect(EVENTS.GOBLIN_ARRIVED);
    colony.run(600);
    assert.equal(waves.length, 1, 'la première vague est passée');

    const snapshot = JSON.parse(JSON.stringify(serializeGame(colony)));
    restoreGame(colony, snapshot);

    colony.run(1370);
    assert.equal(waves.length, 2, 'la vague 2 arrive à l heure, pas remise à zéro');
});

test('invasions : la première vague arrive après le long répit initial', () => {
    const colony = setupColony(openTerrain(10, 10), { goblinSpawner: true, random: () => 0.5 });
    addDwarf(colony.world, 5, 5);
    const waves = colony.collect(EVENTS.GOBLIN_ARRIVED);

    colony.run(599);
    assert.equal(waves.length, 0, 'pas de vague pendant le répit');
    colony.run(1);
    assert.equal(waves.length, 1, 'la vague tombe au tick 600');
});

test('invasions : une alerte sur quatre se dissipe sans attaque', () => {
    // random < 0.25 => accalmie systématique après la première vague
    const colony = setupColony(openTerrain(10, 10), { goblinSpawner: true, random: () => 0.1 });
    addDwarf(colony.world, 5, 5);
    const waves = colony.collect(EVENTS.GOBLIN_ARRIVED);

    colony.run(600);
    assert.equal(waves.length, 1, 'la première vague passe toujours');
    // les rendez-vous suivants tournent tous à l\'accalmie : plus aucune vague
    colony.run(5000);
    assert.equal(waves.length, 1, 'les alertes suivantes se dissipent (rareté)');
});

test('invasions : la taille scale lentement sur population, richesse et plafonne', () => {
    const spawn = new GoblinSpawnSystem(openTerrain(5, 5), data.creatures.goblin);
    assert.equal(spawn.waveSize(1, 5, 0), 1);
    assert.equal(spawn.waveSize(4, 5, 0), 2, '+1 seulement toutes les trois vagues');
    assert.equal(spawn.waveSize(1, 6, 10), 3, 'la richesse (10/5) grossit la vague');
    assert.equal(spawn.waveSize(10, 14, 15), 9);
    assert.equal(spawn.waveSize(30, 4, 0), 4, 'plafond ménageant les petites colonies');
});
