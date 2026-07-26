import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/world.js';
import { EventBus } from '../src/core/eventBus.js';
import { JobBoard } from '../src/core/jobBoard.js';
import { CombatSystem } from '../src/systems/combatSystem.js';
import { GoblinSpawnSystem } from '../src/systems/goblinSpawnSystem.js';
import { data, openTerrain, goblinArchetypes } from './helpers.js';

function addWorker(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'worker', {});
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'health', { value: 30, max: 30 });
    return id;
}

function addHostile(world, x, y, combat, extra = {}) {
    const id = world.createEntity();
    world.addComponent(id, 'hostile', { visionRange: 8 });
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'health', { value: 20, max: 20 });
    world.addComponent(id, 'combat', combat);
    for (const [name, value] of Object.entries(extra)) {
        world.addComponent(id, name, value);
    }
    return id;
}

test('ennemis : un archer frappe à distance, un gobelin standard non', () => {
    const world = new World();
    const combat = new CombatSystem(new JobBoard(), data.items.corpse);
    const targetArcher = addWorker(world, 0, 0);
    const targetGrunt = addWorker(world, 0, 8);
    addHostile(world, 3, 0, { damage: 3, cooldown: 5, range: 4 }); // archer, portée 4
    addHostile(world, 3, 8, { damage: 4, cooldown: 5 }); // gobelin, portée 1

    combat.update(world, new EventBus());

    assert.ok(world.getComponent(targetArcher, 'health').value < 30, 'archer touche à distance 3');
    assert.equal(world.getComponent(targetGrunt, 'health').value, 30, 'le gobelin ne touche pas à distance 3');
});

test('ennemis : un chef vivant renforce les frappes des hostiles', () => {
    const strikeOnce = (withChief) => {
        const world = new World();
        const combat = new CombatSystem(new JobBoard(), data.items.corpse);
        const worker = addWorker(world, 0, 0);
        addHostile(world, 1, 0, { damage: 4, cooldown: 5 });
        if (withChief) {
            addHostile(world, 9, 9, { damage: 5, cooldown: 5 }, { leader: { damage: 1 } });
        }
        combat.update(world, new EventBus());
        return world.getComponent(worker, 'health').value;
    };

    assert.equal(strikeOnce(false), 26, 'sans chef : 4 dégâts');
    assert.equal(strikeOnce(true), 25, 'avec chef : +1 dégât');
});

test('ennemis : la composition de vague introduit brutes, archers puis chef, avec parcimonie', () => {
    const terrain = openTerrain(5, 5);
    // dés hauts : aucun spécial ne sort, même en vague avancée
    const calm = new GoblinSpawnSystem(terrain, goblinArchetypes(), () => 0.9);
    assert.deepEqual(calm.waveRoster(6, 4), ['grunt', 'grunt', 'grunt', 'grunt']);

    // dés bas : les spéciaux sortent, mais seulement une fois leur vague atteinte
    const fierce = new GoblinSpawnSystem(terrain, goblinArchetypes(), () => 0.05);
    assert.deepEqual(fierce.waveRoster(2, 4), ['grunt', 'grunt', 'grunt', 'grunt'], 'rien de spécial avant la vague 3');

    const wave3 = fierce.waveRoster(3, 4);
    assert.ok(wave3.includes('brute'));
    assert.ok(!wave3.includes('archer'), 'les archers n\'arrivent qu\'en vague 4');

    assert.ok(fierce.waveRoster(4, 4).includes('archer'));

    assert.ok(!fierce.waveRoster(5, 4).includes('chief'), 'le chef ne mène qu\'à partir de la vague 6');
    assert.equal(fierce.waveRoster(6, 4)[0], 'chief');
});

test('ennemis : la brute encaisse nettement plus qu\'un gobelin', () => {
    assert.ok(data.creatures.brute.components.health.max > 2 * data.creatures.goblin.components.health.max);
});
