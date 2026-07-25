import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InspectionPanel } from '../src/ui/inspectionPanel.js';
import { openTerrain, makeTerrain, setupColony, addDwarf } from './helpers.js';

function fakeElement() {
    return { innerHTML: '' };
}

function inspect(colony, dwarfId) {
    const position = colony.world.getComponent(dwarfId, 'position');
    const panel = new InspectionPanel(fakeElement(), colony.world);
    panel.selectAt(position.x, position.y);
    panel.render();
    return panel.element.innerHTML;
}

test("inspection : un nain qui creuse affiche le job, la cible et l'étape", () => {
    // mur en (3,0), nain oisif à côté : il réclame le dig et le mène
    const colony = setupColony(makeTerrain(['...#..']));
    const dwarf = addDwarf(colony.world, 0, 0);
    colony.jobBoard.post({ type: 'dig', target: { x: 3, y: 0 } });

    colony.run(4);

    const currentJob = colony.world.getComponent(dwarf, 'currentJob');
    assert.equal(currentJob.job.type, 'dig');
    assert.deepEqual(currentJob.job.target, { x: 3, y: 0 });

    const html = inspect(colony, dwarf);
    assert.match(html, /Travaille : creuse un mur \(3, 0\)/);
    assert.match(html, /en cours|approche/);
});

test('inspection : un nain sans job ni besoin est affiché « Oisif »', () => {
    const colony = setupColony(openTerrain(6, 1));
    const dwarf = addDwarf(colony.world, 0, 0);

    colony.run(1);

    const html = inspect(colony, dwarf);
    assert.match(html, /Oisif/);
});
