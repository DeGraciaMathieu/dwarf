import test from 'node:test';
import assert from 'node:assert/strict';
import {
    EVENTS,
    setupColony,
    openTerrain,
    addDwarf,
    addMushroom,
    addBrewery,
    addBeer,
} from './helpers.js';

const brewJobs = (colony) =>
    colony.jobBoard.jobs.filter((job) => job.type === 'craft' && job.recipe === 'beer');

test('intendance : le stock de bières converge vers la cible sans aucun ordre', () => {
    const colony = setupColony(openTerrain(12, 5), {
        objectives: [{ recipe: 'beer', target: 3 }],
    });
    addDwarf(colony.world, 1, 2);
    addBrewery(colony.world, 9, 2);
    for (let i = 0; i < 4; i++) {
        addMushroom(colony.world, 4, 2);
    }

    colony.run(300);

    assert.equal(colony.world.query('drink', 'position').length, 3);
    assert.equal(brewJobs(colony).length, 0);
});

test('intendance : jamais plus de jobs postés que nécessaire, à chaque tick', () => {
    const colony = setupColony(openTerrain(12, 5), {
        objectives: [{ recipe: 'beer', target: 3 }],
    });
    addDwarf(colony.world, 1, 2);
    addBrewery(colony.world, 9, 2);
    for (let i = 0; i < 6; i++) {
        addMushroom(colony.world, 4, 2);
    }

    for (let tick = 0; tick < 300; tick++) {
        colony.run(1);
        const stock = colony.world.query('drink', 'position').length;
        const pending = brewJobs(colony).length;
        assert.ok(
            stock + pending <= 3,
            `tick ${tick} : stock ${stock} + jobs ${pending} dépasse la cible 3`
        );
    }
});

test('intendance : le surplus non réclamé est retiré, le job réclamé va à son terme', () => {
    const objectives = [{ recipe: 'beer', target: 3 }];
    const colony = setupColony(openTerrain(12, 5), { objectives });
    addDwarf(colony.world, 1, 2);
    addBrewery(colony.world, 9, 2);
    for (let i = 0; i < 3; i++) {
        addMushroom(colony.world, 4, 2);
    }

    colony.run(5);
    assert.equal(brewJobs(colony).length, 3);
    assert.equal(brewJobs(colony).filter((job) => job.claimedBy !== null).length, 1);

    // le stock est atteint par un autre chemin : trois bières apparaissent
    for (let i = 0; i < 3; i++) {
        addBeer(colony.world, 10, 2);
    }
    colony.run(2);

    const remaining = brewJobs(colony);
    assert.equal(remaining.length, 1);
    assert.ok(remaining[0].claimedBy !== null);

    colony.run(300);
    assert.equal(colony.world.query('drink', 'position').length, 4);
    assert.equal(brewJobs(colony).length, 0);
});

test('intendance : sans brassable rien n\'est posté, un brassable relance la production', () => {
    const colony = setupColony(openTerrain(12, 5), {
        objectives: [{ recipe: 'beer', target: 1 }],
    });
    addDwarf(colony.world, 1, 2);
    addBrewery(colony.world, 9, 2);
    const brewed = colony.collect(EVENTS.ITEM_CRAFTED);

    colony.run(60);
    assert.equal(colony.jobBoard.jobs.length, 0);
    assert.equal(brewed.length, 0);

    addMushroom(colony.world, 4, 2);
    colony.run(100);

    assert.equal(brewed.length, 1);
    assert.equal(colony.world.query('drink', 'position').length, 1);
});
