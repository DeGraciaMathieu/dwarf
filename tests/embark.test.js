import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/world.js';
import { GoblinSpawnSystem } from '../src/systems/goblinSpawnSystem.js';
import { populateColony } from '../src/systems/embarkSetup.js';
import { data, openTerrain, goblinArchetypes } from './helpers.js';

const applyProfile = (profile, difficulty) => {
    const world = new World();
    populateColony(
        world,
        { dwarf: data.creatures.dwarf, items: data.items },
        { profile, difficulty },
        () => ({ x: 0, y: 0 })
    );
    return world;
};

test('embarquement : la difficulté module la courbe de vagues', () => {
    const terrain = openTerrain(10, 10);
    const archetypes = goblinArchetypes();
    const peaceful = new GoblinSpawnSystem(terrain, archetypes, () => 0.5, {
        firstWaveDelay: 1200,
        baseInterval: 2000,
        minInterval: 1400,
        maxWaveSize: 8,
    });
    const harsh = new GoblinSpawnSystem(terrain, archetypes, () => 0.5, {
        firstWaveDelay: 400,
        baseInterval: 1000,
        minInterval: 700,
        maxWaveSize: 16,
    });

    assert.ok(peaceful.nextInterval(1) > harsh.nextInterval(1), 'les vagues rudes s enchaînent plus vite');
    assert.ok(
        peaceful.waveSize(1, 100, 100) < harsh.waveSize(1, 100, 100),
        'les vagues rudes sont plafonnées plus haut'
    );
    assert.equal(peaceful.firstWaveDelay, 1200);
    assert.equal(harsh.firstWaveDelay, 400);
});

test('embarquement : sans config la courbe de vagues garde ses valeurs historiques', () => {
    const normal = new GoblinSpawnSystem(openTerrain(10, 10), goblinArchetypes());
    assert.equal(normal.firstWaveDelay, 600);
    assert.equal(normal.baseInterval, 1400);
    assert.equal(normal.maxWaveSize, 12);
});

test('embarquement : un profil peuple la colonie selon les données', () => {
    const world = applyProfile({ dwarves: 3, items: [{ item: 'bread', count: 5 }] }, { resourceMultiplier: 1 });

    assert.equal(world.query('worker').length, 3);
    assert.equal(world.query('food').length, 5);
    for (const id of world.query('worker')) {
        const skills = world.getComponent(id, 'skills');
        const specialties = Object.values(skills).filter((level) => level >= 2);
        assert.equal(specialties.length, 1, 'une spécialité attribuée par nain');
        assert.ok(world.getComponent(id, 'identity'), 'un nom attribué');
        assert.ok(world.getComponent(id, 'personality'), 'une personnalité attribuée');
    }
});

test('embarquement : la difficulté module les vivres de départ', () => {
    const stock = (multiplier) =>
        applyProfile(
            { dwarves: 2, items: [{ item: 'bread', count: 8 }] },
            { resourceMultiplier: multiplier }
        ).query('food').length;

    assert.equal(stock(1), 8);
    assert.equal(stock(1.5), 12);
    assert.equal(stock(0.6), 5, 'arrondi de 4,8');
});

test('embarquement : les défauts reproduisent la partie historique (5 nains, 8 pains)', () => {
    const profile = data.embark.profiles.find((entry) => entry.default);
    const difficulty = data.embark.difficulties.find((entry) => entry.default);
    const world = applyProfile(profile, difficulty);

    assert.equal(world.query('worker').length, 5);
    assert.equal(world.query('food').length, 8);
});
