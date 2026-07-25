import { EVENTS } from '../events/events.js';
import { kill } from './death.js';

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
        const damage = combat.damage + this.weaponDamage(world, attackerId);
        health.value -= Math.max(1, damage - this.armorDefense(world, targetId));
        const isDwarf = world.getComponent(targetId, 'worker') !== undefined;
        if (health.value > 0) {
            if (isDwarf) {
                eventBus.emit(EVENTS.DWARF_INJURED, { entityId: targetId });
            }
            return;
        }
        kill(world, eventBus, this.jobBoard, this.corpseDefinition, targetId, {
            cause: 'combat',
            killerId: attackerId,
        });
    }

    weaponDamage(world, entityId) {
        const equipment = world.getComponent(entityId, 'equipment');
        const weaponId = equipment?.weapon;
        const weapon = weaponId != null ? world.getComponent(weaponId, 'weapon') : null;
        return weapon ? weapon.damage : 0;
    }

    armorDefense(world, entityId) {
        const equipment = world.getComponent(entityId, 'equipment');
        const armorId = equipment?.armor;
        const armor = armorId != null ? world.getComponent(armorId, 'armor') : null;
        return armor ? armor.defense : 0;
    }
}
