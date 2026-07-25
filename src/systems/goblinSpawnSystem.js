import { EVENTS } from '../events/events.js';
import { spawnFromDefinition } from '../core/spawn.js';
import { randomEdgeTile } from '../core/terrain.js';

const FIRST_WAVE_DELAY = 500;
const BASE_INTERVAL = 750;
const MIN_INTERVAL = 400;
const INTERVAL_STEP = 50;
const MAX_WAVE_SIZE = 6;
const POPULATION_COMFORT = 5;

export class GoblinSpawnSystem {
    constructor(terrain, goblinDefinition) {
        this.terrain = terrain;
        this.goblinDefinition = goblinDefinition;
    }

    update(world, eventBus) {
        const invasion = this.invasionState(world);
        invasion.countdown--;
        if (invasion.countdown > 0) {
            return;
        }
        invasion.wave++;
        invasion.countdown = Math.max(MIN_INTERVAL, BASE_INTERVAL - invasion.wave * INTERVAL_STEP);

        const population = world.query('worker').length;
        if (population === 0) {
            return;
        }
        const anchor = randomEdgeTile(this.terrain, { hostile: true });
        if (!anchor) {
            return;
        }
        const size = this.waveSize(invasion.wave, population);
        for (let i = 0; i < size; i++) {
            spawnFromDefinition(world, this.goblinDefinition, this.nearAnchor(anchor, i));
        }
        eventBus.emit(EVENTS.GOBLIN_ARRIVED, { count: size });
    }

    invasionState(world) {
        const existing = world.query('invasion')[0];
        if (existing !== undefined) {
            return world.getComponent(existing, 'invasion');
        }
        const stateId = world.createEntity();
        const state = { wave: 0, countdown: FIRST_WAVE_DELAY };
        world.addComponent(stateId, 'invasion', state);
        return state;
    }

    // lecture seule pour le HUD : nombre de vagues passées et ticks avant la prochaine
    currentWave(world) {
        const existing = world.query('invasion')[0];
        return existing !== undefined ? world.getComponent(existing, 'invasion').wave : 0;
    }

    nextWaveCountdown(world) {
        const existing = world.query('invasion')[0];
        return existing !== undefined
            ? world.getComponent(existing, 'invasion').countdown
            : FIRST_WAVE_DELAY;
    }

    waveSize(wave, population) {
        const fromWave = Math.floor((wave - 1) / 2);
        const fromPopulation = Math.floor(Math.max(0, population - POPULATION_COMFORT) / 4);
        return Math.min(MAX_WAVE_SIZE, 1 + fromWave + fromPopulation);
    }

    nearAnchor(anchor, index) {
        if (index === 0) {
            return anchor;
        }
        const dx = (index % 3) - 1;
        const dy = Math.floor(index / 3) - 1;
        const x = anchor.x + dx;
        const y = anchor.y + dy;
        return this.terrain.isWalkable(x, y, { hostile: true }) ? { x, y } : anchor;
    }
}
