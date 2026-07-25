import { EVENTS } from '../events/events.js';
import { findPath } from '../core/pathfinding.js';

export class EatingSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world, eventBus) {
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

    assignFoodTarget(world, eventBus, entityId) {
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
                world.addComponent(entityId, 'foodTarget', { target: foodId, path });
                world.removeComponent(entityId, 'noFoodAccess');
                return;
            }
        }
        // aucune nourriture atteignable : il continuera de s'affamer
        if (!world.getComponent(entityId, 'noFoodAccess')) {
            eventBus.emit(EVENTS.DWARF_CANNOT_REACH_FOOD, { entityId });
            world.addComponent(entityId, 'noFoodAccess', {});
        }
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
            world.destroyEntity(foodTarget.target);
            world.removeComponent(entityId, 'foodTarget');
            eventBus.emit(EVENTS.DWARF_ATE, { entityId });
        }
    }
}
