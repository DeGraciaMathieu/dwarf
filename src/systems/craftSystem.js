import { EVENTS } from '../events/events.js';
import { approach } from './jobMovement.js';
import { workEffort } from './workEffort.js';
import { nearestFreeMaterial } from './materials.js';

export class CraftSystem {
    constructor(jobBoard, terrain, recipes, itemDefinitions) {
        this.jobBoard = jobBoard;
        this.terrain = terrain;
        this.recipes = recipes;
        this.itemDefinitions = itemDefinitions;
    }

    update(world, eventBus) {
        for (const entityId of world.query('currentJob', 'position')) {
            const currentJob = world.getComponent(entityId, 'currentJob');
            if (currentJob.job.type !== 'craft') {
                continue;
            }
            if (currentJob.job.producedId !== undefined) {
                this.install(world, eventBus, entityId, currentJob);
            } else {
                this.craft(world, eventBus, entityId, currentJob);
            }
        }
    }

    craft(world, eventBus, entityId, currentJob) {
        const recipe = this.recipes[currentJob.job.recipe];
        const carrying = world.getComponent(entityId, 'carrying');
        if (!carrying || carrying.itemId !== currentJob.materialId) {
            this.fetchMaterial(world, entityId, currentJob, recipe.ingredient);
            return;
        }
        // recette sans atelier (les ateliers eux-mêmes) : fabriquée sur le chantier
        const workshopPosition = recipe.workshop
            ? this.nearestWorkshopPosition(world, entityId, recipe.workshop)
            : currentJob.job.target;
        if (!workshopPosition) {
            this.abandon(world, entityId, currentJob);
            return;
        }
        const status = approach(world, this.terrain, entityId, currentJob, workshopPosition, 'onto');
        if (status === 'unreachable') {
            this.abandon(world, entityId, currentJob);
            return;
        }
        if (status !== 'arrived') {
            return;
        }
        currentJob.progress += workEffort(world, entityId, currentJob.job.type);
        if (currentJob.progress < recipe.craftTicks) {
            return;
        }
        world.destroyEntity(carrying.itemId);
        const productId = this.createProduct(world, this.itemDefinitions[recipe.produces]);
        if (recipe.consumable) {
            world.removeComponent(entityId, 'carrying');
            world.addComponent(productId, 'position', {
                x: workshopPosition.x,
                y: workshopPosition.y,
            });
            this.jobBoard.complete(currentJob.job);
            world.removeComponent(entityId, 'currentJob');
            eventBus.emit(EVENTS.ITEM_CRAFTED, { entityId, label: recipe.label });
            return;
        }
        world.addComponent(entityId, 'carrying', { itemId: productId });
        currentJob.job.producedId = productId;
        currentJob.path = null;
    }

    install(world, eventBus, entityId, currentJob) {
        const { job } = currentJob;
        const carrying = world.getComponent(entityId, 'carrying');
        if (!carrying || carrying.itemId !== job.producedId) {
            const furniturePosition = world.getComponent(job.producedId, 'position');
            if (!furniturePosition) {
                return;
            }
            const status = approach(world, this.terrain, entityId, currentJob, furniturePosition, 'onto');
            if (status === 'unreachable') {
                this.abandon(world, entityId, currentJob);
                return;
            }
            if (status !== 'arrived') {
                return;
            }
            world.removeComponent(job.producedId, 'position');
            world.addComponent(entityId, 'carrying', { itemId: job.producedId });
            currentJob.path = null;
            return;
        }
        const installMode = this.terrain.isWalkable(job.target.x, job.target.y)
            ? 'onto'
            : 'adjacent';
        const status = approach(world, this.terrain, entityId, currentJob, job.target, installMode);
        if (status === 'unreachable') {
            this.abandon(world, entityId, currentJob);
            return;
        }
        if (status !== 'arrived') {
            return;
        }
        const recipe = this.recipes[job.recipe];
        if (recipe.installsTile) {
            world.destroyEntity(job.producedId);
            this.terrain.set(job.target.x, job.target.y, recipe.installsTile);
            this.jobBoard.resetUnreachable();
        } else {
            world.addComponent(job.producedId, 'position', { x: job.target.x, y: job.target.y });
            world.removeComponent(job.producedId, 'item');
            if (world.getComponent(job.producedId, 'workshop')) {
                this.jobBoard.resetUnreachable();
            }
        }
        world.removeComponent(entityId, 'carrying');
        this.jobBoard.complete(job);
        world.removeComponent(entityId, 'currentJob');
        eventBus.emit(EVENTS.FURNITURE_BUILT, { entityId, label: recipe.label });
    }

    fetchMaterial(world, entityId, currentJob, ingredient) {
        let materialPosition =
            currentJob.materialId !== undefined
                ? world.getComponent(currentJob.materialId, 'position')
                : undefined;
        if (!materialPosition) {
            const position = world.getComponent(entityId, 'position');
            const material = nearestFreeMaterial(world, position, currentJob, ingredient);
            if (!material) {
                this.abandon(world, entityId, currentJob);
                return;
            }
            currentJob.materialId = material.id;
            currentJob.path = null;
            materialPosition = material.position;
        }
        const status = approach(world, this.terrain, entityId, currentJob, materialPosition, 'onto');
        if (status === 'unreachable') {
            this.abandon(world, entityId, currentJob);
            return;
        }
        if (status !== 'arrived') {
            return;
        }
        world.removeComponent(currentJob.materialId, 'position');
        world.addComponent(entityId, 'carrying', { itemId: currentJob.materialId });
        currentJob.path = null;
    }

    nearestWorkshopPosition(world, entityId, workshopType) {
        const position = world.getComponent(entityId, 'position');
        let best = null;
        let bestDistance = Infinity;
        for (const workshopId of world.query('workshop', 'position')) {
            const workshop = world.getComponent(workshopId, 'workshop');
            // un atelier sans type (anciennes sauvegardes) accepte toutes les recettes
            if (workshopType && workshop.type && workshop.type !== workshopType) {
                continue;
            }
            const workshopPosition = world.getComponent(workshopId, 'position');
            const distance = Math.max(
                Math.abs(workshopPosition.x - position.x),
                Math.abs(workshopPosition.y - position.y)
            );
            if (distance < bestDistance) {
                bestDistance = distance;
                best = workshopPosition;
            }
        }
        return best;
    }

    createProduct(world, definition) {
        const productId = world.createEntity();
        world.addComponent(productId, 'renderable', {
            glyph: definition.glyph,
            color: definition.color,
        });
        for (const [componentName, data] of Object.entries(definition.components)) {
            world.addComponent(productId, componentName, structuredClone(data));
        }
        return productId;
    }

    abandon(world, entityId, currentJob) {
        this.jobBoard.markUnreachable(currentJob.job);
        world.removeComponent(entityId, 'currentJob');
    }
}
