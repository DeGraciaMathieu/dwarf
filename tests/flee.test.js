import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTerrain, openTerrain, setupColony, addDwarf, addGoblin } from './helpers.js';

test('fuite : encerclé près d\'une porte, le nain se replie derrière', () => {
    // deux salles reliées par une seule porte ; les gobelins ne peuvent la franchir
    const colony = setupColony(
        makeTerrain([
            '#######',
            '#.....#',
            '#.....#',
            '###+###',
            '#.....#',
            '#.....#',
            '#######',
        ])
    );
    const dwarf = addDwarf(colony.world, 3, 1, { courage: 2 });
    addGoblin(colony.world, 1, 1);
    addGoblin(colony.world, 5, 1);

    colony.run(15);

    assert.ok(colony.world.getComponent(dwarf, 'position').y >= 4, 'réfugié dans la salle du bas');
    assert.equal(colony.world.query('worker').length, 1, 'le nain a survécu derrière la porte');
});

test('fuite : sans refuge, il s\'éloigne comme avant (stepAway)', () => {
    const colony = setupColony(openTerrain(20, 3));
    const dwarf = addDwarf(colony.world, 10, 1, { courage: 2 });
    addGoblin(colony.world, 12, 1);

    colony.run(1);

    // aucune porte / poche sûre : repli glouton d'une case à l'opposé du gobelin
    assert.equal(colony.world.getComponent(dwarf, 'position').x, 9);
});
