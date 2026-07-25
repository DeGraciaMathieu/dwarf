import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, openTerrain, setupColony, addDwarf, addCorpse, entitiesAt } from './helpers.js';

test('tombes : un nain porte le cadavre jusqu à la tombe et l enterre', () => {
    const colony = setupColony(openTerrain(8, 3));
    addDwarf(colony.world, 0, 0);
    colony.graves.add(6, 1);
    addCorpse(colony.world, 3, 1);
    const buried = colony.collect(EVENTS.CORPSE_BURIED);
    colony.run(80);
    assert.equal(buried.length, 1);
    assert.equal(colony.world.query('corpse').length, 0, 'le cadavre cesse de traîner');
    assert.equal(entitiesAt(colony.world, 'buried', 6, 1).length, 1, 'il repose dans la tombe');
    assert.equal(colony.jobBoard.jobs.length, 0);
});

test('tombes : sans tombe désignée, le cadavre reste sur place et le haul l ignore', () => {
    const colony = setupColony(openTerrain(10, 3));
    addDwarf(colony.world, 0, 0);
    colony.stockpiles.add(8, 1);
    addCorpse(colony.world, 4, 1);
    colony.run(30);
    assert.equal(entitiesAt(colony.world, 'corpse', 4, 1).length, 1);
    assert.equal(colony.jobBoard.jobs.filter((job) => job.type === 'haul').length, 0);
});

test('tombes : un cadavre abandonné se putréfie et ronge le moral des nains proches', () => {
    const colony = setupColony(openTerrain(6, 3));
    const dwarf = addDwarf(colony.world, 1, 1);
    colony.world.removeComponent(dwarf, 'wander');
    addCorpse(colony.world, 2, 1, { decay: 119 });
    const rotted = colony.collect(EVENTS.CORPSE_ROTTED);
    colony.run(40);
    assert.equal(rotted.length, 1, 'une seule annonce de putréfaction');
    assert.ok(
        colony.world.getComponent(dwarf, 'morale').value < 70,
        'la puanteur mine le moral sous le seuil de base'
    );
});

test('tombes : l enterrement apaise les nains témoins', () => {
    const colony = setupColony(openTerrain(6, 1));
    const dwarf = addDwarf(colony.world, 0, 0);
    const morale = colony.world.getComponent(dwarf, 'morale');
    morale.value = 50;
    colony.bus.emit(EVENTS.CORPSE_BURIED, { entityId: dwarf, x: 2, y: 0 });
    colony.bus.flush();
    colony.run(1);
    assert.ok(morale.value > 50, 'le recueillement redonne du moral');
});
