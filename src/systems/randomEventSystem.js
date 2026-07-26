import { EVENTS } from '../events/events.js';
import { spawnFromDefinition } from '../core/spawn.js';
import { randomEdgeTile } from '../core/terrain.js';
import { assignAptitude } from './workEffort.js';
import { assignPersonality } from './socializeSystem.js';

// Fait survenir périodiquement des événements ponctuels tirés d'une table pondérée
// (données). Calqué sur seasonSystem/goblinSpawnSystem : compteur de ticks sur une
// entité-composant singleton `randomEvents` (sérialisée nativement), intervalle
// jitteré, RNG injectable. N'émet que des faits accomplis ; il applique l'effet
// lui-même sur les composants/le terrain. Sans événement éligible : rien ne se passe.
export class RandomEventSystem {
    // definitions : { creatures, plant } — creatures = tout creatures.json (le roster de
    // spawnBeast et l'arrivée spéciale y piochent par clé), plant = plantDefinition
    constructor(terrain, table, definitions, random = Math.random) {
        this.terrain = terrain;
        this.table = table;
        this.definitions = definitions;
        this.random = random;
        this.effects = {
            plague: (world, bus, effect) => this.plague(world, bus, effect),
            spawnBeast: (world, bus, effect) => this.spawnBeast(world, bus, effect),
            harvestBoon: (world, bus) => this.harvestBoon(world, bus),
            harvestBlight: (world, bus) => this.harvestBlight(world, bus),
            specialArrival: (world, bus) => this.specialArrival(world, bus),
            caveIn: (world, bus) => this.caveIn(world, bus),
        };
    }

    update(world, eventBus) {
        const state = this.stateOf(world);
        state.ticks++;
        state.countdown--;
        if (state.countdown > 0) {
            return;
        }
        state.countdown = this.nextInterval();

        if (world.query('worker').length === 0) {
            return;
        }
        const event = this.pickEvent(world, state);
        if (!event) {
            return;
        }
        state.cooldowns[event.id] = state.ticks;
        this.effects[event.effect.type](world, eventBus, event.effect);
    }

    // tirage pondéré parmi les événements dont les conditions et le cooldown sont OK
    pickEvent(world, state) {
        const eligible = this.table.events.filter((event) => this.isEligible(world, state, event));
        return this.pickWeighted(eligible);
    }

    // tirage pondéré générique : chaque entrée porte un `weight`, null si liste vide
    pickWeighted(entries) {
        if (entries.length === 0) {
            return null;
        }
        const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = this.random() * totalWeight;
        for (const entry of entries) {
            roll -= entry.weight;
            if (roll < 0) {
                return entry;
            }
        }
        return entries[entries.length - 1];
    }

    isEligible(world, state, event) {
        const lastTrigger = state.cooldowns[event.id];
        if (lastTrigger !== undefined && state.ticks - lastTrigger < event.cooldown) {
            return false;
        }
        return this.conditionsMet(world, event.conditions ?? {});
    }

    conditionsMet(world, conditions) {
        const population = world.query('worker').length;
        if (conditions.minPopulation !== undefined && population < conditions.minPopulation) {
            return false;
        }
        if (conditions.maxPopulation !== undefined && population > conditions.maxPopulation) {
            return false;
        }
        if (conditions.minCrops !== undefined && world.query('crop').length < conditions.minCrops) {
            return false;
        }
        return true;
    }

    // épidémie : quelques nains perdent de la santé (attritionSystem prend le relais si mortel)
    plague(world, eventBus, effect) {
        const victims = world.query('worker', 'health').slice(0, effect.victims);
        for (const entityId of victims) {
            const health = world.getComponent(entityId, 'health');
            health.value = Math.max(1, health.value - effect.healthLoss);
        }
        eventBus.emit(EVENTS.EVENT_PLAGUE_STRUCK, { count: victims.length });
    }

