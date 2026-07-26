import { readFileSync } from 'node:fs';
import { World } from '../src/core/world.js';
import { EventBus } from '../src/core/eventBus.js';
import { Terrain } from '../src/core/terrain.js';
import { JobBoard } from '../src/core/jobBoard.js';
import { Zone } from '../src/core/zones.js';
import { EVENTS } from '../src/events/events.js';
import { SeasonSystem, SEASON_LENGTH, SEASONS } from '../src/systems/seasonSystem.js';
import { NeedsSystem } from '../src/systems/needsSystem.js';
import { AttritionSystem } from '../src/systems/attritionSystem.js';
import { DrinkSystem } from '../src/systems/drinkSystem.js';
import { MoraleSystem } from '../src/systems/moraleSystem.js';
import { GoblinSpawnSystem } from '../src/systems/goblinSpawnSystem.js';
import { MigrantSystem } from '../src/systems/migrantSystem.js';
import { ArbiterSystem } from '../src/systems/arbiterSystem.js';
import { JobAssignmentSystem } from '../src/systems/jobAssignmentSystem.js';
import { EatingSystem } from '../src/systems/eatingSystem.js';
import { SleepSystem } from '../src/systems/sleepSystem.js';
import { SocializeSystem } from '../src/systems/socializeSystem.js';
import { RescueSystem } from '../src/systems/rescueSystem.js';
import { HealSystem } from '../src/systems/healSystem.js';
import { InjurySystem } from '../src/systems/injurySystem.js';
import { FleeSystem } from '../src/systems/fleeSystem.js';
import { FightSystem } from '../src/systems/fightSystem.js';
import { BrawlSystem } from '../src/systems/brawlSystem.js';
import { IntoxicationSystem } from '../src/systems/intoxicationSystem.js';
import { TantrumSystem } from '../src/systems/tantrumSystem.js';
import { DigSystem } from '../src/systems/digSystem.js';
import { ChopSystem } from '../src/systems/chopSystem.js';
import { HaulSystem } from '../src/systems/haulSystem.js';
import { PerishSystem } from '../src/systems/perishSystem.js';
import { GraveSystem } from '../src/systems/graveSystem.js';
import { EquipSystem } from '../src/systems/equipSystem.js';
import { BuildSystem } from '../src/systems/buildSystem.js';
import { CraftSystem } from '../src/systems/craftSystem.js';
import { StewardSystem } from '../src/systems/stewardSystem.js';
import { FarmSystem } from '../src/systems/farmSystem.js';
import { FishSystem } from '../src/systems/fishSystem.js';
import { HostileSystem } from '../src/systems/hostileSystem.js';
import { CombatSystem } from '../src/systems/combatSystem.js';
import { MovementSystem } from '../src/systems/movementSystem.js';
import { JobAlertSystem } from '../src/systems/jobAlertSystem.js';
import { DemolishSystem } from '../src/systems/demolishSystem.js';

const loadData = (file) =>
    JSON.parse(readFileSync(new URL(`../src/data/${file}`, import.meta.url)));

export const data = {
    tiles: loadData('tiles.json'),
    items: loadData('items.json'),
    plants: loadData('plants.json'),
    recipes: loadData('recipes.json'),
    creatures: loadData('creatures.json'),
};

export const goblinArchetypes = () => ({
    grunt: data.creatures.goblin,
    brute: data.creatures.brute,
    archer: data.creatures.archer,
    chief: data.creatures.chief,
});

export { EVENTS };

export function makeTerrain(rows) {
    const glyphToTile = { '#': 'wall', T: 'tree', '+': 'door', '~': 'water', '≡': 'bridge' };
    const tiles = rows.map((row) => [...row].map((glyph) => glyphToTile[glyph] ?? 'floor'));
    return new Terrain(rows[0].length, rows.length, tiles, data.tiles);
}

export function openTerrain(width, height) {
    return makeTerrain(Array.from({ length: height }, () => '.'.repeat(width)));
}

