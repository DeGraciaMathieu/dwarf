import { World } from './core/world.js';
import { EventBus } from './core/eventBus.js';
import { startLoop } from './core/loop.js';
import { generateTerrain, largestWalkableRegion } from './core/terrain.js';
import { JobBoard } from './core/jobBoard.js';
import { Zone } from './core/zones.js';
import { spawnFromDefinition } from './core/spawn.js';
import { serializeGame, restoreGame } from './save.js';
import { EVENTS } from './events/events.js';
import { MovementSystem } from './systems/movementSystem.js';
import { SeasonSystem } from './systems/seasonSystem.js';
import { NeedsSystem } from './systems/needsSystem.js';
import { AttritionSystem } from './systems/attritionSystem.js';
import { DrinkSystem } from './systems/drinkSystem.js';
import { MoraleSystem } from './systems/moraleSystem.js';
import { TantrumSystem } from './systems/tantrumSystem.js';
import { ArbiterSystem } from './systems/arbiterSystem.js';
import { SleepSystem } from './systems/sleepSystem.js';
import { SocializeSystem, assignPersonality } from './systems/socializeSystem.js';
import { RescueSystem } from './systems/rescueSystem.js';
import { HealSystem } from './systems/healSystem.js';
import { InjurySystem } from './systems/injurySystem.js';
import { EatingSystem } from './systems/eatingSystem.js';
import { JobAssignmentSystem } from './systems/jobAssignmentSystem.js';
import { FleeSystem } from './systems/fleeSystem.js';
import { FightSystem } from './systems/fightSystem.js';
import { BrawlSystem } from './systems/brawlSystem.js';
import { IntoxicationSystem } from './systems/intoxicationSystem.js';
import { DigSystem } from './systems/digSystem.js';
import { ChopSystem } from './systems/chopSystem.js';
import { HaulSystem } from './systems/haulSystem.js';
import { PerishSystem } from './systems/perishSystem.js';
import { GraveSystem } from './systems/graveSystem.js';
import { EquipSystem } from './systems/equipSystem.js';
import { BuildSystem } from './systems/buildSystem.js';
import { CraftSystem } from './systems/craftSystem.js';
import { DemolishSystem } from './systems/demolishSystem.js';
import { assignAptitude } from './systems/workEffort.js';
import { StewardSystem } from './systems/stewardSystem.js';
import { FarmSystem } from './systems/farmSystem.js';
import { FishSystem } from './systems/fishSystem.js';
import { GoblinSpawnSystem } from './systems/goblinSpawnSystem.js';
import { MigrantSystem } from './systems/migrantSystem.js';
import { HostileSystem } from './systems/hostileSystem.js';
import { CombatSystem } from './systems/combatSystem.js';
import { JobAlertSystem } from './systems/jobAlertSystem.js';
import { ChronicleSystem } from './systems/chronicleSystem.js';
import { Renderer } from './ui/renderer.js';
import { EventLog } from './ui/eventLog.js';
import { DesignationControl } from './ui/designation.js';
import { InspectionPanel } from './ui/inspectionPanel.js';
import { ObjectivesPanel } from './ui/objectivesPanel.js';
import { LegendPanel } from './ui/legendPanel.js';
import { Hud } from './ui/hud.js';

const GRID = { width: 40, height: 25 };
const TILE_SIZE = 20;
const TICKS_PER_SECOND = 5;
const STARTING_DWARVES = 5;
const BREAD_COUNT = 8;

