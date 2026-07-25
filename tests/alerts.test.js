import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, openTerrain, makeTerrain, setupColony, addDwarf, addBread } from './helpers.js';

test("alerte : un nain sans accès à l'eau n'est signalé qu'une fois", () => {
    // aucune eau, aucune bière : le nain assoiffé renonce et reçoit noWaterAccess
    const colony = setupColony(openTerrain(4, 1));
    addDwarf(colony.world, 0, 0, { thirst: 70 });
    const alerts = colony.collect(EVENTS.DWARF_ISOLATED_FROM_WATER);

    colony.run(40);

    assert.equal(alerts.length, 1);
});

test('alerte : un nain qui ne peut atteindre aucune nourriture est signalé une fois', () => {
    // pain de l'autre côté d'un mur infranchissable
    const colony = setupColony(makeTerrain(['.#.']));
    addDwarf(colony.world, 0, 0, { hunger: 80 });
    addBread(colony.world, 2, 0);
    const alerts = colony.collect(EVENTS.DWARF_CANNOT_REACH_FOOD);

    colony.run(20);

    assert.equal(alerts.length, 1);
});

test('alerte : un dig dans une poche isolée émet job.unreachable une seule fois', () => {
    // mur central enfermé : aucune case adjacente accessible pour creuser
    const colony = setupColony(
        makeTerrain(['.....', '.###.', '.###.', '.###.', '.....'])
    );
    addDwarf(colony.world, 0, 0);
    colony.jobBoard.post({ type: 'dig', target: { x: 2, y: 2 } });
    const alerts = colony.collect(EVENTS.JOB_UNREACHABLE);

    colony.run(5);

    assert.equal(alerts.length, 1);
    assert.deepEqual(alerts[0].job.target, { x: 2, y: 2 });
});
