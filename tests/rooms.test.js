import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTerrain, setupColony, addDwarf, addBed, addBrazier } from './helpers.js';

// place un dormeur prêt à se réveiller sur sa tuile (le repos se conclut en un tick)
function sleeper(colony, x, y, name) {
    const id = addDwarf(colony.world, x, y, { name, fatigue: 6 });
    colony.world.addComponent(id, 'sleeping', {});
    return id;
}

test('chambre : le confort du couchage classe strictement le moral au réveil', () => {
    const colony = setupColony(openTerrain(20, 3));
    const onGround = sleeper(colony, 1, 1, 'Sol');
    const inBed = sleeper(colony, 5, 1, 'Lit');
    addBed(colony.world, 5, 1);
    const inRoom = sleeper(colony, 15, 1, 'Chambre');
    addBed(colony.world, 15, 1);
    colony.bedrooms.add(15, 1);
    addBrazier(colony.world, 14, 1);

    colony.run(2);

    const morale = (id) => colony.world.getComponent(id, 'morale').value;
    assert.ok(morale(inBed) > morale(onGround), 'un lit vaut mieux que le sol');
    assert.ok(morale(inRoom) > morale(inBed), 'une chambre équipée vaut mieux qu\'un lit nu');
});

test('chambre : sans zone désignée, le réveil en lit rend le moral d\'avant', () => {
    const colony = setupColony(openTerrain(6, 3));
    const dwarf = sleeper(colony, 2, 1, 'Urist');
    addBed(colony.world, 2, 1);

    colony.run(2);

    // baseline 70 + rested 10 (comportement historique, zone vide)
    assert.equal(Math.round(colony.world.getComponent(dwarf, 'morale').value), 80);
});

test('chambre : effacer la zone retombe au niveau lit, sans erreur', () => {
    const colony = setupColony(openTerrain(6, 3));
    const dwarf = sleeper(colony, 2, 1, 'Urist');
    addBed(colony.world, 2, 1);
    colony.bedrooms.add(2, 1);
    addBrazier(colony.world, 3, 1);
    colony.bedrooms.remove(2, 1); // la joueuse efface la chambre avant le réveil

    colony.run(2);

    // plus de bonus chambre : on retombe exactement au niveau lit (rested 10)
    assert.equal(Math.round(colony.world.getComponent(dwarf, 'morale').value), 80);
});
