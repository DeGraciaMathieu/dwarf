export function nearestFreeMaterial(world, position, currentJob) {
    const reserved = new Set();
    for (const otherId of world.query('currentJob')) {
        const other = world.getComponent(otherId, 'currentJob');
        if (other !== currentJob && other.materialId !== undefined) {
            reserved.add(other.materialId);
        }
    }
    let best = null;
    let bestDistance = Infinity;
    for (const materialId of world.query('buildMaterial', 'position')) {
        if (reserved.has(materialId)) {
            continue;
        }
        const materialPosition = world.getComponent(materialId, 'position');
        const distance = Math.max(
            Math.abs(materialPosition.x - position.x),
            Math.abs(materialPosition.y - position.y)
        );
        if (distance < bestDistance) {
            bestDistance = distance;
            best = { id: materialId, position: materialPosition };
        }
    }
    return best;
}
