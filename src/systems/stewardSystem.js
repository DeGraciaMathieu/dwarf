export class StewardSystem {
    constructor(jobBoard, recipes, itemDefinitions, objectives) {
        this.jobBoard = jobBoard;
        this.recipes = recipes;
        this.itemDefinitions = itemDefinitions;
        this.objectives = objectives;
    }

    update(world) {
        for (const objective of this.objectives) {
            const recipe = this.recipes[objective.recipe];
            if (!recipe || !recipe.consumable) {
                continue;
            }
            this.reconcile(world, objective, recipe);
        }
    }

    reconcile(world, objective, recipe) {
        const stock = this.countStock(world, recipe);
        const pending = this.jobBoard.jobs.filter(
            (job) => job.type === 'craft' && job.recipe === objective.recipe
        );
        const gap = objective.target - stock - pending.length;
        // donnée de restitution pour l'UI, réécrite intégralement à chaque tick
        const { blocker, detail } = this.findBlocker(world, recipe, gap, pending.length);
        objective.status = {
            stock,
            pending: pending.length,
            blocker,
            detail,
        };
        if (gap > 0) {
            this.postMissingJobs(world, objective, recipe, gap, pending.length);
        } else if (gap < 0) {
            this.cancelSurplusJobs(pending, -gap);
        }
    }

    findBlocker(world, recipe, gap, pendingCount) {
        if (gap <= 0) {
            return { blocker: null, detail: null };
        }
        if (!this.findWorkshopPosition(world, recipe.workshop)) {
            return { blocker: 'no-workshop', detail: { workshop: recipe.workshop } };
        }
        const free = this.countFreeIngredients(world, recipe.ingredient);
        if (free - pendingCount <= 0) {
            return { blocker: 'no-ingredient', detail: { ingredient: recipe.ingredient, free } };
        }
        return { blocker: null, detail: null };
    }

    postMissingJobs(world, objective, recipe, gap, pendingCount) {
        const workshopPosition = this.findWorkshopPosition(world, recipe.workshop);
        if (!workshopPosition) {
            return;
        }
        const freeIngredients = this.countFreeIngredients(world, recipe.ingredient);
        const toPost = Math.max(0, Math.min(gap, freeIngredients - pendingCount));
        for (let i = 0; i < toPost; i++) {
            this.jobBoard.post({
                type: 'craft',
                recipe: objective.recipe,
                target: { x: workshopPosition.x, y: workshopPosition.y },
            });
        }
    }

    cancelSurplusJobs(pending, surplus) {
        let remaining = surplus;
        for (const job of pending) {
            if (remaining === 0) {
                return;
            }
            if (job.claimedBy !== null) {
                continue;
            }
            this.jobBoard.cancel(job);
            remaining--;
        }
    }

    countStock(world, recipe) {
        // sans 'position' : un équipement porté (épée, cotte) compte toujours dans le stock
        const components = Object.keys(this.itemDefinitions[recipe.produces].components);
        return world.query(...components).length;
    }

    countFreeIngredients(world, ingredient) {
        const reserved = new Set();
        for (const workerId of world.query('currentJob')) {
            const currentJob = world.getComponent(workerId, 'currentJob');
            if (currentJob.materialId !== undefined) {
                reserved.add(currentJob.materialId);
            }
        }
        return world.query(ingredient, 'position').filter((id) => !reserved.has(id)).length;
    }

    findWorkshopPosition(world, workshopType) {
        for (const workshopId of world.query('workshop', 'position')) {
            const workshop = world.getComponent(workshopId, 'workshop');
            // un atelier sans type (anciennes sauvegardes) accepte toutes les recettes
            if (workshopType && workshop.type && workshop.type !== workshopType) {
                continue;
            }
            return world.getComponent(workshopId, 'position');
        }
        return null;
    }
}
