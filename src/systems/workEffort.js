const LOW_MORALE_EFFORT = 0.5;
const SKILL_BONUS_PER_LEVEL = 0.3;
const SPECIALIST_LEVEL = 2;

// mapping centralisé : type de job → catégorie d'aptitude
export const SKILL_BY_JOB = {
    dig: 'mining',
    chop: 'woodcutting',
    craft: 'crafting',
    build: 'building',
    plant: 'farming',
    harvest: 'farming',
    fish: 'fishing',
};

export const SKILL_CATEGORIES = [...new Set(Object.values(SKILL_BY_JOB))];

// effort de travail = malus de moral × bonus d'aptitude (cumulables)
export function workEffort(world, entityId, jobType) {
    const moraleFactor = lowMorale(world, entityId) ? LOW_MORALE_EFFORT : 1;
    return moraleFactor * skillFactor(world, entityId, jobType);
}

function lowMorale(world, entityId) {
    const morale = world.getComponent(entityId, 'morale');
    return Boolean(morale && morale.value < morale.low);
}

function skillFactor(world, entityId, jobType) {
    const category = SKILL_BY_JOB[jobType];
    if (!category) {
        return 1;
    }
    const skills = world.getComponent(entityId, 'skills');
    const level = skills?.[category] ?? 0;
    return 1 + SKILL_BONUS_PER_LEVEL * level;
}

// au spawn : un nain se découvre une spécialité, pour différencier la population
export function assignAptitude(world, entityId) {
    const skills = world.getComponent(entityId, 'skills');
    if (!skills) {
        return;
    }
    const category = SKILL_CATEGORIES[Math.floor(Math.random() * SKILL_CATEGORIES.length)];
    skills[category] = SPECIALIST_LEVEL;
}
