import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DesignationControl } from '../src/ui/designation.js';
import { spawnFromDefinition } from '../src/core/spawn.js';
import {
    data,
    openTerrain,
    makeTerrain,
    setupColony,
    addDwarf,
    addStone,
} from './helpers.js';

globalThis.window ??= { addEventListener: () => {} };

function makeControl(colony) {
    const canvas = { addEventListener: () => {} };
    const toolbar = { querySelectorAll: () => [] };
    return new DesignationControl({
        canvas,
        toolbar,
        world: colony.world,
        terrain: colony.terrain,
        jobBoard: colony.jobBoard,
        stockpiles: colony.stockpiles,
        farms: colony.farms,
        fishingSpots: colony.fishingSpots,
        graves: colony.graves,
        tileSize: 20,
        recipes: data.recipes,
    });
}

test('démolir : un atelier posé est détruit par un nain', () => {
    const colony = setupColony(openTerrain(8, 1));
    addDwarf(colony.world, 0, 0);
    const forge = spawnFromDefinition(colony.world, data.items.forge, { x: 5, y: 0 });
    colony.jobBoard.post({ type: 'demolish', targetId: forge, target: { x: 5, y: 0 } });

    colony.run(25);

    assert.equal(colony.world.getComponent(forge, 'workshop'), undefined);
    assert.equal(colony.world.getComponent(forge, 'position'), undefined);
    assert.equal(colony.jobBoard.jobs.length, 0);
});

test('démolir : une porte intégrée redevient du sol', () => {
    const colony = setupColony(makeTerrain(['....+...']));
    addDwarf(colony.world, 0, 0);
    colony.jobBoard.post({ type: 'demolish', target: { x: 4, y: 0 } });

    colony.run(25);

    assert.equal(colony.terrain.get(4, 0), 'floor');
});

test('démolir : un objet marqué est détruit, le haul ne le vole pas', () => {
    const colony = setupColony(openTerrain(8, 1));
    addDwarf(colony.world, 0, 0);
    colony.stockpiles.add(7, 0);
    const stone = addStone(colony.world, 5, 0);
    colony.jobBoard.post({ type: 'demolish', targetId: stone, target: { x: 5, y: 0 } });

    colony.run(25);

    assert.equal(colony.world.getComponent(stone, 'item'), undefined);
    assert.equal(colony.jobBoard.jobs.length, 0);
});

test("démolir : l'outil annule une désignation, retire une zone, cible une entité", () => {
    const colony = setupColony(openTerrain(8, 2));
    const control = makeControl(colony);

    // 1. chantier en attente → annulation instantanée
    colony.jobBoard.post({ type: 'dig', target: { x: 6, y: 0 } });
    control.demolish(6, 0);
    assert.equal(colony.jobBoard.hasJobAt(6, 0, 'dig'), false);

    // 2. zone au sol → retrait instantané
    colony.stockpiles.add(2, 1);
    control.demolish(2, 1);
    assert.equal(colony.stockpiles.has(2, 1), false);

    // 3. entité physique → job de démolition ciblant l'entité
    const bed = spawnFromDefinition(colony.world, data.items.bed, { x: 4, y: 1 });
    colony.world.removeComponent(bed, 'item');
    control.demolish(4, 1);
    const job = colony.jobBoard.jobs.find((j) => j.type === 'demolish');
    assert.ok(job);
    assert.equal(job.targetId, bed);
});
