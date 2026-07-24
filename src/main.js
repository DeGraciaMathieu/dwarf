import { World } from './core/world.js';
import { EventBus } from './core/eventBus.js';
import { startLoop } from './core/loop.js';
import { generateTerrain, largestWalkableRegion } from './core/terrain.js';
import { JobBoard } from './core/jobBoard.js';
import { Zone } from './core/zones.js';
import { spawnFromDefinition } from './core/spawn.js';
import { EVENTS } from './events/events.js';
import { MovementSystem } from './systems/movementSystem.js';
import { NeedsSystem } from './systems/needsSystem.js';
import { MoraleSystem } from './systems/moraleSystem.js';
import { TantrumSystem } from './systems/tantrumSystem.js';
import { ArbiterSystem } from './systems/arbiterSystem.js';
import { SleepSystem } from './systems/sleepSystem.js';
import { EatingSystem } from './systems/eatingSystem.js';
import { JobAssignmentSystem } from './systems/jobAssignmentSystem.js';
import { FleeSystem } from './systems/fleeSystem.js';
import { FightSystem } from './systems/fightSystem.js';
import { DigSystem } from './systems/digSystem.js';
import { ChopSystem } from './systems/chopSystem.js';
import { HaulSystem } from './systems/haulSystem.js';
import { BuildSystem } from './systems/buildSystem.js';
import { FarmSystem } from './systems/farmSystem.js';
import { GoblinSpawnSystem } from './systems/goblinSpawnSystem.js';
import { HostileSystem } from './systems/hostileSystem.js';
import { CombatSystem } from './systems/combatSystem.js';
import { Renderer } from './ui/renderer.js';
import { EventLog } from './ui/eventLog.js';
import { DesignationControl } from './ui/designation.js';
import { InspectionPanel } from './ui/inspectionPanel.js';

const GRID = { width: 40, height: 25 };
const TILE_SIZE = 20;
const TICKS_PER_SECOND = 5;
const DWARF_NAMES = ['Urist', 'Bofur', 'Dagna', 'Thorik', 'Vala'];
const BREAD_COUNT = 8;

async function main() {
    const [creatures, items, tiles, plants] = await Promise.all([
        fetch('src/data/creatures.json').then((response) => response.json()),
        fetch('src/data/items.json').then((response) => response.json()),
        fetch('src/data/tiles.json').then((response) => response.json()),
        fetch('src/data/plants.json').then((response) => response.json()),
    ]);

    const world = new World();
    const eventBus = new EventBus();
    const terrain = generateTerrain(GRID.width, GRID.height, tiles);
    const spawnRegion = largestWalkableRegion(terrain);
    const jobBoard = new JobBoard();
    const stockpiles = new Zone();
    const farms = new Zone();

    world.registerSystem(
        new NeedsSystem([
            { component: 'hunger', event: EVENTS.DWARF_HUNGRY },
            { component: 'fatigue', event: EVENTS.DWARF_TIRED },
        ])
    );
    world.registerSystem(new MoraleSystem(eventBus));
    world.registerSystem(new GoblinSpawnSystem(terrain, creatures.goblin));
    world.registerSystem(new ArbiterSystem(jobBoard));
    world.registerSystem(new JobAssignmentSystem(jobBoard));
    world.registerSystem(new EatingSystem(terrain));
    world.registerSystem(new SleepSystem());
    world.registerSystem(new FleeSystem(terrain));
    world.registerSystem(new FightSystem(terrain));
    world.registerSystem(new TantrumSystem(terrain));
    world.registerSystem(new DigSystem(jobBoard, terrain));
    world.registerSystem(new ChopSystem(jobBoard, terrain, items.log));
    world.registerSystem(new HaulSystem(jobBoard, terrain, stockpiles));
    world.registerSystem(new BuildSystem(jobBoard, terrain));
    world.registerSystem(new FarmSystem(jobBoard, terrain, farms, plants.mushroom, items.mushroom));
    world.registerSystem(new HostileSystem(terrain));
    world.registerSystem(new CombatSystem(jobBoard, items.corpse));
    world.registerSystem(new MovementSystem(terrain));

    const randomTile = () => spawnRegion[Math.floor(Math.random() * spawnRegion.length)];
    for (const name of DWARF_NAMES) {
        const dwarfId = spawnFromDefinition(world, creatures.dwarf, randomTile());
        world.addComponent(dwarfId, 'identity', { name });
    }
    for (let i = 0; i < BREAD_COUNT; i++) {
        spawnFromDefinition(world, items.bread, randomTile());
    }

    const canvas = document.getElementById('game');
    const renderer = new Renderer(canvas, terrain, jobBoard, stockpiles, farms, TILE_SIZE);
    new EventLog(document.getElementById('event-log'), eventBus, world);
    const inspection = new InspectionPanel(document.getElementById('inspection'), world);
    new DesignationControl(
        canvas,
        document.getElementById('toolbar'),
        terrain,
        jobBoard,
        stockpiles,
        farms,
        TILE_SIZE,
        (x, y) => inspection.selectAt(x, y)
    );

    const loop = startLoop({
        ticksPerSecond: TICKS_PER_SECOND,
        onTick: () => world.tick(eventBus),
        onRender: () => {
            renderer.render(world);
            inspection.render();
        },
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
