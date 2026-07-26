// prérequis déclaratifs de recette (paliers de progression) — lus, jamais codés
// en dur. `recipe.requires` peut porter : { workshop: <type> } → l'atelier doit
// exister dans le monde. Extensible (ajouter un type de prérequis ici seulement).
export function missingRequirement(world, recipe) {
    const requires = recipe.requires;
    if (!requires) {
        return null;
    }
    if (requires.workshop && !workshopExists(world, requires.workshop)) {
        return { workshop: requires.workshop };
    }
    return null;
}

export function isRecipeUnlocked(world, recipe) {
    return missingRequirement(world, recipe) === null;
}

function workshopExists(world, type) {
    return world
        .query('workshop', 'position')
        .some((id) => world.getComponent(id, 'workshop').type === type);
}
