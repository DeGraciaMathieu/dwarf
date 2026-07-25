import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventLog } from '../src/ui/eventLog.js';
import { EVENTS, openTerrain, setupColony, addDwarf } from './helpers.js';

function fakeLogElement() {
    const nodes = [];
    return {
        prepend: (node) => nodes.unshift(node),
        get children() {
            return nodes;
        },
        get lastChild() {
            return { remove: () => nodes.pop() };
        },
    };
}

// EventLog s'appuie sur document.createElement ; on le stube pour tester hors navigateur
globalThis.document ??= { createElement: () => ({}) };

test('journal : une mort survenue dans le tick de son annonce ne fige pas le jeu', () => {
    const colony = setupColony(openTerrain(6, 1));
    new EventLog(fakeLogElement(), colony.bus, colony.world);
    // soif au maximum + santé quasi nulle : l'annonce DWARF_DEHYDRATED et la mort
    // tombent dans le même tick, l'entité est détruite avant le flush du journal
    addDwarf(colony.world, 0, 0, { name: 'Litast', thirst: 100, health: 0.2 });
    const deaths = colony.collect(EVENTS.DWARF_DIED);

    assert.doesNotThrow(() => colony.run(1));
    assert.equal(deaths.length, 1);
    assert.equal(deaths[0].cause, 'dehydration');
});