async function main() {
    const [creatures, items, tiles, plants, recipes] = await Promise.all([
        fetch('src/data/creatures.json').then((response) => response.json()),
        fetch('src/data/items.json').then((response) => response.json()),
        fetch('src/data/tiles.json').then((response) => response.json()),
        fetch('src/data/plants.json').then((response) => response.json()),
        fetch('src/data/recipes.json').then((response) => response.json()),
    ]);

    const world = new World();
    const eventBus = new EventBus();
    const terrain = generateTerrain(GRID.width, GRID.height, tiles);
    const spawnRegion = largestWalkableRegion(terrain);
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
        new AttritionSystem(jobBoard, items.corpse, [
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
    world.registerSystem(new MoraleSystem(eventBus));
    world.registerSystem(new IntoxicationSystem());
    const goblinSpawn = new GoblinSpawnSystem(terrain, {
        grunt: creatures.goblin,
        brute: creatures.brute,
        archer: creatures.archer,
        chief: creatures.chief,
    });
    world.registerSystem(goblinSpawn);
    world.registerSystem(new MigrantSystem(terrain, creatures.dwarf));
    const objectives = [
        { recipe: 'beer', target: 0 },
        { recipe: 'meal', target: 0 },
        { recipe: 'sword', target: 0 },
        { recipe: 'axe', target: 0 },
        { recipe: 'spear', target: 0 },
        { recipe: 'mail', target: 0 },
        { recipe: 'plate', target: 0 },
        { recipe: 'shield', target: 0 },
    ];
    world.registerSystem(new StewardSystem(jobBoard, recipes, items, objectives));
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
    world.registerSystem(new DigSystem(jobBoard, terrain, items.stone, items.ore));
    world.registerSystem(new ChopSystem(jobBoard, terrain, items.log));
    world.registerSystem(new HaulSystem(jobBoard, terrain, stockpiles));
    world.registerSystem(new PerishSystem(stockpiles));
    world.registerSystem(new GraveSystem(jobBoard, terrain, graves));
    world.registerSystem(new EquipSystem(jobBoard, terrain));
    world.registerSystem(new BuildSystem(jobBoard, terrain));
    world.registerSystem(new CraftSystem(jobBoard, terrain, recipes, items));
    world.registerSystem(new DemolishSystem(jobBoard, terrain));
    world.registerSystem(new FarmSystem(jobBoard, terrain, farms, plants.mushroom, items.mushroom));
    world.registerSystem(new FishSystem(jobBoard, terrain, fishingSpots, items.fish));
    world.registerSystem(new HostileSystem(terrain));
    world.registerSystem(new CombatSystem(jobBoard, items.corpse));
    world.registerSystem(new InjurySystem(jobBoard, items.corpse));
    world.registerSystem(new MovementSystem(terrain));
    world.registerSystem(new JobAlertSystem(jobBoard));
    world.registerSystem(new ChronicleSystem(eventBus));

    const randomTile = () => spawnRegion[Math.floor(Math.random() * spawnRegion.length)];
    for (const name of creatures.dwarf.names.slice(0, STARTING_DWARVES)) {
        const dwarfId = spawnFromDefinition(world, creatures.dwarf, randomTile());
        world.addComponent(dwarfId, 'identity', { name });
        assignAptitude(world, dwarfId);
        assignPersonality(world, dwarfId);
    }
    for (let i = 0; i < BREAD_COUNT; i++) {
        spawnFromDefinition(world, items.bread, randomTile());
    }

    const canvas = document.getElementById('game');
    const renderer = new Renderer(canvas, terrain, jobBoard, stockpiles, farms, fishingSpots, graves, infirmary, bedrooms, TILE_SIZE);
    const eventLog = new EventLog(document.getElementById('event-log'), eventBus, world);
    const inspection = new InspectionPanel(document.getElementById('inspection'), world, bedrooms);
    const objectivesPanel = new ObjectivesPanel(document.getElementById('objectives'), objectives, recipes);
    const legendPanel = new LegendPanel(document.getElementById('legend'), world);
    const hud = new Hud(document.getElementById('hud'), world, jobBoard, goblinSpawn);
    new DesignationControl({
        canvas,
        toolbar: document.getElementById('toolbar'),
        world,
        terrain,
        jobBoard,
        stockpiles,
        farms,
        fishingSpots,
        graves,
        infirmary,
        bedrooms,
        tileSize: TILE_SIZE,
        recipes,
        onDwarfClick: (x, y) => inspection.selectAt(x, y),
    });

    let tick = 0;
    const loop = startLoop({
        ticksPerSecond: TICKS_PER_SECOND,
        onTick: () => {
            tick++;
            world.tick(eventBus);
        },
        onRender: () => {
            renderer.render(world);
            inspection.render();
            objectivesPanel.render();
            legendPanel.render();
            hud.render(tick);
        },
    });

    const game = { world, terrain, jobBoard, stockpiles, farms, fishingSpots, graves, infirmary, bedrooms };
    document.getElementById('save-game').addEventListener('click', () => {
        localStorage.setItem('dwarf.save', JSON.stringify(serializeGame(game)));
        eventLog.append('Partie sauvegardée.');
    });
    document.getElementById('load-game').addEventListener('click', () => {
        const raw = localStorage.getItem('dwarf.save');
        if (!raw) {
            eventLog.append('Aucune sauvegarde.');
            return;
        }
        restoreGame(game, JSON.parse(raw));
        eventLog.append('Partie chargée.');
    });

    document.getElementById('show-legend').addEventListener('click', () => legendPanel.toggle());
    eventBus.on(EVENTS.COLONY_ENDED, () => {
        eventLog.append('La colonie s\'est éteinte. Voici sa légende…', true);
        legendPanel.open();
    });

    const speedButtons = document.querySelectorAll('#speed button');
    speedButtons.forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelector('#speed button.active')?.classList.remove('active');
            button.classList.add('active');
            loop.speed = Number(button.dataset.speed);
        });
    });
}

main();
