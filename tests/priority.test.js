import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JobBoard } from '../src/core/jobBoard.js';
import { DesignationControl } from '../src/ui/designation.js';
import { makeTerrain, setupColony } from './helpers.js';

globalThis.window ??= { addEventListener: () => {} };

test('priorité : claim sert le job prioritaire même plus éloigné', () => {
    const board = new JobBoard();
    board.post({ type: 'dig', target: { x: 1, y: 0 } }); // normal, proche
    board.post({ type: 'dig', target: { x: 10, y: 0 }, priority: 1 }); // urgent, loin

    const claimed = board.claim(1, { x: 0, y: 0 });

    assert.equal(claimed.target.x, 10);
});

test('priorité : à priorité égale, le plus proche est servi', () => {
    const board = new JobBoard();
    board.post({ type: 'dig', target: { x: 5, y: 0 } });
    board.post({ type: 'dig', target: { x: 2, y: 0 } });

    const claimed = board.claim(1, { x: 0, y: 0 });

    assert.equal(claimed.target.x, 2);
});

test('priorité : l\'outil urgent pose des désignations prioritaires', () => {
    const colony = setupColony(makeTerrain(['..#..']));
    const control = new DesignationControl({
        canvas: { addEventListener: () => {} },
        toolbar: { querySelectorAll: () => [], querySelector: () => null },
        world: colony.world,
        terrain: colony.terrain,
        jobBoard: colony.jobBoard,
        stockpiles: colony.stockpiles,
        farms: colony.farms,
        fishingSpots: colony.fishingSpots,
        graves: colony.graves,
        tileSize: 20,
    });

    control.mode = 'designate';
    control.urgent = true;
    control.apply({ x: 2, y: 0 }); // mur

    const job = colony.jobBoard.jobs.find((j) => j.type === 'dig');
    assert.equal(job.priority, 1);
});
