import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, openTerrain, setupColony, addDwarf, addBread, addBed } from './helpers.js';

const FIRST_CHECK = 900;

function attractiveColony({ dwarves = 3, bread = 10, beds = 0 } = {}) {
    const colony = setupColony(openTerrain(30, 10), { migrants: true });
    for (let i = 0; i < dwarves; i++) {
        addDwarf(colony.world, 5 + i, 5, { name: `Fondateur${i}` });
    }
    for (let i = 0; i < bread; i++) {
        addBread(colony.world, 10 + (i % 5), 4 + Math.floor(i / 5));
    }
    for (let i = 0; i < beds; i++) {
        addBed(colony.world, 20 + i, 5);
    }
    return colony;
}

test('migrants : colonie prospère avec lits -> deux arrivées nommées', () => {
    const colony = attractiveColony({ dwarves: 3, bread: 10, beds: 3 });
    const arrivals = colony.collect(EVENTS.MIGRANT_ARRIVED);
    colony.run(FIRST_CHECK + 10);
    assert.equal(arrivals.length, 2);
    assert.equal(colony.world.query('worker').length, 5);
    const names = colony.world
        .query('identity')
        .map((id) => colony.world.getComponent(id, 'identity').name);
    assert.equal(new Set(names).size, names.length, 'les noms doivent être uniques');
    assert.ok(arrivals.every((event) => typeof event.name === 'string' && event.name.length > 0));
});

test('migrants : nourriture en surplus mais pas de lits -> une seule arrivée', () => {
    const colony = attractiveColony({ dwarves: 3, bread: 10, beds: 0 });
    const arrivals = colony.collect(EVENTS.MIGRANT_ARRIVED);
    colony.run(FIRST_CHECK + 10);
    assert.equal(arrivals.length, 1);
});

test('migrants : sans surplus de nourriture, personne ne vient', () => {
    const colony = attractiveColony({ dwarves: 3, bread: 3, beds: 3 });
    const arrivals = colony.collect(EVENTS.MIGRANT_ARRIVED);
    colony.run(FIRST_CHECK + 10);
    assert.equal(arrivals.length, 0);
});

test('migrants : la population est plafonnée', () => {
    const colony = attractiveColony({ dwarves: 12, bread: 20, beds: 12 });
    const arrivals = colony.collect(EVENTS.MIGRANT_ARRIVED);
    colony.run(FIRST_CHECK + 10);
    assert.equal(arrivals.length, 0);
    assert.equal(colony.world.query('worker').length, 12);
});

test('migrants : personne ne migre vers une colonie morte', () => {
    const colony = attractiveColony({ dwarves: 0, bread: 10, beds: 3 });
    const arrivals = colony.collect(EVENTS.MIGRANT_ARRIVED);
    colony.run(FIRST_CHECK + 10);
    assert.equal(arrivals.length, 0);
});
