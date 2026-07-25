import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnFromDefinition } from '../src/core/spawn.js';
import {
    EVENTS,
    data,
    makeTerrain,
    openTerrain,
    setupColony,
    addDwarf,
    addLog,
    addBread,
    addMushroom,
    addBrewery,
    entitiesAt,
} from './helpers.js';

test('dig : le nain creuse le mur désigné', () => {
    const terrain = makeTerrain(['..........', '.....#....', '..........']);
    const colony = setupColony(terrain);
    addDwarf(colony.world, 0, 0);
    colony.jobBoard.post({ type: 'dig', target: { x: 5, y: 1 } });
    const dug = colony.collect(EVENTS.WALL_DUG);
    colony.run(40);
    assert.equal(terrain.get(5, 1), 'floor');
    assert.equal(dug.length, 1);
    assert.equal(colony.jobBoard.jobs.length, 0);
});

test('dig : un mur emmuré attend, creuser son accès le débloque', () => {
    const terrain = makeTerrain(['.....###.', '.....#.#.', '.....###.']);
    const colony = setupColony(terrain);
    addDwarf(colony.world, 0, 0);
    colony.jobBoard.post({ type: 'dig', target: { x: 6, y: 1 } });
    colony.run(20);
    assert.equal(colony.jobBoard.jobs[0].unreachable, true);

    colony.jobBoard.post({ type: 'dig', target: { x: 5, y: 1 } });
    colony.run(80);
    assert.equal(terrain.get(5, 1), 'floor');
    assert.equal(terrain.get(6, 1), 'floor');
});

test('chop : l arbre abattu laisse une bûche', () => {
    const terrain = makeTerrain(['..........', '.....T....', '..........']);
    const colony = setupColony(terrain);
    addDwarf(colony.world, 0, 0);
    colony.jobBoard.post({ type: 'chop', target: { x: 5, y: 1 } });
    const chopped = colony.collect(EVENTS.TREE_CHOPPED);
    colony.run(40);
    assert.equal(terrain.get(5, 1), 'floor');
    assert.equal(entitiesAt(colony.world, 'buildMaterial', 5, 1).length, 1);
    assert.equal(chopped.length, 1);
});

test('haul : la bûche est rangée au stock et les réservations libérées', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0);
    colony.stockpiles.add(18, 2);
    addLog(colony.world, 10, 0);
    const stored = colony.collect(EVENTS.ITEM_STORED);
    colony.run(60);
    assert.equal(entitiesAt(colony.world, 'item', 18, 2).length, 1);
    assert.equal(stored.length, 1);
    const haulSystem = colony.world.systems.find((system) => system.reservedTiles);
    assert.equal(haulSystem.reservedTiles.size, 0);
    assert.equal(colony.jobBoard.jobs.length, 0);
});

test('haul : le matériau d un craft abandonné en cours de portage finit rangé au stock', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0);
    colony.stockpiles.add(18, 2);
    addMushroom(colony.world, 10, 0);
    const brewery = addBrewery(colony.world, 14, 0);
    colony.jobBoard.post({ type: 'craft', recipe: 'beer', target: { x: 2, y: 0 } });
    const stored = colony.collect(EVENTS.ITEM_STORED);

    colony.run(15);
    colony.world.destroyEntity(brewery);
    colony.run(60);

    assert.equal(entitiesAt(colony.world, 'item', 18, 2).length, 1);
    assert.equal(stored.length, 1);
});

test('build : mur bâti avec une bûche, pénurie débloquée par un abattage', () => {
    const terrain = makeTerrain(['....................', '.....T..............', '....................']);
    const colony = setupColony(terrain);
    addDwarf(colony.world, 0, 0);
    colony.jobBoard.post({ type: 'build', ghost: '#', target: { x: 15, y: 1 } });
    colony.run(20);
    assert.equal(colony.jobBoard.jobs.find((job) => job.type === 'build').unreachable, true);

    colony.jobBoard.post({ type: 'chop', target: { x: 5, y: 1 } });
    colony.run(120);
    assert.equal(terrain.get(15, 1), 'wall');
});

test('build : le mur attend que la case cible soit libérée', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0);
    addLog(colony.world, 5, 0);
    const intruder = colony.world.createEntity();
    colony.world.addComponent(intruder, 'position', { x: 12, y: 1 });
    colony.world.addComponent(intruder, 'item', {});
    colony.jobBoard.post({ type: 'build', ghost: '#', target: { x: 12, y: 1 } });
    colony.run(60);
    assert.equal(colony.terrain.get(12, 1), 'floor');
    colony.world.removeComponent(intruder, 'position');
    colony.run(20);
    assert.equal(colony.terrain.get(12, 1), 'wall');
});

test('craft : chaîne complète bûche -> atelier -> lit installé', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0);
    addLog(colony.world, 5, 2);
    spawnFromDefinition(colony.world, data.items.workshop, { x: 10, y: 1 });
    colony.jobBoard.post({ type: 'craft', recipe: 'bed', ghost: 'Ξ', target: { x: 16, y: 2 } });
    const built = colony.collect(EVENTS.FURNITURE_BUILT);
    colony.run(120);
    const beds = entitiesAt(colony.world, 'bed', 16, 2);
    assert.equal(beds.length, 1);
    assert.equal(colony.world.getComponent(beds[0], 'item'), undefined);
    assert.equal(built.length, 1);
    assert.equal(colony.world.query('buildMaterial').length, 0);
    assert.equal(colony.jobBoard.jobs.length, 0);
});

test('craft : sans atelier le job attend, la pose le débloque', () => {
    const colony = setupColony(openTerrain(20, 2));
    addDwarf(colony.world, 0, 0);
    addLog(colony.world, 3, 0);
    colony.jobBoard.post({ type: 'craft', recipe: 'bed', ghost: 'Ξ', target: { x: 15, y: 1 } });
    colony.run(30);
    assert.equal(colony.jobBoard.jobs[0].unreachable, true);

    spawnFromDefinition(colony.world, data.items.workshop, { x: 8, y: 0 });
    colony.jobBoard.resetUnreachable();
    colony.run(120);
    assert.equal(entitiesAt(colony.world, 'bed', 15, 1).length, 1);
});

test('interruption : le porteur affamé lâche sa charge, le job survit', () => {
    const colony = setupColony(openTerrain(40, 3));
    addDwarf(colony.world, 0, 0, { hunger: 60, hungerRate: 1 });
    colony.stockpiles.add(39, 2);
    addBread(colony.world, 0, 2);
    addLog(colony.world, 20, 0);
    const stored = colony.collect(EVENTS.ITEM_STORED);
    const meals = colony.collect(EVENTS.DWARF_ATE);
    colony.run(300);
    assert.ok(meals.length >= 1);
    assert.ok(stored.length >= 1);
});
