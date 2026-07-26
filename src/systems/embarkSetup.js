import { spawnFromDefinition } from '../core/spawn.js';
import { assignAptitude } from './workEffort.js';
import { assignPersonality } from './socializeSystem.js';

// applique un profil d'embarquement : fait apparaître les nains (identité, aptitude,
// personnalité) puis les vivres de départ, dont la quantité est modulée par la
// difficulté. `randomTile` fournit une case de spawn (injecté pour être déterministe).
export function populateColony(world, { dwarf, items }, { profile, difficulty }, randomTile) {
    for (const name of dwarf.names.slice(0, profile.dwarves)) {
        const dwarfId = spawnFromDefinition(world, dwarf, randomTile());
        world.addComponent(dwarfId, 'identity', { name });
        assignAptitude(world, dwarfId);
        assignPersonality(world, dwarfId);
    }
    const multiplier = difficulty.resourceMultiplier ?? 1;
    for (const { item, count } of profile.items) {
        const total = Math.max(0, Math.round(count * multiplier));
        for (let i = 0; i < total; i++) {
            spawnFromDefinition(world, items[item], randomTile());
        }
    }
}
