import { EVENTS } from '../events/events.js';
import { kill } from './death.js';

const PROVOKED_TTL = 30;
const WOUND_THRESHOLD = 8;
const BLEED_RATE = 0.3;

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
            const target = this.targetInRange(world, hostileId, 'worker');
            if (target !== undefined) {
                this.strike(world, eventBus, hostileId, target);
            }
        }

        for (const dwarfId of world.query('worker', 'combat', 'position')) {
            const activity = world.getComponent(dwarfId, 'activity')?.type;
            if (activity === 'fight') {
                const target = this.targetInRange(world, dwarfId, 'hostile');
                if (target !== undefined) {
                    this.strike(world, eventBus, dwarfId, target);
                }
            } else if (activity === 'brawl') {
                // rixe entre nains : au poing, l'arme et l'aura de chef ne comptent pas
                const target = this.targetInRange(world, dwarfId, 'worker');
                if (target !== undefined) {
                    this.strike(world, eventBus, dwarfId, target, { bareFisted: true });
                }
            }
        }
    }

    targetInRange(world, attackerId, targetTag) {
        const position = world.getComponent(attackerId, 'position');
        const range = world.getComponent(attackerId, 'combat').range ?? 1;
        return world.query(targetTag, 'health', 'position').find((targetId) => {
            if (targetId === attackerId) {
                return false;
            }
            const targetPosition = world.getComponent(targetId, 'position');
            const distance = Math.max(
                Math.abs(targetPosition.x - position.x),
                Math.abs(targetPosition.y - position.y)
            );
            return distance <= range;
        });
    }

    strike(world, eventBus, attackerId, targetId, { bareFisted = false } = {}) {
        const combat = world.getComponent(attackerId, 'combat');
        if (combat.cooldownRemaining > 0) {
            return;
        }
        combat.cooldownRemaining = combat.cooldown;
        const health = world.getComponent(targetId, 'health');
        const damage = bareFisted
            ? combat.damage
            : combat.damage + this.weaponDamage(world, attackerId) + this.commandBonus(world, attackerId);
        health.value -= Math.max(1, damage - this.armorDefense(world, targetId));
        const isDwarf = world.getComponent(targetId, 'worker') !== undefined;
        if (!isDwarf) {
            if (health.value <= 0) {
                kill(world, eventBus, this.jobBoard, this.corpseDefinition, targetId, {
                    killerId: attackerId,
                });
            }
            return;
        }
        // un nain déjà à terre n'est achevé que si un coup de plus le vide
        if (world.getComponent(targetId, 'injury')) {
            if (health.value <= 0) {
                kill(world, eventBus, this.jobBoard, this.corpseDefinition, targetId, {
                    cause: bareFisted ? 'brawl' : 'combat',
                    killerId: attackerId,
                });
            }
            return;
        }
        // sous le seuil, le nain tombe blessé au lieu de mourir net : il pourra être secouru
        if (health.value <= WOUND_THRESHOLD) {
            if (health.value <= 0) {
                health.value = 1;
            }
            world.addComponent(targetId, 'injury', { bleeding: BLEED_RATE, incapacitated: true });
            eventBus.emit(EVENTS.DWARF_WOUNDED, { entityId: targetId });
            return;
        }
        eventBus.emit(EVENTS.DWARF_INJURED, { entityId: targetId });
        if (bareFisted) {
            // frappé au poing par un pair : la victime rend les coups
            world.addComponent(targetId, 'provoked', { by: attackerId, ttl: PROVOKED_TTL });
        }
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

    // aura de commandement : un chef vivant renforce les frappes des hostiles
    commandBonus(world, attackerId) {
        if (!world.getComponent(attackerId, 'hostile')) {
            return 0;
        }
        let bonus = 0;
        for (const leaderId of world.query('leader', 'health')) {
            bonus = Math.max(bonus, world.getComponent(leaderId, 'leader').damage);
        }
        return bonus;
    }
}
