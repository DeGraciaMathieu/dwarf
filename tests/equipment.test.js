import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/world.js';
import { EventBus } from '../src/core/eventBus.js';
import { JobBoard } from '../src/core/jobBoard.js';
import { CombatSystem } from '../src/systems/combatSystem.js';
import { data } from './helpers.js';

function ticksToKill(weaponDamage, targetHealth) {
    const world = new World();
    const combat = new CombatSystem(new JobBoard(), data.items.corpse);
    const dwarf = world.createEntity();
    world.addComponent(dwarf, 'worker', {});
    world.addComponent(dwarf, 'position', { x: 0, y: 0 });
    world.addComponent(dwarf, 'health', { value: 30, max: 30 });
    world.addComponent(dwarf, 'combat', { damage: 4, cooldown: 5 });
    world.addComponent(dwarf, 'activity', { type: 'fight' });
    const weapon = world.createEntity();
    world.addComponent(weapon, 'weapon', { damage: weaponDamage });
    world.addComponent(dwarf, 'equipment', { weapon });
    // cible sans combat : elle n'attaque pas, on mesure seulement le temps de mise à mort
    const target = world.createEntity();
    world.addComponent(target, 'hostile', { visionRange: 8 });
    world.addComponent(target, 'position', { x: 1, y: 0 });
    world.addComponent(target, 'health', { value: targetHealth, max: targetHealth });

    for (let tick = 1; tick <= 100; tick++) {
        combat.update(world, new EventBus());
        if (world.getComponent(target, 'health') === undefined) {
            return tick;
        }
    }
    return Infinity;
}

function healthAfter(armorDefense, ticks) {
    const world = new World();
    const combat = new CombatSystem(new JobBoard(), data.items.corpse);
    const dwarf = world.createEntity();
    world.addComponent(dwarf, 'worker', {});
    world.addComponent(dwarf, 'position', { x: 1, y: 0 });
    world.addComponent(dwarf, 'health', { value: 30, max: 30 });
    const armor = world.createEntity();
    world.addComponent(armor, 'armor', { defense: armorDefense });
    world.addComponent(dwarf, 'equipment', { armor });
    // attaquant qui cogne fort (7) pour dépasser le plancher de dégâts (1)
    const attacker = world.createEntity();
    world.addComponent(attacker, 'hostile', { visionRange: 8 });
    world.addComponent(attacker, 'position', { x: 0, y: 0 });
    world.addComponent(attacker, 'health', { value: 50, max: 50 });
    world.addComponent(attacker, 'combat', { damage: 7, cooldown: 5 });

    const bus = new EventBus();
    for (let tick = 0; tick < ticks; tick++) {
        combat.update(world, bus);
    }
    return world.getComponent(dwarf, 'health')?.value ?? 0;
}

test('armes : une hache (8) tue plus vite qu\'une épée (6)', () => {
    const withSword = ticksToKill(6, 34);
    const withAxe = ticksToKill(8, 34);
    assert.ok(withAxe < withSword, `hache ${withAxe} ticks < épée ${withSword} ticks`);
});

test('armures : les plates (5) encaissent mieux que les mailles (3)', () => {
    const withPlate = healthAfter(5, 30);
    const withMail = healthAfter(3, 30);
    assert.ok(withPlate > withMail, `plates ${withPlate} PV > mailles ${withMail} PV`);
});

test('data : les nouvelles recettes forgent des équipements à la forge', () => {
    for (const name of ['axe', 'spear', 'plate', 'shield']) {
        assert.equal(data.recipes[name].workshop, 'forge');
        assert.equal(data.recipes[name].ingredient, 'ore');
        assert.ok(data.recipes[name].consumable);
        const components = data.items[name].components;
        assert.ok(components.weapon || components.armor);
    }
});
