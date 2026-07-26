import { EVENTS } from '../events/events.js';
import { findPath } from '../core/pathfinding.js';

// paliers d'affinité (partagés avec l'UI et le deuil du moral)
export const FRIEND_THRESHOLD = 30;
export const RIVAL_THRESHOLD = 30;

const MAX_AFFINITY = 100;
const SOCIAL_RECOVERY = 3;
const BOND_STEP = 2;
const RIVAL_STEP = 0.5;

// exécutant de l'activité 'socialize' : le nain rejoint un camarade proche, tous
// deux voient leur besoin social remonter et leur affinité mutuelle croître. Tisse
// aussi les rivalités à partir des rixes (composant volatil 'provoked').
export class SocializeSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world, eventBus) {
        this.brawlResentment(world, eventBus);

        for (const entityId of world.query('activity', 'worker', 'social')) {
            const activity = world.getComponent(entityId, 'activity');
            const socializing = world.getComponent(entityId, 'socializing');
            if (activity.type !== 'socialize') {
                if (socializing) {
                    world.removeComponent(entityId, 'socializing');
                }
                continue;
            }
            if (!socializing) {
                world.addComponent(entityId, 'socializing', {});
            }
            this.mingle(world, eventBus, entityId);
        }
    }

    mingle(world, eventBus, entityId) {
        const companionId = this.nearestCompanion(world, entityId);
        if (companionId === null) {
            return;
        }
        const position = world.getComponent(entityId, 'position');
        const companionPosition = world.getComponent(companionId, 'position');
        const distance = Math.max(
            Math.abs(companionPosition.x - position.x),
            Math.abs(companionPosition.y - position.y)
        );
        if (distance > 1) {
            const path = findPath(this.terrain, position, companionPosition);
            if (path && path.length > 1) {
                position.x = path[0].x;
                position.y = path[0].y;
            }
            return;
        }
        this.recover(world, entityId);
        this.recover(world, companionId);
        this.strengthen(world, eventBus, entityId, companionId);
        this.strengthen(world, eventBus, companionId, entityId);
    }

    recover(world, entityId) {
        const social = world.getComponent(entityId, 'social');
        if (social) {
            social.value = Math.max(0, social.value - SOCIAL_RECOVERY);
        }
    }

    // rapproche entityId de otherId ; franchir le palier positif scelle une amitié
    strengthen(world, eventBus, entityId, otherId) {
        const relationships = world.getComponent(entityId, 'relationships');
        if (!relationships) {
            return;
        }
        const before = relationships.affinities[otherId] ?? 0;
        const after = Math.min(MAX_AFFINITY, before + BOND_STEP);
        relationships.affinities[otherId] = after;
        // l'affinité est mise à jour dans les deux sens : n'annoncer le palier qu'une fois
        if (before < FRIEND_THRESHOLD && after >= FRIEND_THRESHOLD && entityId < otherId) {
            eventBus.emit(EVENTS.DWARF_BEFRIENDED, { entityId, otherId });
        }
    }

    // une rixe (état 'provoked') érode l'affinité entre les deux nains
    brawlResentment(world, eventBus) {
        for (const entityId of world.query('provoked', 'relationships')) {
            const provoked = world.getComponent(entityId, 'provoked');
            if (!world.getComponent(provoked.by, 'position')) {
                continue;
            }
            this.embitter(world, eventBus, entityId, provoked.by);
            this.embitter(world, eventBus, provoked.by, entityId);
        }
    }

    embitter(world, eventBus, entityId, otherId) {
        const relationships = world.getComponent(entityId, 'relationships');
        if (!relationships) {
            return;
        }
        const before = relationships.affinities[otherId] ?? 0;
        const after = Math.max(-MAX_AFFINITY, before - RIVAL_STEP);
        relationships.affinities[otherId] = after;
        if (before > -RIVAL_THRESHOLD && after <= -RIVAL_THRESHOLD && entityId < otherId) {
            eventBus.emit(EVENTS.DWARF_FELL_OUT, { entityId, otherId });
        }
    }

    nearestCompanion(world, entityId) {
        const position = world.getComponent(entityId, 'position');
        let nearest = null;
        let nearestDistance = Infinity;
        for (const otherId of world.query('worker', 'position')) {
            if (otherId === entityId) {
                continue;
            }
            const other = world.getComponent(otherId, 'position');
            const distance = Math.max(
                Math.abs(other.x - position.x),
                Math.abs(other.y - position.y)
            );
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = otherId;
            }
        }
        return nearest;
    }
}
