import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnFromDefinition } from '../src/core/spawn.js';
import {
    EVENTS,
    data,
    openTerrain,
    setupColony,
    addDwarf,
    addGoblin,
    addOre,
    addSword,
    addMail,
    entitiesAt,
} from './helpers.js';

test('forge : on forge une épée à partir de minerai', () => {
    const colony = setupColony(openTerrain(20, 3));
    addDwarf(colony.world, 0, 0);
    spawnFromDefinition(colony.world, data.items.forge, { x: 8, y: 1 });
    addOre(colony.world, 3, 0);
    colony.jobBoard.post({ type: 'craft', recipe: 'sword', ghost: '/', target: { x: 15, y: 1 } });
    colony.run(260);
    // l'épée est forgée puis récupérée par le nain oisif : elle existe, le minerai est consommé
    assert.equal(colony.world.query('weapon').length, 1, 'une épée a été forgée');
    assert.equal(colony.world.query('ore').length, 0, 'le minerai a été forgé');
});

test('objectif : l intendant forge les épées jusqu à la cible et les nains s équipent', () => {
    const colony = setupColony(openTerrain(16, 3), {
        objectives: [{ recipe: 'sword', target: 2 }],
    });
    addDwarf(colony.world, 0, 1);
    addDwarf(colony.world, 0, 2);
    spawnFromDefinition(colony.world, data.items.forge, { x: 8, y: 1 });
    for (let i = 0; i < 3; i++) {
        addOre(colony.world, 3, 0);
    }
    colony.run(400);
    assert.equal(colony.world.query('weapon').length, 2, 'deux épées forgées, pas une de plus');
    const swordJobs = colony.jobBoard.jobs.filter((job) => job.type === 'craft' && job.recipe === 'sword');
    assert.equal(swordJobs.length, 0, 'cible atteinte : plus rien à forger');
    const armed = colony.world
        .query('worker', 'equipment')
        .filter((id) => colony.world.getComponent(id, 'equipment').weapon != null);
    assert.equal(armed.length, 2, 'les deux nains sont armés');
});

test('équipement : un nain va chercher l épée et s en équipe', () => {
    const colony = setupColony(openTerrain(20, 3));
    const dwarf = addDwarf(colony.world, 0, 1);
    const sword = addSword(colony.world, 10, 1);
    const equipped = colony.collect(EVENTS.DWARF_EQUIPPED);
    colony.run(80);
    const equipment = colony.world.getComponent(dwarf, 'equipment');
    assert.equal(equipment.weapon, sword, 'l épée est équipée');
    assert.equal(colony.world.getComponent(sword, 'position'), undefined, 'elle n est plus au sol');
    assert.equal(equipped.length, 1);
});

test('combat : une épée tranche le gobelin plus vite', () => {
    const armed = setupColony(openTerrain(6, 3));
    const dwarfA = addDwarf(armed.world, 1, 1, { courage: 0 });
    armed.world.getComponent(dwarfA, 'equipment').weapon = addSword(armed.world, 1, 1);
    armed.world.removeComponent(armed.world.getComponent(dwarfA, 'equipment').weapon, 'position');
    addGoblin(armed.world, 2, 1);
    const armedKills = armed.collect(EVENTS.GOBLIN_SLAIN);
    armed.run(14);

    const bare = setupColony(openTerrain(6, 3));
    addDwarf(bare.world, 1, 1, { courage: 0 });
    addGoblin(bare.world, 2, 1);
    const bareKills = bare.collect(EVENTS.GOBLIN_SLAIN);
    bare.run(14);

    assert.equal(armedKills.length, 1, 'armé, le nain abat le gobelin');
    assert.equal(bareKills.length, 0, 'à mains nues, pas encore');
});

test('armure : une cotte de mailles encaisse les coups', () => {
    const colony = setupColony(openTerrain(6, 3));
    const dwarf = addDwarf(colony.world, 1, 1, { courage: 1, health: 30 });
    colony.world.getComponent(dwarf, 'equipment').armor = addMail(colony.world, 1, 1);
    colony.world.removeComponent(colony.world.getComponent(dwarf, 'equipment').armor, 'position');
    addGoblin(colony.world, 2, 1);
    colony.run(40);
    const health = colony.world.getComponent(dwarf, 'health').value;

    const bare = setupColony(openTerrain(6, 3));
    const bareDwarf = addDwarf(bare.world, 1, 1, { courage: 1, health: 30 });
    addGoblin(bare.world, 2, 1);
    bare.run(40);
    const bareHealth = bare.world.getComponent(bareDwarf, 'health')?.value ?? 0;

    assert.ok(health > bareHealth, `armuré ${health} > nu ${bareHealth}`);
});

test('mort : un nain tué lâche son équipement au sol', () => {
    const colony = setupColony(openTerrain(6, 3));
    const dwarf = addDwarf(colony.world, 1, 1, { courage: 1, health: 2 });
    const sword = addSword(colony.world, 1, 1);
    colony.world.getComponent(dwarf, 'equipment').weapon = sword;
    colony.world.removeComponent(sword, 'position');
    addGoblin(colony.world, 2, 1);
    const deaths = colony.collect(EVENTS.DWARF_DIED);
    colony.run(30);
    assert.equal(deaths.length, 1);
    assert.notEqual(colony.world.getComponent(sword, 'position'), undefined, 'l épée retombe au sol');
});
