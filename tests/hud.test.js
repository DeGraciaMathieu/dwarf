import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JobBoard } from '../src/core/jobBoard.js';
import { World } from '../src/core/world.js';
import { EventBus } from '../src/core/eventBus.js';
import { GoblinSpawnSystem } from '../src/systems/goblinSpawnSystem.js';
import { data, openTerrain } from './helpers.js';

test('hud : les compteurs du jobBoard suivent post/claim/markUnreachable', () => {
    const board = new JobBoard();
    board.post({ type: 'dig', target: { x: 1, y: 0 } });
    board.post({ type: 'dig', target: { x: 2, y: 0 } });
    assert.equal(board.countAvailable(), 2);
    assert.equal(board.countClaimed(), 0);
    assert.equal(board.countUnreachable(), 0);

    const claimed = board.claim(1, { x: 0, y: 0 });
    assert.equal(board.countAvailable(), 1);
    assert.equal(board.countClaimed(), 1);

    board.markUnreachable(claimed);
    assert.equal(board.countUnreachable(), 1);
    assert.equal(board.countClaimed(), 0);
    assert.equal(board.countAvailable(), 1);
});

test('hud : le getter de vague décompte les ticks avant le premier assaut', () => {
    const world = new World();
    const bus = new EventBus();
    const spawn = new GoblinSpawnSystem(openTerrain(10, 10), data.creatures.goblin);
    world.registerSystem(spawn);

    // avant tout tick : valeurs par défaut
    assert.equal(spawn.currentWave(world), 0);
    const initial = spawn.nextWaveCountdown(world);
    assert.ok(initial > 0);

    world.tick(bus);
    assert.equal(spawn.nextWaveCountdown(world), initial - 1);
    world.tick(bus);
    assert.equal(spawn.nextWaveCountdown(world), initial - 2);
});
