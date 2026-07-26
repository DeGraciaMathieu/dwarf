import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTerrain, setupColony, addDwarf } from './helpers.js';

const affinity = (world, id, otherId) =>
    world.getComponent(id, 'relationships').affinities[otherId] ?? 0;

test('cliques : à portée, un nain rejoint son ami plutôt que l\'inconnu voisin', () => {
    const colony = setupColony(openTerrain(14, 3));
    const dwarf = addDwarf(colony.world, 1, 1, { name: 'Bofur', social: 90 });
    const stranger = addDwarf(colony.world, 2, 1, { name: 'Inconnu' });
    const friend = addDwarf(colony.world, 7, 1, { name: 'Ami', social: 90 }); // distance 6, à portée
    colony.world.getComponent(dwarf, 'relationships').affinities[friend] = 40;
    colony.world.getComponent(friend, 'relationships').affinities[dwarf] = 40;

    colony.run(60);

    assert.ok(affinity(colony.world, dwarf, friend) > 40, 'il a rejoint et renforcé son ami à portée');
    assert.equal(affinity(colony.world, dwarf, stranger), 0, 'il a ignoré l\'inconnu voisin');
});

test('cliques : un ami hors de portée ne fait plus traverser la carte', () => {
    const colony = setupColony(openTerrain(20, 3));
    const dwarf = addDwarf(colony.world, 1, 1, { name: 'Bofur', social: 90 });
    const neighbour = addDwarf(colony.world, 2, 1, { name: 'Voisin', social: 90 });
    const farFriend = addDwarf(colony.world, 18, 1, { name: 'Ami', social: 90 }); // distance 17 > portée
    colony.world.getComponent(dwarf, 'relationships').affinities[farFriend] = 80;
    colony.world.getComponent(farFriend, 'relationships').affinities[dwarf] = 80;

    colony.run(10);

    assert.ok(affinity(colony.world, dwarf, neighbour) > 0, 'il socialise avec le voisin proche');
    assert.equal(
        affinity(colony.world, dwarf, farFriend),
        80,
        'il ne court pas après l\'ami lointain'
    );
});

test('personnalité : un nain sociable noue des liens plus vite qu\'un nain ordinaire', () => {
    const colony = setupColony(openTerrain(12, 3));
    const s1 = addDwarf(colony.world, 1, 1, { name: 'S1', social: 90, sociability: 1 });
    const s2 = addDwarf(colony.world, 2, 1, { name: 'S2', social: 90, sociability: 1 });
    const n1 = addDwarf(colony.world, 8, 1, { name: 'N1', social: 90, sociability: 0.5 });
    const n2 = addDwarf(colony.world, 9, 1, { name: 'N2', social: 90, sociability: 0.5 });

    colony.run(4);

    assert.ok(
        affinity(colony.world, s1, s2) > affinity(colony.world, n1, n2),
        'la paire sociable a une affinité plus forte'
    );
});

test('querelle : un ivrogne au sang chaud s\'en prend à son rival, pas au voisin neutre', () => {
    const colony = setupColony(openTerrain(12, 3));
    const drunkard = addDwarf(colony.world, 5, 1, { name: 'Bofur', temper: 0.8 });
    const rival = addDwarf(colony.world, 7, 1, { name: 'Rival' });
    const neutral = addDwarf(colony.world, 3, 1, { name: 'Neutre' });
    colony.world.getComponent(drunkard, 'relationships').affinities[rival] = -40;
    colony.world.addComponent(drunkard, 'intoxication', { value: 100 });

    colony.run(12);

    assert.ok(colony.world.getComponent(rival, 'health').value < 30, 'le rival prend les coups');
    assert.equal(colony.world.getComponent(neutral, 'health').value, 30, 'le voisin neutre est épargné');
});

test('personnalité : un ivrogne placide reste pacifique', () => {
    const colony = setupColony(openTerrain(8, 3));
    const drunkard = addDwarf(colony.world, 4, 1, { name: 'Calme', temper: 0.1 });
    const neighbour = addDwarf(colony.world, 5, 1, { name: 'Voisin' });
    colony.world.addComponent(drunkard, 'intoxication', { value: 100 });

    colony.run(12);

    assert.ok(colony.world.getComponent(drunkard, 'drunk'), 'il est bien ivre');
    assert.notEqual(
        colony.world.getComponent(drunkard, 'activity')?.type,
        'brawl',
        'mais son tempérament placide le garde en paix'
    );
    assert.equal(colony.world.getComponent(neighbour, 'health').value, 30, 'personne n\'est frappé');
});
