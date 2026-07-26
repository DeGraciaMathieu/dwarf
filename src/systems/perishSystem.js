import { EVENTS } from '../events/events.js';

// les plats préparés se gâtent avec le temps (composant `perishable`) — sauf ceux
// rangés dans un garde-manger (stockage de type `pantry`), qui les conserve.
export class PerishSystem {
    constructor(stockpiles) {
        this.stockpiles = stockpiles;
    }

    update(world, eventBus) {
        for (const itemId of world.query('perishable', 'position')) {
            const position = world.getComponent(itemId, 'position');
            if (this.stockpiles.kindAt(position.x, position.y) === 'pantry') {
                continue;
            }
            const perishable = world.getComponent(itemId, 'perishable');
            perishable.freshness -= perishable.decay;
            if (perishable.freshness <= 0) {
                world.destroyEntity(itemId);
                eventBus.emit(EVENTS.FOOD_SPOILED, {});
            }
        }
    }
}
