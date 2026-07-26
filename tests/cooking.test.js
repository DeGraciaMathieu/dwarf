import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    openTerrain,
    setupColony,
    addDwarf,
    addKitchen,
    addMushroom,
    addMeal,
    addBread,
} from './helpers.js';

const mealsInStock = (world) => world.query('food', 'item', 'cooked').length;
const pendingMealJobs = (jobBoard) =>
    jobBoard.jobs.filter((job) => job.type === 'craft' && job.recipe === 'meal').length;

test('cuisine : l\'intendance produit des plats jusqu\'à la cible puis s\'arrête', () => {
    const colony = setupColony(openTerrain(12, 3), { objectives: [{ recipe: 'meal', target: 2 }] });
    addKitchen(colony.world, 6, 1);
    addMushroom(colony.world, 2, 1);
    addMushroom(colony.world, 3, 1);
    addMushroom(colony.world, 8, 1);
    addMushroom(colony.world, 9, 1);
    addDwarf(colony.world, 5, 1, { name: 'Bofur' });
    addDwarf(colony.world, 7, 1, { name: 'Urist' });

    colony.run(200);

    assert.equal(mealsInStock(colony.world), 2, 'deux plats sont en stock');
    assert.equal(pendingMealJobs(colony.jobBoard), 0, 'plus aucun job de cuisine en file une fois la cible atteinte');
});

test('cuisine : un plat préparé remonte plus le moral qu\'une récolte crue', () => {
    const colony = setupColony(openTerrain(14, 3));
    const feaster = addDwarf(colony.world, 1, 1, { name: 'Bofur', hunger: 80 });
    const forager = addDwarf(colony.world, 12, 1, { name: 'Urist', hunger: 80 });
    addMeal(colony.world, 2, 1);
    addMushroom(colony.world, 11, 1);

    colony.run(10);

    const feasterMorale = colony.world.getComponent(feaster, 'morale').value;
    const foragerMorale = colony.world.getComponent(forager, 'morale').value;
    assert.ok(colony.world.getComponent(feaster, 'hunger').value < 80, 'le mangeur de plat a bien mangé');
    assert.ok(colony.world.getComponent(forager, 'hunger').value < 80, 'le mangeur de cru a bien mangé');
    assert.ok(feasterMorale > foragerMorale, 'le plat préparé remonte davantage le moral');
});

test('cuisine : sans plat, un affamé mange du cru et survit', () => {
    const colony = setupColony(openTerrain(8, 3));
    const dwarf = addDwarf(colony.world, 1, 1, { name: 'Urist', hunger: 85 });
    addBread(colony.world, 3, 1);

    colony.run(12);

    assert.ok(colony.world.getComponent(dwarf, 'hunger').value < 85, 'il a mangé la nourriture crue disponible');
    assert.notEqual(colony.world.getComponent(dwarf, 'health'), undefined, 'il est toujours en vie');
});
