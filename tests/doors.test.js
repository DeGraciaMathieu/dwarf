import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPath } from '../src/core/pathfinding.js';
import { spawnFromDefinition } from '../src/core/spawn.js';
import {
    EVENTS,
    data,
    makeTerrain,
    openTerrain,
    setupColony,
    addDwarf,
    addGoblin,
    addLog,
} from './helpers.js';

test('porte : franchissable par les nains, infranchissable par les hostiles', () => {
    const terrain = makeTerrain(['#########', '#...+...#', '#########']);
    assert.equal(terrain.isWalkable(4, 1), true);
    assert.equal(terrain.isWalkable(4, 1, { hostile: true }), false);

    const dwarfPath = findPath(terrain, { x: 1, y: 1 }, { x: 7, y: 1 });
    assert.ok(dwarfPath !== null, 'le nain traverse la porte');
    const goblinPath = findPath(terrain, { x: 1, y: 1 }, { x: 7, y: 1 }, { hostile: true });
    assert.equal(goblinPath, null, 'le gobelin est bloqué');
});

test('porte : fabriquée à l atelier et posée comme tuile', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0);
    addLog(colony.world, 5, 2);
    spawnFromDefinition(colony.world, data.items.workshop, { x: 10, y: 1 });
    colony.jobBoard.post({ type: 'craft', recipe: 'door', ghost: '+', target: { x: 16, y: 1 } });
    const built = colony.collect(EVENTS.FURNITURE_BUILT);
    colony.run(120);
    assert.equal(colony.terrain.get(16, 1), 'door');
    assert.equal(built.length, 1);
    assert.equal(built[0].label, 'une porte');
    assert.equal(colony.world.query('item').length, 0, 'le kit de porte est consommé');
    assert.equal(colony.jobBoard.jobs.length, 0);
});

test('porte : le gobelin campe dehors, le nain est en sécurité', () => {
    const terrain = makeTerrain(['##########', '#...+...##', '##########']);
    const colony = setupColony(terrain);
    const dwarf = addDwarf(colony.world, 7, 1, { courage: 2 });
    const goblin = addGoblin(colony.world, 1, 1);
    const deaths = colony.collect(EVENTS.DWARF_DIED);
    for (let i = 0; i < 200; i++) {
        colony.world.tick(colony.bus);
        const goblinPosition = colony.world.getComponent(goblin, 'position');
        assert.ok(goblinPosition.x < 4, 'le gobelin ne doit jamais franchir la porte');
    }
    assert.equal(deaths.length, 0);
    assert.notEqual(colony.world.getComponent(dwarf, 'worker'), undefined);
});

test('porte : le nain traverse pour aller travailler de l autre côté', () => {
    const terrain = makeTerrain(['##########', '#...+..#.#', '##########']);
    const colony = setupColony(terrain);
    addDwarf(colony.world, 1, 1);
    colony.jobBoard.post({ type: 'dig', target: { x: 7, y: 1 } });
    const dug = colony.collect(EVENTS.WALL_DUG);
    colony.run(60);
    assert.equal(dug.length, 1, 'le chantier derrière la porte doit aboutir');
    assert.equal(terrain.get(7, 1), 'floor');
});

test('porte : le gobelin errant ne la franchit pas non plus', () => {
    const terrain = makeTerrain(['##########', '#..+.....#', '##########']);
    const colony = setupColony(terrain);
    const goblin = addGoblin(colony.world, 1, 1);
    for (let i = 0; i < 200; i++) {
        colony.world.tick(colony.bus);
        assert.ok(colony.world.getComponent(goblin, 'position').x < 3);
    }
});
