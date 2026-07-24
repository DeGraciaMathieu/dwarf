import { findPath } from '../core/pathfinding.js';

export function approach(world, terrain, entityId, currentJob, destination, mode) {
    const position = world.getComponent(entityId, 'position');
    if (hasArrived(position, destination, mode)) {
        return 'arrived';
    }

    const nextStep = currentJob.path?.[0];
    if (!currentJob.path || (nextStep && !terrain.isWalkable(nextStep.x, nextStep.y))) {
        currentJob.path = computePath(terrain, position, destination, mode);
        if (!currentJob.path) {
            return 'unreachable';
        }
    }

    const step = currentJob.path.shift();
    if (step) {
        position.x = step.x;
        position.y = step.y;
    }
    return hasArrived(position, destination, mode) ? 'arrived' : 'moving';
}

function hasArrived(position, destination, mode) {
    const distance = Math.max(
        Math.abs(position.x - destination.x),
        Math.abs(position.y - destination.y)
    );
    return mode === 'adjacent' ? distance <= 1 : distance === 0;
}

function computePath(terrain, position, destination, mode) {
    if (mode === 'onto') {
        return findPath(terrain, position, destination);
    }
    let best = null;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = destination.x + dx;
            const ny = destination.y + dy;
            if ((dx === 0 && dy === 0) || !terrain.isWalkable(nx, ny)) {
                continue;
            }
            const path = findPath(terrain, position, { x: nx, y: ny });
            if (path && (!best || path.length < best.length)) {
                best = path;
            }
        }
    }
    return best;
}