    // bête sauvage : une créature hostile débarque, tirée du roster pondéré (rareté par
    // poids). Reprise ensuite par hostileSystem/combatSystem.
    spawnBeast(world, eventBus, effect) {
        for (let i = 0; i < effect.count; i++) {
            const tile = randomEdgeTile(this.terrain, { hostile: true });
            if (!tile) {
                break;
            }
            const pick = this.pickWeighted(effect.roster);
            const definition = this.definitions.creatures[pick.creature];
            spawnFromDefinition(world, definition, tile);
            eventBus.emit(EVENTS.EVENT_BEAST_APPEARED, {
                creature: pick.creature,
                label: definition.label ?? 'une bête sauvage',
            });
        }
    }

    // récolte abondante : toutes les cultures arrivent instantanément à maturité
    harvestBoon(world, eventBus) {
        const crops = world.query('crop', 'renderable');
        for (const cropId of crops) {
            const crop = world.getComponent(cropId, 'crop');
            crop.growth = crop.matureAt;
            const renderable = world.getComponent(cropId, 'renderable');
            renderable.glyph = this.definitions.plant.mature.glyph;
            renderable.color = this.definitions.plant.mature.color;
        }
        eventBus.emit(EVENTS.EVENT_HARVEST_BOON, { count: crops.length });
    }

    // récolte gâchée : les cultures en place sont perdues
    harvestBlight(world, eventBus) {
        const crops = world.query('crop');
        for (const cropId of crops) {
            world.destroyEntity(cropId);
        }
        eventBus.emit(EVENTS.EVENT_HARVEST_BLIGHT, { count: crops.length });
    }

    // arrivée spéciale : un nain errant rejoint la colonie (comme migrantSystem)
    specialArrival(world, eventBus) {
        const tile = randomEdgeTile(this.terrain);
        if (!tile) {
            return;
        }
        const dwarfId = spawnFromDefinition(world, this.definitions.creatures.dwarf, tile);
        const name = this.pickName(world);
        world.addComponent(dwarfId, 'identity', { name });
        assignAptitude(world, dwarfId);
        assignPersonality(world, dwarfId);
        eventBus.emit(EVENTS.EVENT_WANDERER_ARRIVED, { entityId: dwarfId, name });
    }

    // éboulement : une case de sol libre s'effondre en mur (que les nains peuvent recreuser)
    caveIn(world, eventBus) {
        const occupied = new Set(
            world.query('position').map((id) => {
                const position = world.getComponent(id, 'position');
                return `${position.x},${position.y}`;
            })
        );
        const candidates = [];
        for (let y = 0; y < this.terrain.height; y++) {
            for (let x = 0; x < this.terrain.width; x++) {
                if (this.terrain.get(x, y) === 'floor' && !occupied.has(`${x},${y}`)) {
                    candidates.push({ x, y });
                }
            }
        }
        if (candidates.length === 0) {
            return;
        }
        const { x, y } = candidates[Math.floor(this.random() * candidates.length)];
        this.terrain.set(x, y, 'wall');
        eventBus.emit(EVENTS.EVENT_CAVE_IN, { x, y });
    }

    pickName(world) {
        const used = new Set(
            world.query('identity').map((id) => world.getComponent(id, 'identity').name)
        );
        const names = this.definitions.creatures.dwarf.names;
        const available = names.filter((name) => !used.has(name));
        if (available.length > 0) {
            return available[Math.floor(this.random() * available.length)];
        }
        return `${names[Math.floor(this.random() * names.length)]} II`;
    }

    nextInterval() {
        const jitter = 1 + (this.random() * 2 - 1) * this.table.jitter;
        return Math.round(this.table.checkInterval * jitter);
    }

    stateOf(world) {
        const existing = world.query('randomEvents')[0];
        if (existing !== undefined) {
            return world.getComponent(existing, 'randomEvents');
        }
        const stateId = world.createEntity();
        const state = { ticks: 0, countdown: this.table.firstCheck, cooldowns: {} };
        world.addComponent(stateId, 'randomEvents', state);
        return state;
    }
}
