import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTerrain, largestWalkableRegion } from '../src/core/terrain.js';
import { spawnFromDefinition } from '../src/core/spawn.js';
import { EVENTS, data, openTerrain, setupColony, addDwarf, addGoblin, addBread } from './helpers.js';

test('colonie : creuser la montagne et vivre 1200 ticks sur une carte générée', () => {
    const terrain = generateTerrain(40, 25, data.tiles);
    const region = largestWalkableRegion(terrain);
    const colony = setupColony(terrain);
    const pick = (i) => region[(i * 53) % region.length];
    for (let i = 0; i < 5; i++) {
        const id = spawnFromDefinition(colony.world, data.creatures.dwarf, pick(i));
        colony.world.addComponent(id, 'identity', { name: `Nain${i}` });
    }
    for (let i = 0; i < 8; i++) {
        spawnFromDefinition(colony.world, data.items.bread, pick(i + 40));
    }
    region
        .filter(({ x, y }) => terrain.get(x, y) === 'floor')
        .slice(0, 3)
        .forEach(({ x, y }) => colony.farms.add(x, y));

    const regionSet = new Set(region.map((p) => p.y * 40 + p.x));
    let entry = null;
    outer: for (let y = 1; y < 24; y++) {
        for (let x = 20; x < 38; x++) {
            if (terrain.get(x, y) !== 'wall') {
                continue;
            }
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (regionSet.has((y + dy) * 40 + (x + dx))) {
                        entry = { x, y };
                        break outer;
                    }
                }
            }
        }
    }
    assert.ok(entry, 'un front de montagne doit être atteignable');
    for (let dx = 0; dx < 5; dx++) {
        if (entry.x + dx < 39 && terrain.get(entry.x + dx, entry.y) === 'wall') {
            colony.jobBoard.post({ type: 'dig', target: { x: entry.x + dx, y: entry.y } });
        }
    }

    const meals = colony.collect(EVENTS.DWARF_ATE);
    const deaths = colony.collect(EVENTS.DWARF_DIED);
    colony.run(1200);
    assert.equal(terrain.get(entry.x, entry.y), 'floor', 'le tunnel doit être entamé');
    assert.ok(meals.length > 0);
    assert.equal(deaths.length, 0);
    assert.equal(colony.world.query('worker').length, 5);
});

test('colonie : trois nains repoussent un gobelin sans perte', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 2, 0, { name: 'Urist' });
    addDwarf(colony.world, 2, 1, { name: 'Vala' });
    addDwarf(colony.world, 2, 2, { name: 'Bofur' });
    addGoblin(colony.world, 15, 1);
    const victories = colony.collect(EVENTS.GOBLIN_SLAIN);
    const deaths = colony.collect(EVENTS.DWARF_DIED);
    colony.run(200);
    assert.equal(victories.length, 1);
    assert.equal(deaths.length, 0);
    assert.equal(colony.world.query('worker').length, 3);
});

test('colonie : la ferme et le stock forment une boucle auto-suffisante', () => {
    const colony = setupColony(openTerrain(10, 3));
    addDwarf(colony.world, 0, 0, { hungerRate: 1 });
    colony.farms.add(5, 1);
    colony.stockpiles.add(9, 2);
    const events = [];
    colony.bus.on(EVENTS.CROP_HARVESTED, () => events.push('récolte'));
    colony.bus.on(EVENTS.DWARF_ATE, () => events.push('repas'));
    colony.run(600);
    assert.ok(events.includes('récolte'));
    assert.ok(events.includes('repas'));
    const hunger = colony.world.getComponent(colony.world.query('worker')[0], 'hunger');
    assert.ok(hunger.value < 100, 'le nain ne meurt pas de faim');
});

test('colonie : le vétéran blessé fuit, dort et redevient brave', () => {
    const colony = setupColony(openTerrain(30, 1));
    const dwarf = addDwarf(colony.world, 10, 0, { health: 10, fatigue: 100 });
    addBread(colony.world, 25, 0);
    colony.run(60);
    const health = colony.world.getComponent(dwarf, 'health');
    assert.ok(health.value > 10, 'le sommeil doit soigner');
});
