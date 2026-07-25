import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPath } from '../src/core/pathfinding.js';
import { spawnFromDefinition } from '../src/core/spawn.js';
import { EVENTS, data, makeTerrain, setupColony, addDwarf, addLog } from './helpers.js';

test('pont : posé depuis la berge, il ouvre le passage à tous', () => {
    const colony = setupColony(makeTerrain(['....~~....', '....~~....', '....~~....', '....~~....']));
    addDwarf(colony.world, 0, 0);
    addLog(colony.world, 2, 2);
    addLog(colony.world, 2, 3);
    spawnFromDefinition(colony.world, data.items.workshop, { x: 2, y: 0 });
    assert.equal(findPath(colony.terrain, { x: 1, y: 1 }, { x: 8, y: 1 }), null);

    colony.jobBoard.post({ type: 'craft', recipe: 'bridge', ghost: '≡', target: { x: 4, y: 1 } });
    colony.jobBoard.post({ type: 'craft', recipe: 'bridge', ghost: '≡', target: { x: 5, y: 1 } });
    const built = colony.collect(EVENTS.FURNITURE_BUILT);
    colony.run(250);
    assert.equal(built.length, 2);
    assert.equal(built[0].label, 'un pont');
    assert.equal(colony.terrain.get(4, 1), 'bridge');
    assert.equal(colony.terrain.get(5, 1), 'bridge');
    assert.ok(findPath(colony.terrain, { x: 1, y: 1 }, { x: 8, y: 1 }) !== null, 'les nains traversent');
    assert.ok(
        findPath(colony.terrain, { x: 1, y: 1 }, { x: 8, y: 1 }, { hostile: true }) !== null,
        'les gobelins aussi : un pont est une brèche, pas une porte'
    );
    assert.equal(colony.world.query('item').length, 0, 'les kits de pont sont consommés');
    assert.equal(colony.jobBoard.jobs.length, 0);
});

test('pont : son installation réveille les chantiers en attente de l autre côté', () => {
    const terrain = makeTerrain(['....~~....', '....~~..#.', '....~~....', '....~~....']);
    const colony = setupColony(terrain);
    addDwarf(colony.world, 0, 0);
    colony.jobBoard.post({ type: 'dig', target: { x: 8, y: 1 } });
    colony.run(20);
    const digJob = colony.jobBoard.jobs.find((job) => job.type === 'dig');
    assert.equal(digJob.unreachable, true, 'le mur est inaccessible derrière la rivière');

    addLog(colony.world, 2, 2);
    addLog(colony.world, 2, 3);
    spawnFromDefinition(colony.world, data.items.workshop, { x: 2, y: 0 });
    colony.jobBoard.post({ type: 'craft', recipe: 'bridge', ghost: '≡', target: { x: 4, y: 2 } });
    colony.jobBoard.post({ type: 'craft', recipe: 'bridge', ghost: '≡', target: { x: 5, y: 2 } });
    const dug = colony.collect(EVENTS.WALL_DUG);
    colony.run(300);
    assert.equal(terrain.get(8, 1), 'floor', 'le chantier a repris après la pose du pont');
    assert.equal(dug.length, 1);
});
