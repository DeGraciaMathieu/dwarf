import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnFromDefinition } from '../src/core/spawn.js';
import {
    data,
    openTerrain,
    setupColony,
    addDwarf,
    addLog,
    addStone,
    entitiesAt,
} from './helpers.js';

test('taille : l atelier de taille se bâtit à la menuiserie', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0);
    spawnFromDefinition(colony.world, data.items.workshop, { x: 8, y: 1 });
    addLog(colony.world, 3, 0);
    colony.jobBoard.post({ type: 'craft', recipe: 'masonry', ghost: 'Δ', target: { x: 15, y: 1 } });
    colony.run(250);
    assert.equal(entitiesAt(colony.world, 'workshop', 15, 1).length, 1);
});

test('taille : on taille un lit dans la pierre à l atelier de taille', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0);
    spawnFromDefinition(colony.world, data.items.masonry, { x: 8, y: 1 });
    addStone(colony.world, 3, 0);
    colony.jobBoard.post({ type: 'craft', recipe: 'stoneBed', ghost: 'Ξ', target: { x: 15, y: 1 } });
    colony.run(250);
    assert.equal(entitiesAt(colony.world, 'bed', 15, 1).length, 1);
    assert.equal(colony.world.query('stone').length, 0, 'la pierre a été taillée');
});

test('taille : le lit de pierre exige de la pierre, pas du bois', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0);
    spawnFromDefinition(colony.world, data.items.masonry, { x: 8, y: 1 });
    addLog(colony.world, 3, 0);
    colony.jobBoard.post({ type: 'craft', recipe: 'stoneBed', ghost: 'Ξ', target: { x: 15, y: 1 } });
    colony.run(120);
    assert.equal(entitiesAt(colony.world, 'bed', 15, 1).length, 0, 'le bois ne peut pas être taillé');
    assert.equal(colony.jobBoard.jobs[0].unreachable, true);
});
