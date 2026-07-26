import { findPath } from '../core/pathfinding.js';

// exécutant de l'activité 'rescue' : un nain valide rejoint un blessé gisant hors de
// l'infirmerie et le traîne, case par case, jusqu'à une tuile de la Zone infirmary.
// Sans état durable : la cible est recalculée chaque tick (auto-réparable).
export class RescueSystem {
    constructor(terrain, infirmary) {
        this.terrain = terrain;
        this.infirmary = infirmary;
    }

    update(world) {
        for (const entityId of world.query('activity', 'worker', 'position')) {
            if (world.getComponent(entityId, 'activity').type !== 'rescue') {
                continue;
            }
            const woundedId = this.nearestWoundedOutside(world, entityId);
            if (woundedId === null) {
                continue;
            }
            this.drag(world, entityId, woundedId);
        }
    }

    drag(world, rescuerId, woundedId) {
        const rescuer = world.getComponent(rescuerId, 'position');
        const wounded = world.getComponent(woundedId, 'position');
        const distance = Math.max(
            Math.abs(rescuer.x - wounded.x),
            Math.abs(rescuer.y - wounded.y)
        );
        if (distance > 1) {
            const path = findPath(this.terrain, rescuer, wounded);
            if (path && path.length > 1) {
                rescuer.x = path[0].x;
                rescuer.y = path[0].y;
            }
            return;
        }
        const destination = this.nearestInfirmaryTile(wounded);
        if (!destination) {
            return;
        }
        const path = findPath(this.terrain, wounded, destination);
        if (path && path.length >= 1) {
            const previous = { x: wounded.x, y: wounded.y };
            wounded.x = path[0].x;
            wounded.y = path[0].y;
            rescuer.x = previous.x;
            rescuer.y = previous.y;
        }
    }

    nearestWoundedOutside(world, rescuerId) {
        const rescuer = world.getComponent(rescuerId, 'position');
        let nearest = null;
        let nearestDistance = Infinity;
        for (const woundedId of world.query('injury', 'position')) {
            const position = world.getComponent(woundedId, 'position');
            if (this.infirmary.has(position.x, position.y)) {
                continue;
            }
            const distance = Math.max(
                Math.abs(position.x - rescuer.x),
                Math.abs(position.y - rescuer.y)
            );
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = woundedId;
            }
        }
        return nearest;
    }

    nearestInfirmaryTile(from) {
        let best = null;
        let bestDistance = Infinity;
        for (const { x, y } of this.infirmary.list()) {
            const distance = Math.max(Math.abs(x - from.x), Math.abs(y - from.y));
            if (distance < bestDistance) {
                bestDistance = distance;
                best = { x, y };
            }
        }
        return best;
    }
}
