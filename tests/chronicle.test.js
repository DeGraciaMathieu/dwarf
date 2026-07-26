import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeGame, restoreGame } from '../src/save.js';
import { SEASON_LENGTH } from '../src/systems/seasonSystem.js';
import { chronicleScore } from '../src/systems/chronicleSystem.js';
import { EVENTS, openTerrain, setupColony, addDwarf, seasonTicks } from './helpers.js';

const getChronicle = (colony) => {
    const id = colony.world.query('chronicle')[0];
    return colony.world.getComponent(id, 'chronicle');
};

test('chronique : agrège les faits accomplis en compteurs cohérents', () => {
    const colony = setupColony(openTerrain(10, 10));
    const alice = addDwarf(colony.world, 4, 4, { name: 'Alice' });
    const bob = addDwarf(colony.world, 5, 4, { name: 'Bob' });

    colony.bus.emit(EVENTS.MIGRANT_ARRIVED, { name: 'Carla' });
    colony.bus.emit(EVENTS.MIGRANT_ARRIVED, { name: 'Dora' });
    colony.bus.emit(EVENTS.DWARF_DIED, { name: 'Edric', cause: 'starvation' });
    colony.bus.emit(EVENTS.GOBLIN_SLAIN, { killerId: alice });
    colony.bus.emit(EVENTS.ITEM_CRAFTED, { entityId: alice, label: 'une épée' });
    colony.bus.emit(EVENTS.DWARF_BEFRIENDED, { entityId: alice, otherId: bob });
    colony.bus.emit(EVENTS.DWARF_FELL_OUT, { entityId: alice, otherId: bob });
    colony.run(2);

    const chronicle = getChronicle(colony);
    assert.equal(chronicle.arrivals, 2);
    assert.equal(chronicle.deaths, 1);
    assert.equal(chronicle.goblinsSlain, 1);
    assert.equal(chronicle.masterworks, 1);
    assert.equal(chronicle.friendships, 1);
    assert.equal(chronicle.rivalries, 1);
    assert.equal(chronicle.peakPopulation, 2);
    assert.deepEqual(chronicle.deathsLog, [{ name: 'Edric', cause: 'starvation' }]);
    assert.deepEqual(chronicle.friendshipsLog, [{ a: 'Alice', b: 'Bob' }]);
    assert.equal(chronicleScore(chronicle), 2 * 20 + 1 * 15 + 1 * 10 + 1 * 5 - 1 * 25);
});

test('chronique : émet colony.ended exactement une fois à l extinction', () => {
    const colony = setupColony(openTerrain(10, 10));
    const dwarf = addDwarf(colony.world, 4, 4, { name: 'Urist' });
    colony.run(1);

    const ended = colony.collect(EVENTS.COLONY_ENDED);
    colony.world.destroyEntity(dwarf);
    colony.run(6);

    assert.equal(ended.length, 1);
    assert.equal(getChronicle(colony).ended, true);
    assert.equal(ended[0].peakPopulation, 1);
});

test('chronique : pas de colony.ended tant qu aucun nain n a vécu', () => {
    const colony = setupColony(openTerrain(10, 10));
    const ended = colony.collect(EVENTS.COLONY_ENDED);
    colony.run(5);
    assert.equal(ended.length, 0);
});

test('chronique : compte les hivers traversés via les saisons', () => {
    const colony = setupColony(openTerrain(10, 10));
    addDwarf(colony.world, 4, 4);

    seasonTicks(colony.world, SEASON_LENGTH * 3 - 1);
    colony.run(2);
    seasonTicks(colony.world, SEASON_LENGTH * 7 - 1);
    colony.run(2);
    seasonTicks(colony.world, SEASON_LENGTH * 11 - 1);
    colony.run(2);

    assert.equal(getChronicle(colony).wintersSurvived, 3);
});

test('chronique : survit à la sauvegarde/chargement', () => {
    const colony = setupColony(openTerrain(10, 10));
    addDwarf(colony.world, 4, 4);
    colony.bus.emit(EVENTS.MIGRANT_ARRIVED, { name: 'Carla' });
    colony.bus.emit(EVENTS.GOBLIN_SLAIN, { killerId: 1 });
    colony.run(2);

    const before = structuredClone(getChronicle(colony));
    const snapshot = JSON.parse(JSON.stringify(serializeGame(colony)));

    colony.world.components.get('chronicle').clear();
    restoreGame(colony, snapshot);

    assert.deepEqual(getChronicle(colony), before);
});
