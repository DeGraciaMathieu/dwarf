import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, openTerrain, setupColony, addDwarf, addBread } from './helpers.js';

test('inanition : agonie annoncée puis mort de faim avec cadavre', () => {
    const colony = setupColony(openTerrain(10, 3));
    const dwarf = addDwarf(colony.world, 5, 1, { name: 'Thorik', hunger: 100, health: 6 });
    const starving = colony.collect(EVENTS.DWARF_STARVING);
    const deaths = colony.collect(EVENTS.DWARF_DIED);
    colony.run(60);
    assert.equal(starving.length, 1, 'une seule annonce d agonie');
    assert.equal(deaths.length, 1);
    assert.equal(deaths[0].name, 'Thorik');
    assert.equal(deaths[0].cause, 'starvation');
    assert.equal(colony.world.getComponent(dwarf, 'worker'), undefined);
    assert.equal(colony.world.query('item').length, 1, 'un cadavre reste quelque part');
});

test('inanition : sauvé in extremis par un repas, l érosion s arrête', () => {
    const colony = setupColony(openTerrain(10, 1));
    const dwarf = addDwarf(colony.world, 0, 0, { hunger: 100, health: 20 });
    addBread(colony.world, 4, 0);
    const deaths = colony.collect(EVENTS.DWARF_DIED);
    colony.run(20);
    assert.equal(deaths.length, 0);
    const hunger = colony.world.getComponent(dwarf, 'hunger');
    assert.ok(hunger.value < 100, 'il a mangé');
    assert.equal(colony.world.getComponent(dwarf, 'starving'), undefined);
    const healthAfterMeal = colony.world.getComponent(dwarf, 'health').value;
    colony.run(30);
    assert.ok(
        colony.world.getComponent(dwarf, 'health').value >= healthAfterMeal,
        'la santé ne baisse plus après le repas'
    );
});

test('inanition : le moral s effrite en continu pendant la famine', () => {
    const colony = setupColony(openTerrain(10, 1));
    const dwarf = addDwarf(colony.world, 0, 0, { hunger: 100, health: 30 });
    colony.run(100);
    const morale = colony.world.getComponent(dwarf, 'morale');
    assert.ok(morale.value < 60, `moral attendu bien sous 70, obtenu ${morale.value.toFixed(1)}`);
});

test('inanition : la mort de faim traumatise les témoins comme une mort au combat', () => {
    const colony = setupColony(openTerrain(6, 1));
    addDwarf(colony.world, 0, 0, { hunger: 100, health: 1 });
    const witness = addDwarf(colony.world, 2, 0);
    colony.run(15);
    const morale = colony.world.getComponent(witness, 'morale');
    assert.ok(morale.value < 50, 'le témoin proche encaisse la mort');
});
