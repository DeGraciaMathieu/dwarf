import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTerrain, setupColony, addDwarf, addGoblin } from './helpers.js';

// un nain blessé à ~43 % de santé, juste sous le seuil de base (0.5) : sans coup de
// pouce il fuit. Chaque facteur de bravoure abaisse le seuil et peut le faire tenir.
function decide({ morale = 70, bravery = 0.5, allies = 0 } = {}) {
    const colony = setupColony(openTerrain(12, 3));
    const dwarf = addDwarf(colony.world, 6, 1, { health: 13, morale, bravery, courage: 0.5 });
    addGoblin(colony.world, 7, 1);
    for (let i = 0; i < allies; i++) {
        const mate = addDwarf(colony.world, 5, 1, { health: 30 });
        colony.world.addComponent(mate, 'fighting', {});
    }
    colony.run(1);
    return colony.world.getComponent(dwarf, 'activity').type;
}

test('bravoure : par défaut, un nain blessé sous le seuil fuit', () => {
    assert.equal(decide(), 'flee');
});

test('bravoure : un bon moral fait tenir le nain blessé, un moral bas le fait fuir', () => {
    assert.equal(decide({ morale: 100 }), 'fight');
    assert.equal(decide({ morale: 30 }), 'flee');
});

test('bravoure : une tête brûlée tient là où un trouillard fuit', () => {
    assert.equal(decide({ bravery: 1 }), 'fight');
    assert.equal(decide({ bravery: 0 }), 'flee');
});

test('bravoure : des alliés qui combattent à portée donnent du cran', () => {
    assert.equal(decide({ allies: 1 }), 'fight');
});
