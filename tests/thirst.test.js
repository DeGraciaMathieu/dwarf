import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, makeTerrain, openTerrain, setupColony, addDwarf, entitiesAt } from './helpers.js';

test('soif : le nain va boire à la berge puis retourne à sa vie', () => {
    const colony = setupColony(
        makeTerrain(['....~~..............', '....~~..............', '....~~..............'])
    );
    const dwarf = addDwarf(colony.world, 18, 1, { thirst: 60, thirstRate: 1 });
    const events = [];
    colony.bus.on(EVENTS.DWARF_THIRSTY, () => events.push('soif'));
    colony.bus.on(EVENTS.DWARF_DRANK, () => events.push('bu'));
    colony.run(40);
    assert.deepEqual(events.slice(0, 2), ['soif', 'bu']);
    assert.ok(colony.world.getComponent(dwarf, 'thirst').value < 40);
    assert.notEqual(colony.world.getComponent(dwarf, 'activity').type, 'drink');
});

test('soif : boire prime sur le travail, le job est relâché', () => {
    const colony = setupColony(
        makeTerrain(['....~~..............', '....~~..............', '....~~..............', '....~~..............'])
    );
    const dwarf = addDwarf(colony.world, 18, 2, { thirst: 60, thirstRate: 1 });
    colony.jobBoard.post({ type: 'fish', target: { x: 5, y: 3 } });
    colony.run(2);
    assert.notEqual(colony.world.getComponent(dwarf, 'currentJob'), undefined);
    colony.run(5);
    assert.equal(colony.world.getComponent(dwarf, 'activity').type, 'drink');
    assert.equal(colony.world.getComponent(dwarf, 'currentJob'), undefined);
    assert.equal(colony.jobBoard.jobs[0].claimedBy, null);
});

test('soif : sans eau accessible, il renonce et continue de travailler', () => {
    // l'eau existe mais elle est emmurée : aucune berge praticable
    const terrain = makeTerrain(['~#........', '~#........', '~#........']);
    const colony = setupColony(terrain);
    const dwarf = addDwarf(colony.world, 5, 1, { thirst: 70, thirstRate: 0.5 });
    colony.jobBoard.post({ type: 'dig', target: { x: 1, y: 1 } });
    const events = [];
    colony.bus.on(EVENTS.WALL_DUG, () => events.push('creusé'));
    colony.bus.on(EVENTS.DWARF_DRANK, () => events.push('bu'));
    colony.run(80);
    assert.deepEqual(events, ['creusé', 'bu'], 'il creuse malgré la soif, puis boit par la brèche');
    assert.notEqual(colony.world.getComponent(dwarf, 'worker'), undefined);
});

test('soif : la déshydratation tue plus vite que la faim', () => {
    const colony = setupColony(openTerrain(10, 3));
    const dwarf = addDwarf(colony.world, 5, 1, { name: 'Dagna', thirst: 100, health: 5 });
    const dehydrated = colony.collect(EVENTS.DWARF_DEHYDRATED);
    const deaths = colony.collect(EVENTS.DWARF_DIED);
    colony.run(30);
    assert.equal(dehydrated.length, 1);
    assert.equal(deaths.length, 1);
    assert.equal(deaths[0].name, 'Dagna');
    assert.equal(deaths[0].cause, 'dehydration');
    assert.equal(colony.world.getComponent(dwarf, 'worker'), undefined);
    assert.equal(colony.world.query('item').length, 1, 'un cadavre reste');
});

test('soif : un repas in extremis à la berge arrête l agonie', () => {
    const colony = setupColony(makeTerrain(['....~~....', '....~~....', '....~~....']));
    const dwarf = addDwarf(colony.world, 8, 1, { thirst: 100, health: 10 });
    const deaths = colony.collect(EVENTS.DWARF_DIED);
    colony.run(30);
    assert.equal(deaths.length, 0);
    const thirst = colony.world.getComponent(dwarf, 'thirst');
    assert.ok(thirst.value < 100, 'il a bu');
    assert.equal(colony.world.getComponent(dwarf, 'dehydrated'), undefined);
    const healthAfterDrink = colony.world.getComponent(dwarf, 'health').value;
    colony.run(20);
    assert.ok(colony.world.getComponent(dwarf, 'health').value >= healthAfterDrink);
});
