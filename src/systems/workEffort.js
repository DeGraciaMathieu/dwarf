const LOW_MORALE_EFFORT = 0.5;

export function workEffort(world, entityId) {
    const morale = world.getComponent(entityId, 'morale');
    if (morale && morale.value < morale.low) {
        return LOW_MORALE_EFFORT;
    }
    return 1;
}
