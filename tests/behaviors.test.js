import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    EVENTS,
    makeTerrain,
    openTerrain,
    setupColony,
    addDwarf,
    addGoblin,
    addBread,
    addLog,
    entitiesAt,
} from './helpers.js';

test('gobelin : il poursuit le nain le plus proche à vue', () => {
    const colony = setupColony(openTerrain(30, 5));
    addDwarf(colony.world, 25, 2);
    const goblin = addGoblin(colony.world, 18, 2);
    colony.run(2);
    assert.equal(colony.world.getComponent(goblin, 'activity').type, 'chase');
});

test('fuite : le nain lâche son job et le job retourne en file', () => {
    const colony = setupColony(openTerrain(30, 5));
    const dwarf = addDwarf(colony.world, 15, 2, { courage: 2 });
    colony.jobBoard.post({ type: 'dig', target: { x: 0, y: 0 } });
    const fled = colony.collect(EVENTS.DWARF_FLEES);
    colony.run(5);
    assert.notEqual(colony.world.getComponent(dwarf, 'currentJob'), undefined);
    addGoblin(colony.world, 13, 2);
    colony.run(6);
    assert.equal(colony.world.getComponent(dwarf, 'activity').type, 'flee');
    assert.equal(fled.length, 1);
    assert.equal(colony.world.getComponent(dwarf, 'currentJob'), undefined);
    assert.equal(colony.jobBoard.jobs[0].claimedBy, null);
});

test('fuite : le dormeur est réveillé par le danger puis reprend sa vie', () => {
    const colony = setupColony(openTerrain(60, 5));
    const dwarf = addDwarf(colony.world, 30, 2, { fatigue: 115, courage: 2 });
    colony.run(3);
    const goblin = addGoblin(colony.world, 27, 2);
    colony.run(4);
    assert.equal(colony.world.getComponent(dwarf, 'activity').type, 'flee');
    colony.world.destroyEntity(goblin);
    colony.run(4);
    assert.notEqual(colony.world.getComponent(dwarf, 'activity').type, 'flee');
    assert.equal(colony.world.getComponent(dwarf, 'fleeing'), undefined);
});

test('combat : le brave charge et terrasse le gobelin', () => {
    const colony = setupColony(openTerrain(10, 1));
    const dwarf = addDwarf(colony.world, 0, 0);
    addGoblin(colony.world, 6, 0, { health: 8 });
    const events = [];
    colony.bus.on(EVENTS.DWARF_FIGHTS, () => events.push('charge'));
    colony.bus.on(EVENTS.GOBLIN_SLAIN, () => events.push('terrassé'));
    colony.run(40);
    assert.deepEqual(events, ['charge', 'terrassé']);
    assert.equal(colony.world.query('hostile').length, 0);
    assert.notEqual(colony.world.getComponent(dwarf, 'activity').type, 'fight');
});

test('combat : blessé sous le seuil de courage, il fuit', () => {
    const colony = setupColony(openTerrain(20, 1));
    const dwarf = addDwarf(colony.world, 10, 0, { health: 10 });
    addGoblin(colony.world, 7, 0);
    colony.run(1);
    assert.equal(colony.world.getComponent(dwarf, 'activity').type, 'flee');
});

test('mort : blessures, décès, cadavre, et nettoyage du job', () => {
    const colony = setupColony(makeTerrain(['...', '...']));
    const dwarf = addDwarf(colony.world, 0, 0, { name: 'Bofur', health: 4, courage: 2 });
    const log = addLog(colony.world, 2, 0);
    colony.jobBoard.post({ type: 'build', ghost: '#', target: { x: 2, y: 1 } });
    const job = colony.jobBoard.jobs[0];
    job.claimedBy = dwarf;
    colony.world.addComponent(dwarf, 'currentJob', { job, path: null, progress: 0, materialId: log });
    colony.world.addComponent(dwarf, 'carrying', { itemId: log });
    colony.world.removeComponent(log, 'position');
    addGoblin(colony.world, 1, 0);
    const deaths = colony.collect(EVENTS.DWARF_DIED);
    colony.run(15);
    assert.equal(deaths.length, 1);
    assert.equal(deaths[0].name, 'Bofur');
    assert.equal(colony.world.query('worker').length, 0);
    assert.equal(colony.world.query('item').length, 2, 'cadavre + bûche lâchée');
    assert.equal(job.claimedBy, null);
    assert.notEqual(colony.world.getComponent(log, 'position'), undefined);
});

test('moral : les peines et les joies ajustent la valeur', () => {
    const colony = setupColony(openTerrain(10, 1));
    const dwarf = addDwarf(colony.world, 0, 0);
    const morale = colony.world.getComponent(dwarf, 'morale');
    colony.bus.emit(EVENTS.DWARF_INJURED, { entityId: dwarf });
    colony.bus.flush();
    colony.run(1);
    assert.equal(Math.round(morale.value), 60);
    colony.bus.emit(EVENTS.DWARF_ATE, { entityId: dwarf });
    colony.bus.flush();
    colony.run(1);
    assert.equal(Math.round(morale.value), 70);
});

test('moral : la mort frappe plus fort les témoins proches', () => {
    const colony = setupColony(openTerrain(36, 1));
    const near = addDwarf(colony.world, 2, 0);
    const far = addDwarf(colony.world, 30, 0);
    colony.bus.emit(EVENTS.DWARF_DIED, { name: 'Feu', x: 0, y: 0 });
    colony.bus.flush();
    colony.run(1);
    assert.equal(Math.round(colony.world.getComponent(near, 'morale').value), 45);
    assert.equal(Math.round(colony.world.getComponent(far, 'morale').value), 62);
});

test('moral bas : le creusage prend environ deux fois plus longtemps', () => {
    const digDuration = (morale) => {
        const terrain = makeTerrain(['#.........']);
        const colony = setupColony(terrain);
        addDwarf(colony.world, 2, 0, { morale });
        colony.jobBoard.post({ type: 'dig', target: { x: 0, y: 0 } });
        let ticks = 0;
        for (; ticks < 100 && terrain.get(0, 0) === 'wall'; ticks++) {
            colony.world.tick(colony.bus);
        }
        return ticks;
    };
    const fast = digDuration(70);
    const slow = digDuration(25);
    assert.ok(slow > fast * 1.6, `${fast} vs ${slow} ticks`);
});

test('crise de nerfs : rage, casse, apaisement, retour à la vie', () => {
    const colony = setupColony(openTerrain(10, 1));
    const dwarf = addDwarf(colony.world, 3, 0, { morale: 10 });
    addBread(colony.world, 3, 0);
    const events = [];
    colony.bus.on(EVENTS.DWARF_TANTRUM, () => events.push('rage'));
    colony.bus.on(EVENTS.ITEM_SMASHED, () => events.push('casse'));
    colony.bus.on(EVENTS.DWARF_CALMED, () => events.push('calme'));
    colony.run(120);
    assert.equal(events[0], 'rage');
    assert.ok(events.includes('calme'));
    assert.notEqual(colony.world.getComponent(dwarf, 'activity').type, 'tantrum');
    assert.ok(colony.world.getComponent(dwarf, 'morale').value > 15);
});