export function setupColony(
    terrain,
    { goblinSpawner = false, migrants = false, objectives = null, random = Math.random } = {}
) {
    const world = new World();
    const bus = new EventBus();
    const jobBoard = new JobBoard();
    const stockpiles = new Zone();
    const farms = new Zone();
    const fishingSpots = new Zone();
    const graves = new Zone();
    const infirmary = new Zone();
    const bedrooms = new Zone();
    world.registerSystem(new SeasonSystem());
    world.registerSystem(
        new NeedsSystem([
            { component: 'hunger', event: EVENTS.DWARF_HUNGRY },
            { component: 'thirst', event: EVENTS.DWARF_THIRSTY },
            { component: 'fatigue', event: EVENTS.DWARF_TIRED },
            { component: 'social', event: EVENTS.DWARF_LONELY },
        ])
    );
    world.registerSystem(
        new AttritionSystem(jobBoard, data.items.corpse, [
            {
                component: 'hunger',
                marker: 'starving',
                event: EVENTS.DWARF_STARVING,
                healthDecay: 0.15,
                moraleDecay: 0.2,
                cause: 'starvation',
            },
            {
                component: 'thirst',
                marker: 'dehydrated',
                event: EVENTS.DWARF_DEHYDRATED,
                healthDecay: 0.25,
                moraleDecay: 0.2,
                cause: 'dehydration',
            },
        ])
    );
    world.registerSystem(new MoraleSystem(bus));
    world.registerSystem(new IntoxicationSystem());
    if (goblinSpawner) {
        world.registerSystem(new GoblinSpawnSystem(terrain, goblinArchetypes(), random));
    }
    if (migrants) {
        world.registerSystem(new MigrantSystem(terrain, data.creatures.dwarf));
    }
    if (objectives) {
        world.registerSystem(new StewardSystem(jobBoard, data.recipes, data.items, objectives));
    }
    world.registerSystem(new ArbiterSystem(jobBoard, infirmary));
    world.registerSystem(new JobAssignmentSystem(jobBoard));
    world.registerSystem(new EatingSystem(terrain));
    world.registerSystem(new DrinkSystem(terrain));
    world.registerSystem(new SleepSystem(terrain, bedrooms));
    world.registerSystem(new SocializeSystem(terrain));
    world.registerSystem(new RescueSystem(terrain, infirmary));
    world.registerSystem(new HealSystem(terrain, infirmary));
    world.registerSystem(new FleeSystem(terrain));
    world.registerSystem(new FightSystem(terrain));
    world.registerSystem(new BrawlSystem(terrain));
    world.registerSystem(new TantrumSystem(terrain));
    world.registerSystem(new DigSystem(jobBoard, terrain, data.items.stone, data.items.ore));
    world.registerSystem(new ChopSystem(jobBoard, terrain, data.items.log));
    world.registerSystem(new HaulSystem(jobBoard, terrain, stockpiles));
    world.registerSystem(new PerishSystem(stockpiles));
    world.registerSystem(new GraveSystem(jobBoard, terrain, graves));
    world.registerSystem(new EquipSystem(jobBoard, terrain));
    world.registerSystem(new BuildSystem(jobBoard, terrain));
    world.registerSystem(new CraftSystem(jobBoard, terrain, data.recipes, data.items));
    world.registerSystem(new DemolishSystem(jobBoard, terrain));
    world.registerSystem(new FarmSystem(jobBoard, terrain, farms, data.plants.mushroom, data.items.mushroom));
    world.registerSystem(new FishSystem(jobBoard, terrain, fishingSpots, data.items.fish));
    world.registerSystem(new HostileSystem(terrain));
    world.registerSystem(new CombatSystem(jobBoard, data.items.corpse));
    world.registerSystem(new InjurySystem(jobBoard, data.items.corpse));
    world.registerSystem(new MovementSystem(terrain));
    world.registerSystem(new JobAlertSystem(jobBoard));

    return {
        world,
        bus,
        jobBoard,
        stockpiles,
        farms,
        fishingSpots,
        graves,
        infirmary,
        bedrooms,
        terrain,
        run(ticks) {
            for (let i = 0; i < ticks; i++) {
                world.tick(bus);
            }
        },
        collect(eventName) {
            const seen = [];
            bus.on(eventName, (payload) => seen.push(payload));
            return seen;
        },
    };
}

