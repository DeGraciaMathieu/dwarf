import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTerrain, setupColony, addDwarf, addMeal, entitiesAt, EVENTS } from './helpers.js';

test('périssabilité : un plat laissé dehors se gâte et disparaît', () => {
    const colony = setupColony(openTerrain(6, 3));
    const meal = addMeal(colony.world, 2, 1, { freshness: 5 });
    const spoiled = colony.collect(EVENTS.FOOD_SPOILED);

    colony.run(6);

    assert.equal(colony.world.getComponent(meal, 'food'), undefined, 'le plat a disparu');
    assert.equal(spoiled.length, 1, 'une annonce de plat gâté');
});

test('garde-manger : un plat rangé au garde-manger est conservé', () => {
    const colony = setupColony(openTerrain(6, 3));
    colony.stockpiles.add(2, 1, 'pantry');
    const meal = addMeal(colony.world, 2, 1, { freshness: 5 });

    colony.run(30);

    assert.ok(colony.world.getComponent(meal, 'food'), 'le plat est toujours frais');
    assert.equal(
        colony.world.getComponent(meal, 'perishable').freshness,
        5,
        'sa fraîcheur ne baisse pas au garde-manger'
    );
});

test('garde-manger : un plat périssable est rangé au garde-manger de préférence', () => {
    const colony = setupColony(openTerrain(14, 3));
    addDwarf(colony.world, 1, 1, { name: 'Bofur' });
    addMeal(colony.world, 2, 1);
    colony.stockpiles.add(6, 1, 'food'); // stockage nourriture ordinaire, plus proche
    colony.stockpiles.add(11, 1, 'pantry'); // garde-manger, plus loin

    colony.run(120);

    assert.equal(entitiesAt(colony.world, 'cooked', 11, 1).length, 1, 'le plat file au garde-manger');
    assert.equal(entitiesAt(colony.world, 'cooked', 6, 1).length, 0, 'et pas au stockage ordinaire');
});
