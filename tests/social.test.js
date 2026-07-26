import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kill } from '../src/systems/death.js';
import { FRIEND_THRESHOLD } from '../src/systems/socializeSystem.js';
import { data, openTerrain, setupColony, addDwarf, EVENTS } from './helpers.js';

test('social : deux nains esseulés se rejoignent, comblent leur besoin et se lient', () => {
    const colony = setupColony(openTerrain(14, 3));
    const befriended = colony.collect(EVENTS.DWARF_BEFRIENDED);
    const bofur = addDwarf(colony.world, 5, 1, { name: 'Bofur', social: 90 });
    const urist = addDwarf(colony.world, 6, 1, { name: 'Urist', social: 90 });

    colony.run(20);

    assert.ok(
        colony.world.getComponent(bofur, 'social').value < 90,
        'le besoin social de Bofur est retombé'
    );
    assert.ok(
        colony.world.getComponent(bofur, 'relationships').affinities[urist] >= FRIEND_THRESHOLD,
        'Bofur considère Urist comme un ami'
    );
    assert.ok(
        colony.world.getComponent(urist, 'relationships').affinities[bofur] >= FRIEND_THRESHOLD,
        'l\'affinité est réciproque'
    );
    assert.equal(befriended.length, 1, 'l\'amitié n\'est annoncée qu\'une fois');
});

test('social : la mort d\'un ami afflige plus qu\'un simple décès aperçu', () => {
    const colony = setupColony(openTerrain(14, 3));
    const bofur = addDwarf(colony.world, 5, 1, { name: 'Bofur', social: 90 });
    const urist = addDwarf(colony.world, 6, 1, { name: 'Urist', social: 90 });
    const witness = addDwarf(colony.world, 12, 1, { name: 'Dagna' });
    colony.world.removeComponent(witness, 'wander'); // témoin immobile, sans lien

    colony.run(20);
    assert.ok(
        colony.world.getComponent(bofur, 'relationships').affinities[urist] >= FRIEND_THRESHOLD,
        'Bofur et Urist sont amis avant le drame'
    );

    const moraleBofurBefore = colony.world.getComponent(bofur, 'morale').value;
    const moraleWitnessBefore = colony.world.getComponent(witness, 'morale').value;

    kill(colony.world, colony.bus, colony.jobBoard, data.items.corpse, urist, { cause: 'combat' });
    colony.run(2); // tick 1 : l'événement est diffusé ; tick 2 : le moral l'encaisse

    const griefBofur = moraleBofurBefore - colony.world.getComponent(bofur, 'morale').value;
    const griefWitness = moraleWitnessBefore - colony.world.getComponent(witness, 'morale').value;

    assert.ok(griefWitness > 0, 'le témoin encaisse le décès');
    assert.ok(griefBofur > griefWitness, 'l\'ami en souffre davantage');
});
