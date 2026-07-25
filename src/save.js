// 'sleeping' et 'tantruming' ne sont pas purgés : ce sont les états d'hystérésis
// de l'arbitre — les retirer réveillerait/calmerait le nain au chargement.
const VOLATILE_COMPONENTS = [
    'activity',
    'currentJob',
    'foodTarget',
    'bedTarget',
    'drinkTarget',
    'noWaterAccess',
    'noFoodAccess',
    'fleeing',
    'fighting',
    'starving',
    'dehydrated',
    'carrying',
];

export function serializeGame({ world, terrain, jobBoard, stockpiles, farms, fishingSpots, graves }) {
    const components = {};
    for (const [name, store] of world.components) {
        if (VOLATILE_COMPONENTS.includes(name)) {
            continue;
        }
        components[name] = {};
        for (const [entityId, data] of store) {
            components[name][entityId] = data;
        }
    }
    components.position ??= {};
    for (const carrierId of world.query('carrying', 'position')) {
        const { itemId } = world.getComponent(carrierId, 'carrying');
        const position = world.getComponent(carrierId, 'position');
        components.position[itemId] = { x: position.x, y: position.y };
    }
    return {
        version: 1,
        nextEntityId: world.nextEntityId,
        components,
        terrain: terrain.tiles,
        stockpiles: stockpiles.list(),
        farms: farms.list(),
        fishing: fishingSpots.list(),
        graves: graves.list(),
        jobs: jobBoard.jobs.map((job) => ({ ...job, claimedBy: null })),
    };
}

export function restoreGame({ world, terrain, jobBoard, stockpiles, farms, fishingSpots, graves }, snapshot) {
    world.nextEntityId = snapshot.nextEntityId;
    world.components.clear();
    for (const [name, entities] of Object.entries(snapshot.components)) {
        const store = new Map();
        for (const [entityId, data] of Object.entries(entities)) {
            store.set(Number(entityId), structuredClone(data));
        }
        world.components.set(name, store);
    }
    terrain.tiles = snapshot.terrain.map((row) => [...row]);
    restoreZone(stockpiles, snapshot.stockpiles);
    restoreZone(farms, snapshot.farms);
    restoreZone(fishingSpots, snapshot.fishing ?? []);
    restoreZone(graves, snapshot.graves ?? []);
    jobBoard.jobs = snapshot.jobs.map((job) => structuredClone(job));
}

function restoreZone(zone, savedTiles) {
    zone.tiles.clear();
    for (const { x, y, kind } of savedTiles) {
        zone.add(x, y, kind);
    }
}
