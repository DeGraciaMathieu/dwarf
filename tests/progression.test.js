import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnFromDefinition } from '../src/core/spawn.js';
import { isRecipeUnlocked } from '../src/systems/recipeGate.js';
import { data, openTerrain, setupColony, addDwarf, addOre } from './helpers.js';

const plateJobs = (colony) =>
    colony.jobBoard.jobs.filter((job) => job.type === 'craft' && job.recipe === 'plate');

test('paliers : les plates sont verrouillées sans atelier de taille, puis débloquées', () => {
    const objectives = [{ recipe: 'plate', target: 1 }];
    const colony = setupColony(openTerrain(12, 5), { objectives });
    addDwarf(colony.world, 1, 2);
    spawnFromDefinition(colony.world, data.items.forge, { x: 9, y: 2 });

    // forge présente mais pas d'atelier de taille : la recette avancée reste verrouillée
    colony.run(2);
    assert.equal(objectives[0].status.blocker, 'locked');
    assert.equal(objectives[0].status.detail.workshop, 'masonry');
    assert.equal(plateJobs(colony).length, 0, 'aucun job posté tant que verrouillé');

    // on bâtit l'atelier de taille (+ du minerai) : le palier tombe
    spawnFromDefinition(colony.world, data.items.masonry, { x: 3, y: 2 });
    addOre(colony.world, 5, 2);
    colony.run(2);

    assert.notEqual(objectives[0].status.blocker, 'locked', 'débloqué sans redémarrage');
    assert.ok(plateJobs(colony).length >= 1, 'le steward poste désormais la recette');
});

test('paliers : isRecipeUnlocked lit le prérequis d\'atelier', () => {
    const colony = setupColony(openTerrain(6, 3));
    assert.equal(isRecipeUnlocked(colony.world, data.recipes.plate), false);
    assert.equal(isRecipeUnlocked(colony.world, data.recipes.sword), true, 'recette sans prérequis');

    spawnFromDefinition(colony.world, data.items.masonry, { x: 3, y: 1 });
    assert.equal(isRecipeUnlocked(colony.world, data.recipes.plate), true);
});
