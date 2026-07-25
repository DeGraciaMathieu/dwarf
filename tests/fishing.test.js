import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeGame, restoreGame } from '../src/save.js';
import { EVENTS, makeTerrain, setupColony, addDwarf } from './helpers.js';

const riverTerrain = () =>
    makeTerrain(['....~~....', '....~~....', '....~~....', '....~~....']);

test('pêche : la zone produit du poisson en continu depuis la berge', () => {
    const colony = setupColony(riverTerrain());
    addDwarf(colony.world, 1, 1);
    colony.fishingSpots.add(4, 1);
    const caught = colony.collect(EVENTS.FISH_CAUGHT);
    colony.run(120);
    assert.ok(caught.length >= 2, `au moins deux prises attendues, ${caught.length} obtenues`);
    assert.ok(colony.world.query('food', 'position').length >= 1);
});

test('pêche : le poisson nourrit un affamé', () => {
    const colony = setupColony(riverTerrain());
    const dwarf = addDwarf(colony.world, 1, 1, { hunger: 69, hungerRate: 0.1 });
    colony.fishingSpots.add(4, 0);
    const meals = colony.collect(EVENTS.DWARF_ATE);
    colony.run(200);
    assert.ok(meals.length >= 1, 'il finit par manger sa prise');
    assert.ok(colony.world.getComponent(dwarf, 'hunger').value < 69);
});

test('pêche : un pont posé sur la case arrête la production', () => {
    const colony = setupColony(riverTerrain());
    addDwarf(colony.world, 1, 1);
    colony.fishingSpots.add(4, 1);
    colony.terrain.set(4, 1, 'bridge');
    colony.run(80);
    assert.equal(colony.jobBoard.jobs.filter((job) => job.type === 'fish').length, 0);
    assert.equal(colony.world.query('food').length, 0);
});

test('pêche : la zone survit à la sauvegarde, les vieilles sauvegardes aussi', () => {
    const colony = setupColony(riverTerrain());
    addDwarf(colony.world, 1, 1);
    colony.fishingSpots.add(4, 2);
    const snapshot = JSON.parse(JSON.stringify(serializeGame(colony)));
    colony.fishingSpots.tiles.clear();
    restoreGame(colony, snapshot);
    assert.equal(colony.fishingSpots.has(4, 2), true);

    delete snapshot.fishing;
    restoreGame(colony, snapshot);
    assert.equal(colony.fishingSpots.list().length, 0, 'vieille sauvegarde sans zone de pêche');
});
