import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, makeTerrain, setupColony, addDwarf, addBread } from './helpers.js';

test('garde-fou : famine sans issue → marqueur + une seule alerte, levé à l\'ouverture', () => {
    // pain derrière un mur : inatteignable
    const colony = setupColony(makeTerrain(['.#.']));
    const dwarf = addDwarf(colony.world, 0, 0, { hunger: 80 });
    addBread(colony.world, 2, 0);
    const alerts = colony.collect(EVENTS.DWARF_CANNOT_REACH_FOOD);

    colony.run(3);
    assert.ok(colony.world.getComponent(dwarf, 'noFoodAccess'), 'marqué affamé sans issue');
    assert.equal(alerts.length, 1);

    // on creuse le passage : la nourriture redevient atteignable
    colony.terrain.set(1, 0, 'floor');
    colony.run(60);

    assert.equal(colony.world.getComponent(dwarf, 'noFoodAccess'), undefined, 'marqueur levé');
    assert.equal(alerts.length, 1, 'aucune ré-émission pendant l\'impasse');
});

test('garde-fou : soif sans issue → marqueur + une seule alerte, levé à l\'ouverture', () => {
    // eau derrière un mur : aucune berge atteignable
    const colony = setupColony(makeTerrain(['.#~']));
    const dwarf = addDwarf(colony.world, 0, 0, { thirst: 70 });
    const alerts = colony.collect(EVENTS.DWARF_ISOLATED_FROM_WATER);

    colony.run(3);
    assert.ok(colony.world.getComponent(dwarf, 'noWaterAccess'), 'marqué isolé de l\'eau');
    assert.equal(alerts.length, 1);

    // on perce le mur : une berge devient accessible
    colony.terrain.set(1, 0, 'floor');
    colony.run(60);

    assert.equal(colony.world.getComponent(dwarf, 'noWaterAccess'), undefined, 'marqueur levé');
    assert.equal(alerts.length, 1, 'aucune ré-émission pendant l\'impasse');
});
