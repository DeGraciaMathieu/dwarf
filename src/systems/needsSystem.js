export class NeedsSystem {
    constructor(needs) {
        this.needs = needs;
    }

    update(world, eventBus) {
        for (const { component, event } of this.needs) {
            for (const entityId of world.query(component)) {
                const need = world.getComponent(entityId, component);
                const wasAbove = need.value >= need.threshold;
                need.value = Math.min(need.value + need.rate, need.max);
                if (!wasAbove && need.value >= need.threshold) {
                    eventBus.emit(event, { entityId });
                }
            }
        }
    }
}
