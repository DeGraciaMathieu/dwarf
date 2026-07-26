import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/world.js';
import { workEffort } from '../src/systems/workEffort.js';
import { makeTerrain, setupColony, addDwarf } from './helpers.js';

test('aptitudes : un mineur chevronné creuse plus vite qu\'un généraliste', () => {
    const colony = setupColony(makeTerrain(['.#..#.']));
    const expert = addDwarf(colony.world, 0, 0, { name: 'Dagna' });
    const novice = addDwarf(colony.world, 5, 0, { name: 'Kib' });
    colony.world.addComponent(expert, 'skills', { mining: 2 });
    colony.jobBoard.post({ type: 'dig', target: { x: 1, y: 0 } });
    colony.jobBoard.post({ type: 'dig', target: { x: 4, y: 0 } });

    colony.run(4);

    const expertProgress = colony.world.getComponent(expert, 'currentJob').progress;
    const noviceProgress = colony.world.getComponent(novice, 'currentJob').progress;
    assert.ok(expertProgress > noviceProgress, 'le mineur avance plus vite');
});

test('aptitudes : le moral bas et l\'aptitude se cumulent dans l\'effort', () => {
    const world = new World();
    const id = world.createEntity();
    world.addComponent(id, 'skills', { mining: 2 });
    world.addComponent(id, 'morale', { value: 70, max: 100, low: 40 });

    // moral haut + aptitude 2 → 1 × (1 + 0.3×2) = 1.6
    assert.equal(workEffort(world, id, 'dig'), 1.6);

    // moral bas → malus 0.5 cumulé : 0.5 × 1.6 = 0.8
    world.getComponent(id, 'morale').value = 30;
    assert.equal(workEffort(world, id, 'dig'), 0.8);

    // job hors aptitude (démolition) : seul le moral compte
    assert.equal(workEffort(world, id, 'demolish'), 0.5);
});
