import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTerrain, setupColony, addDwarf, seasonTicks, EVENTS } from './helpers.js';

// RNG déterministe cyclique : contrôle exactement quelles cases gèlent
const sequence = (values) => {
    let i = 0;
    return () => values[i++ % values.length];
};

const iceCount = (terrain) => {
    let count = 0;
    for (let y = 0; y < terrain.height; y++) {
        for (let x = 0; x < terrain.width; x++) {
            if (terrain.get(x, y) === 'ice') {
                count += 1;
            }
        }
    }
    return count;
};

test('gel : en hiver une partie de l\'eau gèle, le reste reste de l\'eau libre', () => {
    // une case sur deux gèle (0 < ratio), l'autre reste libre (1 ≥ ratio)
    const colony = setupColony(makeTerrain(['~~~~', '....']), { random: sequence([0, 1]) });

    seasonTicks(colony.world, 1800); // hiver
    colony.run(2);

    const row = [0, 1, 2, 3].map((x) => colony.terrain.get(x, 0));
    assert.equal(row.filter((t) => t === 'ice').length, 2, 'la moitié a gelé (glace)');
    assert.equal(row.filter((t) => t === 'water').length, 2, 'l\'autre moitié reste de l\'eau libre');
});

test('gel : en hiver, l\'eau non gelée reste buvable (pas d\'isolement)', () => {
    // random 1 : rien ne gèle → la berge reste accessible malgré l'hiver
    const colony = setupColony(makeTerrain(['~....', '.....', '.....']), { random: () => 1 });
    const dwarf = addDwarf(colony.world, 3, 1, { name: 'Urist', thirst: 80 });
    const drank = colony.collect(EVENTS.DWARF_DRANK);
    const isolated = colony.collect(EVENTS.DWARF_ISOLATED_FROM_WATER);

    seasonTicks(colony.world, 1800); // hiver
    colony.run(10);

    assert.equal(colony.world.getComponent(dwarf, 'thirst').value, 0, 'il a pu boire');
    assert.ok(drank.length >= 1, 'à l\'eau libre encore accessible');
    assert.equal(isolated.length, 0, 'aucune crise d\'isolement');
});

test('gel : au dégel, toute la glace redevient de l\'eau', () => {
    const colony = setupColony(makeTerrain(['~~~', '...']), { random: () => 0 }); // tout gèle

    seasonTicks(colony.world, 1800); // hiver
    colony.run(2);
    assert.equal(iceCount(colony.terrain), 3, 'toute l\'eau a gelé en hiver');

    seasonTicks(colony.world, 0); // printemps
    colony.run(2);
    assert.equal(iceCount(colony.terrain), 0, 'plus aucune glace au dégel');
    assert.ok([0, 1, 2].every((x) => colony.terrain.get(x, 0) === 'water'), 'redevenue de l\'eau');
});
