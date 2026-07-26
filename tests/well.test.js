import { test } from 'node:test';
import assert from 'node:assert/strict';
import { data, makeTerrain, setupColony, addDwarf, addWell, addBeer, seasonTicks, EVENTS } from './helpers.js';

test('puits : un nain se désaltère au puits, même en hiver quand les berges gèlent', () => {
    const colony = setupColony(makeTerrain(['~....', '.....', '.....']));
    const dwarf = addDwarf(colony.world, 3, 1, { name: 'Urist', thirst: 80 });
    addWell(colony.world, 2, 1);
    const drank = colony.collect(EVENTS.DWARF_DRANK);

    seasonTicks(colony.world, 1800); // hiver : la berge est gelée
    colony.run(10);

    assert.equal(colony.world.getComponent(dwarf, 'thirst').value, 0, 'sa soif est étanchée');
    assert.ok(drank.length >= 1, 'il a bu de l\'eau au puits (pas de la bière)');
});

test('puits : la bière reste préférée au puits', () => {
    const colony = setupColony(makeTerrain(['.....', '.....', '.....']));
    const dwarf = addDwarf(colony.world, 2, 1, { name: 'Bofur', thirst: 80 });
    addWell(colony.world, 1, 1);
    addBeer(colony.world, 3, 1);
    const drankBeer = colony.collect(EVENTS.DWARF_DRANK_BEER);

    colony.run(10);

    assert.equal(colony.world.getComponent(dwarf, 'thirst').value, 0);
    assert.ok(drankBeer.length >= 1, 'la bière (remontant de moral) passe avant le puits');
});

test('data : le puits est un meuble de pierre taillé à l\'atelier de taille', () => {
    assert.ok(data.items.well.components.well);
    assert.equal(data.recipes.well.workshop, 'masonry');
    assert.equal(data.recipes.well.ingredient, 'stone');
});