export function addDwarf(world, x, y, overrides = {}) {
    const {
        name = 'Urist',
        hunger = 0,
        hungerRate = 0,
        thirst = 0,
        thirstRate = 0,
        fatigue = 0,
        fatigueRate = 0,
        health = 30,
        morale = 70,
        courage = 0.5,
        social = 0,
        socialRate = 0,
    } = overrides;
    const id = world.createEntity();
    world.addComponent(id, 'identity', { name });
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'hunger', { value: hunger, rate: hungerRate, threshold: 70, max: 100 });
    world.addComponent(id, 'thirst', { value: thirst, rate: thirstRate, threshold: 65, max: 100 });
    world.addComponent(id, 'fatigue', {
        value: fatigue,
        rate: fatigueRate,
        threshold: 80,
        max: 120,
        recovery: 6,
    });
    world.addComponent(id, 'health', { value: health, max: 30 });
    world.addComponent(id, 'combat', { damage: 4, cooldown: 5, courage });
    world.addComponent(id, 'morale', {
        value: morale,
        max: 100,
        baseline: 70,
        drift: 0.05,
        low: 40,
        tantrum: 15,
    });
    world.addComponent(id, 'social', { value: social, rate: socialRate, threshold: 75, max: 100 });
    world.addComponent(id, 'relationships', { affinities: {} });
    world.addComponent(id, 'thoughts', { list: [] });
    world.addComponent(id, 'wander', {});
    world.addComponent(id, 'worker', {});
    world.addComponent(id, 'equipment', {});
    return id;
}

export function addGoblin(world, x, y, { health = 16 } = {}) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'hostile', { visionRange: 8 });
    world.addComponent(id, 'health', { value: health, max: 16 });
    world.addComponent(id, 'combat', { damage: 4, cooldown: 5 });
    world.addComponent(id, 'wander', {});
    return id;
}

export function addBread(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'food', { nutrition: 100 });
    world.addComponent(id, 'item', {});
    return id;
}

export function addLog(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'item', {});
    world.addComponent(id, 'buildMaterial', {});
    return id;
}

export function addStone(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'item', {});
    world.addComponent(id, 'buildMaterial', {});
    world.addComponent(id, 'stone', {});
    return id;
}

export function addOre(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'item', {});
    world.addComponent(id, 'ore', {});
    return id;
}

export function addSword(world, x, y, { damage = 6 } = {}) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'weapon', { damage });
    return id;
}

export function addMail(world, x, y, { defense = 3 } = {}) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'armor', { defense });
    return id;
}

export function addCorpse(world, x, y, { decay = 0 } = {}) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'item', {});
    world.addComponent(id, 'corpse', { decay });
    return id;
}

export function addBed(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'bed', { recoveryMultiplier: 1.5, heal: 1 });
    return id;
}

// positionne le cycle des saisons à un instant donné (l'index découle des ticks)
export function seasonTicks(world, ticks) {
    let id = world.query('season')[0];
    if (id === undefined) {
        id = world.createEntity();
        world.addComponent(id, 'season', { ticks: 0, index: 0 });
    }
    const season = world.getComponent(id, 'season');
    season.ticks = ticks;
    season.index = Math.floor(ticks / SEASON_LENGTH) % SEASONS.length;
    return id;
}

export function addBrazier(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'comfort', { range: 3, bonus: 0.1 });
    return id;
}

export function addMushroom(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'food', { nutrition: 80 });
    world.addComponent(id, 'item', {});
    world.addComponent(id, 'brewable', {});
    world.addComponent(id, 'cookable', {});
    return id;
}

export function addKitchen(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'workshop', { type: 'kitchen' });
    return id;
}

export function addMeal(world, x, y, { freshness = 500 } = {}) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'food', { nutrition: 120 });
    world.addComponent(id, 'item', {});
    world.addComponent(id, 'cooked', {});
    world.addComponent(id, 'perishable', { freshness, decay: 1 });
    return id;
}

export function addBrewery(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'workshop', { type: 'brewery' });
    return id;
}

export function addWell(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'well', {});
    return id;
}

export function addBeer(world, x, y) {
    const id = world.createEntity();
    world.addComponent(id, 'position', { x, y });
    world.addComponent(id, 'item', {});
    world.addComponent(id, 'drink', {});
    return id;
}

export function entitiesAt(world, componentName, x, y) {
    return world.query(componentName, 'position').filter((id) => {
        const position = world.getComponent(id, 'position');
        return position.x === x && position.y === y;
    });
}
