import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTerrain, setupColony, addDwarf, addGoblin } from './helpers.js';

test('mémoire : un gobelin poursuit la dernière position connue puis oublie', () => {
    const colony = setupColony(openTerrain(30, 5));
    const worker = addDwarf(colony.world, 5, 2, { courage: 2 });
    const goblin = addGoblin(colony.world, 2, 2);

    // détection : le gobelin voit le nain, mémorise sa position, se met à charger
    colony.run(1);
    assert.equal(colony.world.getComponent(goblin, 'activity').type, 'chase');
    assert.ok(colony.world.getComponent(goblin, 'chaseMemory'));

    // le nain sort du champ de vision (portée 8)
    const workerPosition = colony.world.getComponent(worker, 'position');
    workerPosition.x = 28;
    workerPosition.y = 4;

    // pas d'oubli instantané : il continue vers la dernière position connue
    colony.run(1);
    assert.equal(colony.world.getComponent(goblin, 'activity').type, 'chase');
    assert.ok(colony.world.getComponent(goblin, 'chaseMemory'));

    // après expiration/arrivée, il oublie et se remet à errer
    colony.run(15);
    assert.equal(colony.world.getComponent(goblin, 'activity').type, 'wander');
    assert.equal(colony.world.getComponent(goblin, 'chaseMemory'), undefined);
});
