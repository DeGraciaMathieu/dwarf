import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DrinkSystem } from '../src/systems/drinkSystem.js';
import { MigrantSystem } from '../src/systems/migrantSystem.js';
import { isWinter } from '../src/systems/seasonSystem.js';
import {
    data,
    openTerrain,
    makeTerrain,
    setupColony,
    addDwarf,
    addBeer,
    addBread,
    addBed,
    seasonTicks,
    EVENTS,
} from './helpers.js';

function addCrop(world, x, y, { growth = 0, matureAt = 100 } = {}) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'renderable', { glyph: ',', color: '#6a8a3a' });
    world.addComponent(id, 'crop', { growth, matureAt });
    return id;
}

test('saisons : le gel suspend la croissance des cultures, le dégel la relance', () => {
    const colony = setupColony(openTerrain(6, 3));
    const crop = addCrop(colony.world, 2, 1);

    seasonTicks(colony.world, 1800); // hiver
    colony.run(5);
    assert.ok(isWinter(colony.world), 'on est bien en hiver');
    assert.equal(colony.world.getComponent(crop, 'crop').growth, 0, 'la culture ne pousse pas sous le gel');

    seasonTicks(colony.world, 0); // printemps
    colony.run(5);
    assert.ok(colony.world.getComponent(crop, 'crop').growth > 0, 'la croissance reprend au dégel');
});

test('saisons : en hiver un assoiffé boit la bière stockée', () => {
    const colony = setupColony(makeTerrain(['~....', '.....', '.....']));
    const dwarf = addDwarf(colony.world, 3, 1, { name: 'Bofur', thirst: 80 });
    addBeer(colony.world, 4, 1);
    const drankBeer = colony.collect(EVENTS.DWARF_DRANK_BEER);

    seasonTicks(colony.world, 1800); // hiver
    colony.run(10);

    assert.equal(colony.world.getComponent(dwarf, 'thirst').value, 0, 'sa soif est étanchée');
    assert.ok(drankBeer.length >= 1, 'il a bu de la bière, pas à la berge');
});

test('saisons : en hiver, une berge gelée sans bière déclenche l\'isolement', () => {
    // random 0 : toute l'eau gèle → plus une seule berge libre à proximité
    const colony = setupColony(makeTerrain(['~....', '.....', '.....']), { random: () => 0 });
    const dwarf = addDwarf(colony.world, 3, 1, { name: 'Urist', thirst: 80 });
    const isolated = colony.collect(EVENTS.DWARF_ISOLATED_FROM_WATER);

    seasonTicks(colony.world, 1800); // hiver : les berges gèlent
    colony.run(10);

    assert.ok(isolated.length >= 1, 'la berge gelée déclenche la crise d\'isolement');
    assert.ok(colony.world.getComponent(dwarf, 'noWaterAccess'), 'le marqueur d\'isolement est posé');
});

test('saisons : gel puis dégel émettent season.changed et restaurent l\'accès aux berges', () => {
    // random 0 : la seule case d'eau gèle en hiver, puis dégèle au printemps
    const colony = setupColony(makeTerrain(['~..', '...', '...']), { random: () => 0 });
    const dwarf = addDwarf(colony.world, 2, 2, { name: 'Urist' });
    const drink = new DrinkSystem(colony.terrain);
    const changes = colony.collect(EVENTS.SEASON_CHANGED);

    seasonTicks(colony.world, 1799); // automne, juste avant l'hiver
    colony.run(1); // -> hiver
    assert.equal(drink.findDrinkTarget(colony.world, dwarf), null, 'berges gelées en hiver');

    seasonTicks(colony.world, 2399); // hiver, juste avant le printemps
    colony.run(1); // -> printemps
    assert.notEqual(drink.findDrinkTarget(colony.world, dwarf), null, 'berges de nouveau accessibles au dégel');

    assert.equal(changes.length, 2, 'un changement à l\'entrée puis à la sortie de l\'hiver');
    assert.equal(changes[0].isWinter, true);
    assert.equal(changes[1].isWinter, false);
});

test('saisons : aucun migrant n\'arrive en hiver, les arrivées reprennent au printemps', () => {
    const colony = setupColony(openTerrain(10, 3));
    addDwarf(colony.world, 5, 1, { name: 'Bofur' });
    addBread(colony.world, 4, 1);
    addBread(colony.world, 6, 1);
    addBread(colony.world, 7, 1);
    addBed(colony.world, 5, 2);
    const migrants = new MigrantSystem(colony.terrain, data.creatures.dwarf);
    migrants.ticks = 900;
    migrants.nextCheck = 900;
    const arrivals = colony.collect(EVENTS.MIGRANT_ARRIVED);

    seasonTicks(colony.world, 1800); // hiver
    migrants.update(colony.world, colony.bus);
    colony.bus.flush();
    assert.equal(arrivals.length, 0, 'pas de migrant en hiver');

    seasonTicks(colony.world, 0); // printemps
    migrants.nextCheck = migrants.ticks;
    migrants.update(colony.world, colony.bus);
    colony.bus.flush();
    assert.ok(arrivals.length >= 1, 'les migrants reviennent au printemps');
});
