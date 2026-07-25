import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeGame, restoreGame } from '../src/save.js';
import {
    EVENTS,
    openTerrain,
    setupColony,
    addDwarf,
    addGoblin,
    addLog,
    addBread,
    entitiesAt,
} from './helpers.js';

const roundTrip = (game) => JSON.parse(JSON.stringify(serializeGame(game)));

test('sauvegarde : aller-retour complet de l état durable', () => {
    const colony = setupColony(openTerrain(20, 5));
    const dwarf = addDwarf(colony.world, 3, 2, { name: 'Urist', hunger: 42, morale: 55 });
    addBread(colony.world, 8, 1);
    colony.stockpiles.add(15, 4);
    colony.farms.add(10, 2);
    colony.terrain.set(5, 0, 'wall');
    colony.jobBoard.post({ type: 'dig', target: { x: 5, y: 0 } });
    colony.jobBoard.post({ type: 'build', ghost: '#', target: { x: 7, y: 3 } });

    const snapshot = roundTrip(colony);

    colony.world.destroyEntity(dwarf);
    colony.terrain.set(5, 0, 'floor');
    colony.jobBoard.jobs = [];
    colony.stockpiles.tiles.clear();

    restoreGame(colony, snapshot);
    assert.equal(colony.world.getComponent(dwarf, 'identity').name, 'Urist');
    assert.equal(colony.world.getComponent(dwarf, 'hunger').value, 42);
    assert.equal(colony.world.getComponent(dwarf, 'morale').value, 55);
    assert.equal(colony.terrain.get(5, 0), 'wall');
    assert.equal(colony.stockpiles.has(15, 4), true);
    assert.equal(colony.farms.has(10, 2), true);
    assert.equal(colony.jobBoard.jobs.length, 2);
    assert.ok(colony.jobBoard.jobs.every((job) => job.claimedBy === null));
});

test('sauvegarde : l objet porté retrouve une position au sol', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0);
    colony.stockpiles.add(18, 2);
    const log = addLog(colony.world, 10, 0);
    colony.run(15);
    assert.equal(colony.world.getComponent(log, 'position'), undefined, 'la bûche doit être portée');

    const snapshot = roundTrip(colony);
    restoreGame(colony, snapshot);
    assert.notEqual(colony.world.getComponent(log, 'position'), undefined);

    const stored = colony.collect(EVENTS.ITEM_STORED);
    colony.run(80);
    assert.equal(entitiesAt(colony.world, 'item', 18, 2).length, 1);
    assert.ok(stored.length >= 1, 'le transport doit reprendre après chargement');
});

test('sauvegarde : les composants volatils sont purgés puis reconstruits', () => {
    const colony = setupColony(openTerrain(20, 3));
    const dwarf = addDwarf(colony.world, 5, 1, { fatigue: 100 });
    colony.run(5);
    assert.notEqual(colony.world.getComponent(dwarf, 'sleeping'), undefined, 'il doit dormir');

    const snapshot = roundTrip(colony);
    restoreGame(colony, snapshot);
    for (const volatile of ['activity', 'currentJob', 'foodTarget', 'bedTarget']) {
        assert.equal(colony.world.getComponent(dwarf, volatile), undefined, volatile);
    }
    assert.notEqual(
        colony.world.getComponent(dwarf, 'sleeping'),
        undefined,
        'l hystérésis du sommeil survit à la sauvegarde'
    );
    const woke = colony.collect(EVENTS.DWARF_WOKE);
    colony.run(30);
    assert.equal(colony.world.getComponent(dwarf, 'fatigue').value, 0, 'il finit sa nuit');
    assert.equal(woke.length, 1);
});

test('sauvegarde : nextEntityId restauré, pas de collision d identifiants', () => {
    const colony = setupColony(openTerrain(10, 3));
    const dwarf = addDwarf(colony.world, 2, 1);
    const snapshot = roundTrip(colony);

    restoreGame(colony, snapshot);
    const fresh = colony.world.createEntity();
    assert.notEqual(fresh, dwarf);
    assert.equal(colony.world.getComponent(fresh, 'identity'), undefined);
});

test('sauvegarde : la colonie reprend sa vie après restauration', () => {
    const colony = setupColony(openTerrain(20, 5));
    addDwarf(colony.world, 2, 2, { hungerRate: 1 });
    addDwarf(colony.world, 4, 2, { hungerRate: 1 });
    addGoblin(colony.world, 18, 4);
    colony.farms.add(10, 2);
    colony.farms.add(11, 2);
    colony.stockpiles.add(15, 1);
    addBread(colony.world, 6, 1);
    addBread(colony.world, 7, 1);
    colony.run(100);

    const snapshot = roundTrip(colony);
    restoreGame(colony, snapshot);

    const meals = colony.collect(EVENTS.DWARF_ATE);
    colony.run(400);
    assert.equal(colony.world.query('worker').length, 2);
    assert.ok(meals.length > 0, 'la boucle de nourriture doit reprendre');
});
