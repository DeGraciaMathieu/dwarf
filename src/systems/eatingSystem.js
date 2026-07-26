import { EVENTS } from '../events/events.js';
import { findPath } from '../core/pathfinding.js';

const NO_FOOD_RETRY_DELAY = 50;

export class EatingSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world, eventBus) {
        this.reviewAccess(world);

        for (const entityId of world.query('activity', 'position')) {
            const activity = world.getComponent(entityId, 'activity');
            if (activity.type === 'eat' && !world.getComponent(entityId, 'foodTarget')) {
                this.assignFoodTarget(world, eventBus, entityId);
            }
        }

        for (const entityId of world.query('foodTarget', 'position')) {
            const activity = world.getComponent(entityId, 'activity');
            if (activity && activity.type !== 'eat') {
                world.removeComponent(entityId, 'foodTarget');
                continue;
            }
            this.followPath(world, eventBus, entityId);
        }
    }

    // garde-fou : un affamé sans nourriture atteignable est réévalué ; dès qu'un
    // chemin réapparaît le marqueur est levé, sans ré-émettre pendant l'impasse
    reviewAccess(world) {
        for (const entityId of world.query('noFoodAccess')) {
            const marker = world.getComponent(entityId, 'noFoodAccess');
            if (marker.cooldown-- > 0) {
                continue;
            }
            if (this.reachableFood(world, entityId)) {
                world.removeComponent(entityId, 'noFoodAccess');
            } else {
                marker.cooldown = NO_FOOD_RETRY_DELAY;
            }
        }
    }

    assignFoodTarget(world, eventBus, entityId) {
        const target = this.reachableFood(world, entityId);
        if (target) {
            world.addComponent(entityId, 'foodTarget', target);
            world.removeComponent(entityId, 'noFoodAccess');
            return;
        }
        // aucune nourriture atteignable : il continuera de s'affamer (sans figer,
        // l'arbitre l'écarte de 'eat' tant que le marqueur tient)
        if (!world.getComponent(entityId, 'noFoodAccess')) {
            eventBus.emit(EVENTS.DWARF_CANNOT_REACH_FOOD, { entityId });
            world.addComponent(entityId, 'noFoodAccess', { cooldown: NO_FOOD_RETRY_DELAY });
        }
    }

    reachableFood(world, entityId) {
        const position = world.getComponent(entityId, 'position');
        const candidates = world
            .query('food', 'position')
            .map((foodId) => {
                const foodPosition = world.getComponent(foodId, 'position');
                const distance = Math.max(
                    Math.abs(foodPosition.x - position.x),
                    Math.abs(foodPosition.y - position.y)
                );
                return { foodId, foodPosition, distance };
            })
            .sort((a, b) => a.distance - b.distance);

        for (const { foodId, foodPosition } of candidates) {
            const path = findPath(this.terrain, position, foodPosition);
            if (path) {
                return { target: foodId, path };
            }
        }
        return null;
    }

    followPath(world, eventBus, entityId) {
        const foodTarget = world.getComponent(entityId, 'foodTarget');
        const food = world.getComponent(foodTarget.target, 'food');
        const foodPosition = world.getComponent(foodTarget.target, 'position');
        if (!food || !foodPosition) {
            world.removeComponent(entityId, 'foodTarget');
            return;
        }

        const position = world.getComponent(entityId, 'position');
        const nextStep = foodTarget.path[0];
        const stepInvalid =
            nextStep &&
            (!this.terrain.isWalkable(nextStep.x, nextStep.y) ||
                Math.max(Math.abs(nextStep.x - position.x), Math.abs(nextStep.y - position.y)) > 1);
        if (stepInvalid) {
            const newPath = findPath(this.terrain, position, foodPosition);
            if (!newPath) {
                world.removeComponent(entityId, 'foodTarget');
                return;
            }
            foodTarget.path = newPath;
        }

        const step = foodTarget.path.shift();
        if (step) {
            position.x = step.x;
            position.y = step.y;
        }

        if (position.x === foodPosition.x && position.y === foodPosition.y) {
            const hunger = world.getComponent(entityId, 'hunger');
            hunger.value = Math.max(0, hunger.value - food.nutrition);
            const cooked = world.getComponent(foodTarget.target, 'cooked') !== undefined;
            world.destroyEntity(foodTarget.target);
            world.removeComponent(entityId, 'foodTarget');
            eventBus.emit(EVENTS.DWARF_ATE, { entityId, cooked });
        }
    }
}
