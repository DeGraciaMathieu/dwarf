import test from 'node:test';
import assert from 'node:assert/strict';
import {
    EVENTS,
    setupColony,
    makeTerrain,
    openTerrain,
    addDwarf,
    addMushroom,
    addBrewery,
    addBeer,
} from './helpers.js';

test('un nain brasse une bière à la brasserie à partir d\'un champignon', () => {
    const colony = setupColony(openTerrain(10, 5));
    addDwarf(colony.world, 1, 2);
    addBrewery(colony.world, 7, 2);
    addMushroom(colony.world, 3, 2);
    colony.jobBoard.post({ type: 'craft', recipe: 'beer', target: { x: 7, y: 2 } });
    const brewed = colony.collect(EVENTS.ITEM_CRAFTED);

    colony.run(60);

    assert.equal(brewed.length, 1);
    assert.equal(colony.world.query('drink', 'position').length, 1);
    assert.equal(colony.world.query('brewable').length, 0);
});

test('la menuiserie ne brasse pas : sans brasserie le job attend', () => {
    const colony = setupColony(openTerrain(10, 5));
    addDwarf(colony.world, 1, 2);
    const carpentryId = colony.world.createEntity();
    colony.world.addComponent(carpentryId, 'position', { x: 5, y: 2 });
    colony.world.addComponent(carpentryId, 'workshop', { type: 'carpentry' });
    addMushroom(colony.world, 3, 2);
    colony.jobBoard.post({ type: 'craft', recipe: 'beer', target: { x: 5, y: 2 } });
    const brewed = colony.collect(EVENTS.ITEM_CRAFTED);

    colony.run(40);

    assert.equal(brewed.length, 0);
    assert.equal(colony.world.query('drink', 'position').length, 0);
    assert.equal(colony.jobBoard.hasAvailableJobs(), false);
});

test('un brassage en pénurie reprend quand une récolte fournit un champignon', () => {
    const colony = setupColony(openTerrain(10, 5));
    addDwarf(colony.world, 8, 2);
    addBrewery(colony.world, 7, 2);
    colony.farms.add(4, 2);
    const cropId = colony.world.createEntity();
    colony.world.addComponent(cropId, 'position', { x: 4, y: 2 });
    colony.world.addComponent(cropId, 'renderable', { glyph: ',', color: '#fff' });
    colony.world.addComponent(cropId, 'crop', { growth: 80, matureAt: 80 });
    colony.jobBoard.post({ type: 'craft', recipe: 'beer', target: { x: 7, y: 2 } });
    const brewed = colony.collect(EVENTS.ITEM_CRAFTED);

    colony.run(100);

    assert.equal(brewed.length, 1);
});

test('un nain assoiffé préfère une bière du stock à la berge et y gagne du moral', () => {
    const terrain = makeTerrain([
        '..........',
        '....~.....',
        '..........',
    ]);
    const colony = setupColony(terrain);
    const dwarfId = addDwarf(colony.world, 1, 1, { thirst: 80 });
    addBeer(colony.world, 8, 0);
    const beers = colony.collect(EVENTS.DWARF_DRANK_BEER);
    const sips = colony.collect(EVENTS.DWARF_DRANK);

    colony.run(30);

    assert.equal(beers.length, 1);
    assert.equal(sips.length, 0);
    assert.equal(colony.world.query('drink', 'position').length, 0);
    const morale = colony.world.getComponent(dwarfId, 'morale');
    assert.ok(morale.value > 75, `moral attendu remonté par la bière, obtenu ${morale.value}`);
});
