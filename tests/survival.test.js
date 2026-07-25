import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    EVENTS,
    makeTerrain,
    openTerrain,
    setupColony,
    addDwarf,
    addBread,
    addBed,
} from './helpers.js';

test('faim : le nain mange le pain atteignable et ignore celui emmuré', () => {
    const terrain = makeTerrain(['.....#...', '.....#.#.', '.....###.']);
    const colony = setupColony(terrain);
    addDwarf(colony.world, 4, 0, { hunger: 69, hungerRate: 1 });
    const trapped = addBread(colony.world, 6, 1);
    const reachable = addBread(colony.world, 0, 2);
    const meals = colony.collect(EVENTS.DWARF_ATE);
    colony.run(30);
    assert.equal(meals.length, 1);
    assert.equal(colony.world.getComponent(reachable, 'food'), undefined);
    assert.notEqual(colony.world.getComponent(trapped, 'food'), undefined);
});

test('anti-famine : un affamé sans nourriture continue de travailler', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0, { hunger: 70, hungerRate: 0.2 });
    colony.farms.add(10, 1);
    const events = [];
    colony.bus.on(EVENTS.CROP_HARVESTED, () => events.push('récolte'));
    colony.bus.on(EVENTS.DWARF_ATE, () => events.push('repas'));
    colony.run(300);
    assert.deepEqual(events.slice(0, 2), ['récolte', 'repas']);
});

test('sommeil : cycle endormi/réveillé puis nouvelle sieste', () => {
    const colony = setupColony(openTerrain(10, 3));
    addDwarf(colony.world, 5, 1, { fatigueRate: 2 });
    const events = [];
    colony.bus.on(EVENTS.DWARF_ASLEEP, () => events.push('endormi'));
    colony.bus.on(EVENTS.DWARF_WOKE, () => events.push('réveillé'));
    colony.run(100);
    assert.deepEqual(events.slice(0, 2), ['endormi', 'réveillé']);
    assert.ok(events.length > 2, 'il doit se rendormir ensuite');
});

test('priorités : plus affamé que fatigué, il mange avant de dormir', () => {
    const colony = setupColony(openTerrain(10, 3));
    addDwarf(colony.world, 5, 1, { hunger: 90, fatigue: 85 });
    addBread(colony.world, 8, 1);
    const events = [];
    colony.bus.on(EVENTS.DWARF_ATE, () => events.push('repas'));
    colony.bus.on(EVENTS.DWARF_ASLEEP, () => events.push('endormi'));
    colony.run(60);
    assert.deepEqual(events, ['repas', 'endormi']);
});

test('priorités : la famine réveille le dormeur avant récupération complète', () => {
    const colony = setupColony(openTerrain(20, 3));
    const dwarf = addDwarf(colony.world, 5, 1, { hunger: 60, hungerRate: 2, fatigue: 115 });
    colony.world.getComponent(dwarf, 'fatigue').recovery = 2;
    addBread(colony.world, 8, 1);
    const events = [];
    colony.bus.on(EVENTS.DWARF_ASLEEP, () => events.push('endormi'));
    colony.bus.on(EVENTS.DWARF_WOKE, () =>
        events.push(`réveillé@${Math.round(colony.world.getComponent(dwarf, 'fatigue').value)}`)
    );
    colony.bus.on(EVENTS.DWARF_ATE, () => events.push('repas'));
    colony.run(120);
    assert.equal(events[0], 'endormi');
    assert.match(events[1], /^réveillé@/);
    assert.notEqual(events[1], 'réveillé@0');
    assert.equal(events[2], 'repas');
    assert.equal(events[3], 'endormi');
});

test('lit : sommeil plus court et soins accélérés', () => {
    const sleepScenario = (withBed) => {
        const colony = setupColony(openTerrain(10, 1));
        const dwarf = addDwarf(colony.world, 0, 0, { fatigue: 100, health: 20 });
        if (withBed) {
            addBed(colony.world, 4, 0);
        }
        let wokeAt = -1;
        let ticks = 0;
        colony.bus.on(EVENTS.DWARF_WOKE, () => {
            if (wokeAt < 0) {
                wokeAt = ticks;
            }
        });
        for (; ticks < 80 && wokeAt < 0; ticks++) {
            colony.world.tick(colony.bus);
        }
        return {
            wokeAt,
            health: colony.world.getComponent(dwarf, 'health').value,
            position: colony.world.getComponent(dwarf, 'position'),
        };
    };
    const ground = sleepScenario(false);
    const inBed = sleepScenario(true);
    assert.equal(inBed.position.x, 4, 'il doit dormir sur le lit');
    assert.ok(inBed.wokeAt < ground.wokeAt, 'réveil plus tôt en lit');
    assert.ok(inBed.health > ground.health, 'mieux soigné en lit');
    assert.ok(ground.health > 20, 'le sol soigne un peu aussi');
});

test('lit : un seul dormeur par lit', () => {
    const colony = setupColony(openTerrain(10, 1));
    const a = addDwarf(colony.world, 0, 0, { fatigue: 100 });
    const b = addDwarf(colony.world, 9, 0, { fatigue: 100 });
    addBed(colony.world, 5, 0);
    colony.run(8);
    const onBed = [a, b].filter((id) => {
        const position = colony.world.getComponent(id, 'position');
        return position.x === 5 && position.y === 0;
    });
    assert.ok(onBed.length <= 1);
});

test('arbitre : sans job disponible les nains errent au lieu de geler', () => {
    const colony = setupColony(openTerrain(10, 3));
    const dwarf = addDwarf(colony.world, 5, 1);
    colony.run(10);
    assert.equal(colony.world.getComponent(dwarf, 'activity').type, 'wander');
});
