import { EVENTS } from '../events/events.js';
import { spawnFromDefinition } from '../core/spawn.js';

export class CombatSystem {
    constructor(jobBoard, corpseDefinition) {
        this.jobBoard = jobBoard;
        this.corpseDefinition = corpseDefinition;
    }

    update(world, eventBus) {
        for (const entityId of world.query('combat')) {
            const combat = world.getComponent(entityId, 'combat');
            if (combat.cooldownRemaining > 0) {
                combat.cooldownRemaining--;
            }
        }

        for (const hostileId of world.query('hostile', 'combat', 'position')) {
            const target = this.adjacentTarget(world, hostileId, 'worker');
            if (target !== undefined) {
                this.strike(world, eventBus, hostileId, target);
            }
        }

        for (const dwarfId of world.query('worker', 'combat', 'position')) {
            if (world.getComponent(dwarfId, 'activity')?.type !== 'fight') {
                continue;
            }
            const target = this.adjacentTarget(world, dwarfId, 'hostile');
            if (target !== undefined) {
                this.strike(world, eventBus, dwarfId, target);
            }
        }
    }

    adjacentTarget(world, attackerId, targetTag) {
        const position = world.getComponent(attackerId, 'position');
        return world.query(targetTag, 'health', 'position').find((targetId) => {
            const targetPosition = world.getComponent(targetId, 'position');
            const distance = Math.max(
                Math.abs(targetPosition.x - position.x),
                Math.abs(targetPosition.y - position.y)
            );
            return distance <= 1;
        });
    }

    strike(world, eventBus, attackerId, targetId) {
        const combat = world.getComponent(attackerId, 'combat');
        if (combat.cooldownRemaining > 0) {
            return;
        }
        combat.cooldownRemaining = combat.cooldown;
        const health = world.getComponent(targetId, 'health');
        health.value -= combat.damage;
        const isDwarf = world.getComponent(targetId, 'worker') !== undefined;
        if (health.value > 0) {
            if (isDwarf) {
                eventBus.emit(EVENTS.DWARF_INJURED, { entityId: targetId });
            }
            return;
        }
        this.kill(world, eventBus, attackerId, targetId, isDwarf);
    }

    kill(world, eventBus, killerId, targetId, isDwarf) {
        if (isDwarf) {
            const position = world.getComponent(targetId, 'position');
            const currentJob = world.getComponent(targetId, 'currentJob');
            if (currentJob) {
                this.jobBoard.release(currentJob.job);
            }
            const carrying = world.getComponent(targetId, 'carrying');
            if (carrying) {
                world.addComponent(carrying.itemId, 'position', { x: position.x, y: position.y });
            }
            spawnFromDefinition(world, this.corpseDefinition, position);
            const identity = world.getComponent(targetId, 'identity');
            eventBus.emit(EVENTS.DWARF_DIED, {
                name: identity?.name ?? 'Un nain',
                x: position.x,
                y: position.y,
            });
        } else {
            eventBus.emit(EVENTS.GOBLIN_SLAIN, { killerId });
        }
        world.destroyEntity(targetId);
    }
}
