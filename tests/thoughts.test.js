import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTerrain, setupColony, addDwarf, EVENTS } from './helpers.js';

const thoughtsOf = (world, id) => world.getComponent(id, 'thoughts').list;

test('pensées : manger, boire et voir un mort empilent des pensées datées', () => {
    const colony = setupColony(openTerrain(6, 1));
    const dwarf = addDwarf(colony.world, 2, 0, { name: 'Urist' });

    colony.bus.emit(EVENTS.DWARF_ATE, { entityId: dwarf });
    colony.bus.emit(EVENTS.DWARF_DRANK, { entityId: dwarf });
    colony.bus.emit(EVENTS.DWARF_DIED, { name: 'Feu', x: 2, y: 0 }); // témoin sur place
    colony.bus.flush();
    colony.run(1);

    const list = thoughtsOf(colony.world, dwarf);
    assert.equal(list.length, 3, 'trois pensées distinctes');
    assert.ok(list.every((thought) => thought.addedAtTick !== undefined), 'chaque pensée est datée');

    // moral = baseline + somme des deltas actifs (ate 10 + drank 5 - deathWitnessed 25)
    const morale = colony.world.getComponent(dwarf, 'morale');
    const sum = list.reduce((total, thought) => total + thought.delta, 0);
    assert.equal(Math.round(morale.value), morale.baseline + sum);
    assert.equal(Math.round(morale.value), 60);
});

test('pensées : le barème vient d\'EFFECTS (mort vue = -25)', () => {
    const colony = setupColony(openTerrain(6, 1));
    const dwarf = addDwarf(colony.world, 2, 0, { name: 'Urist' });

    colony.bus.emit(EVENTS.DWARF_DIED, { name: 'Feu', x: 2, y: 0 });
    colony.bus.flush();
    colony.run(1);

    const [thought] = thoughtsOf(colony.world, dwarf);
    assert.equal(thought.type, 'deathWitnessed');
    assert.equal(thought.delta, -25);
});

test('pensées : une pensée expire et le moral remonte vers la baseline', () => {
    const colony = setupColony(openTerrain(6, 1));
    const dwarf = addDwarf(colony.world, 2, 0, { name: 'Urist' });

    colony.bus.emit(EVENTS.DWARF_INJURED, { entityId: dwarf });
    colony.bus.flush();
    colony.run(1);
    assert.equal(thoughtsOf(colony.world, dwarf).length, 1, 'la pensée négative est là');
    const dip = colony.world.getComponent(dwarf, 'morale').value;

    colony.run(320); // au-delà du TTL de 'injured' (300)
    assert.equal(thoughtsOf(colony.world, dwarf).length, 0, 'la pensée a expiré');
    assert.ok(
        colony.world.getComponent(dwarf, 'morale').value > dip,
        'le moral est remonté une fois la pensée passée'
    );
});

test('pensées : un nain d\'ancienne sauvegarde (sans pile) se répare sans erreur', () => {
    const colony = setupColony(openTerrain(6, 1));
    const dwarf = addDwarf(colony.world, 2, 0, { name: 'Urist' });
    colony.world.removeComponent(dwarf, 'thoughts'); // simule une sauvegarde antérieure

    colony.bus.emit(EVENTS.DWARF_ATE, { entityId: dwarf });
    colony.bus.flush();
    colony.run(1);

    const thoughts = colony.world.getComponent(dwarf, 'thoughts');
    assert.ok(thoughts, 'la pile a été recréée');
    assert.equal(thoughts.list.length, 1, 'et la pensée y est enregistrée');
});
