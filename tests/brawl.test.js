import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/world.js';
import { EventBus } from '../src/core/eventBus.js';
import { JobBoard } from '../src/core/jobBoard.js';
import { CombatSystem } from '../src/systems/combatSystem.js';
import { data, openTerrain, setupColony, addDwarf } from './helpers.js';

test('rixe : un nain ivre cherche la bagarre et sa victime riposte', () => {
    const colony = setupColony(openTerrain(12, 3));
    const drunkard = addDwarf(colony.world, 5, 1, { name: 'Bofur' });
    const victim = addDwarf(colony.world, 6, 1, { name: 'Urist' });
    colony.world.addComponent(drunkard, 'intoxication', { value: 100 });

    colony.run(8);

    assert.ok(colony.world.getComponent(drunkard, 'drunk'), 'l\'ivrogne est saoul');
    assert.ok(colony.world.getComponent(victim, 'health').value < 30, 'la victime a pris des coups');
    assert.ok(
        colony.world.getComponent(drunkard, 'health').value < 30,
        'la victime a rendu les coups (riposte)'
    );
});

test('rixe : les coups sont donnés à mains nues (arme ignorée) et provoquent la riposte', () => {
    const world = new World();
    const combat = new CombatSystem(new JobBoard(), data.items.corpse);
    const attacker = world.createEntity();
    world.addComponent(attacker, 'worker', {});
    world.addComponent(attacker, 'position', { x: 0, y: 0 });
    world.addComponent(attacker, 'health', { value: 30, max: 30 });
    world.addComponent(attacker, 'combat', { damage: 4, cooldown: 5 });
    world.addComponent(attacker, 'activity', { type: 'brawl' });
    const sword = world.createEntity();
    world.addComponent(sword, 'weapon', { damage: 6 });
    world.addComponent(attacker, 'equipment', { weapon: sword });

    const target = world.createEntity();
    world.addComponent(target, 'worker', {});
    world.addComponent(target, 'position', { x: 1, y: 0 });
    world.addComponent(target, 'health', { value: 30, max: 30 });
    world.addComponent(target, 'combat', { damage: 4, cooldown: 5 });

    combat.update(world, new EventBus());

    // dégâts de base (4) seulement — l'épée (+6) ne compte pas au poing
    assert.equal(world.getComponent(target, 'health').value, 26);
    const provoked = world.getComponent(target, 'provoked');
    assert.ok(provoked);
    assert.equal(provoked.by, attacker);
});
