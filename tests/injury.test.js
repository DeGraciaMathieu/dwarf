import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CombatSystem } from '../src/systems/combatSystem.js';
import {
    data,
    openTerrain,
    setupColony,
    addDwarf,
    addGoblin,
    addBed,
    EVENTS,
} from './helpers.js';

test('blessure : sous le seuil, le nain tombe blessé au lieu de mourir, puis se vide de son sang', () => {
    const colony = setupColony(openTerrain(10, 3));
    const wounded = colony.collect(EVENTS.DWARF_WOUNDED);
    const bledOut = colony.collect(EVENTS.DWARF_BLED_OUT);
    const died = colony.collect(EVENTS.DWARF_DIED);
    const victim = addDwarf(colony.world, 5, 1, { name: 'Urist', health: 6 });

    // un coup porté sous le seuil de blessure incapacite au lieu de tuer
    const combat = new CombatSystem(colony.jobBoard, data.items.corpse);
    const attacker = addGoblin(colony.world, 6, 1);
    combat.update(colony.world, colony.bus);
    colony.bus.flush();

    assert.ok(colony.world.getComponent(victim, 'injury'), 'le nain est blessé, pas mort');
    assert.equal(wounded.length, 1, 'dwarf.wounded est émis une fois');

    // laissé seul, sans soin, le saignement finit par l'emporter
    colony.world.destroyEntity(attacker);
    colony.run(60);

    assert.ok(bledOut.length >= 1, 'il se vide de son sang (dwarf.bled-out)');
    assert.ok(
        died.some((event) => event.cause === 'bleeding'),
        'et meurt de ses saignements (dwarf.died)'
    );
    assert.equal(colony.world.getComponent(victim, 'health'), undefined, 'l\'entité est détruite');
});

test('secours et soin : un blessé est traîné à l\'infirmerie puis remis sur pied', () => {
    const colony = setupColony(openTerrain(16, 3));
    const healed = colony.collect(EVENTS.DWARF_HEALED);
    colony.infirmary.add(8, 1);
    colony.infirmary.add(9, 1);
    addBed(colony.world, 9, 1);

    const patient = addDwarf(colony.world, 3, 1, { name: 'Urist', health: 8 });
    colony.world.addComponent(patient, 'injury', { bleeding: 0.3, incapacitated: true });
    addDwarf(colony.world, 4, 1, { name: 'Bofur' });
    addDwarf(colony.world, 5, 1, { name: 'Dagna' });

    colony.run(120);

    // le soin ne se déclenche qu'à l'infirmerie : la guérison prouve le secours réussi
    assert.equal(colony.world.getComponent(patient, 'injury'), undefined, 'la blessure est soignée');
    assert.ok(healed.length >= 1, 'dwarf.healed est émis');
    assert.ok(
        colony.world.getComponent(patient, 'health').value > 8,
        'le blessé a survécu, santé remontée au-dessus du seuil'
    );
});
