import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnFromDefinition } from '../src/core/spawn.js';
import { data, openTerrain, setupColony, addDwarf } from './helpers.js';

test('confort : un nain près d\'un brasero garde un meilleur moral qu\'un témoin', () => {
    const colony = setupColony(openTerrain(30, 3));
    // brasero posé (sans 'item' : c'est un meuble, pas un objet à ranger)
    const brazier = spawnFromDefinition(colony.world, data.items.brazier, { x: 5, y: 1 });
    colony.world.removeComponent(brazier, 'item');

    const near = addDwarf(colony.world, 6, 1, { name: 'Dagna', morale: 60 });
    const far = addDwarf(colony.world, 25, 1, { name: 'Kib', morale: 60 });
    // immobiles : on isole l'effet de proximité de l'errance
    colony.world.removeComponent(near, 'wander');
    colony.world.removeComponent(far, 'wander');

    colony.run(60);

    const nearMorale = colony.world.getComponent(near, 'morale').value;
    const farMorale = colony.world.getComponent(far, 'morale').value;
    assert.ok(nearMorale > farMorale, `près ${nearMorale} > loin ${farMorale}`);
    assert.ok(nearMorale > 60, 'le confort fait progresser le moral, indépendamment de la bière');
});

test('data : le brasero est un meuble de confort fabricable à l\'atelier de taille', () => {
    assert.ok(data.items.brazier.components.comfort);
    assert.equal(data.recipes.brazier.workshop, 'masonry');
    assert.equal(data.recipes.brazier.ingredient, 'stone');
});
