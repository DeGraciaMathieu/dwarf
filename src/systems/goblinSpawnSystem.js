import { EVENTS } from '../events/events.js';
import { spawnFromDefinition } from '../core/spawn.js';
import { randomEdgeTile } from '../core/terrain.js';

// courbe de menace — un long répit initial, puis des vagues rares et irrégulières
// (intervalle jitteré + accalmies) qui grossissent lentement avec la population ET
// la richesse (armes, armures, ateliers).
const FIRST_WAVE_DELAY = 600;
const BASE_INTERVAL = 1400;
const MIN_INTERVAL = 900;
const INTERVAL_ACCEL = 30;
const INTERVAL_JITTER = 0.5; // ±50 % d'aléa sur chaque intervalle
const CALM_CHANCE = 0.25; // une alerte sur quatre se dissipe sans attaque
const MAX_WAVE_SIZE = 12;
const POPULATION_COMFORT = 6;
// spéciaux rares : gate de vague minimale + probabilité par ennemi
const BRUTE_FROM = 3;
const ARCHER_FROM = 4;
const CHIEF_FROM = 6;
const ARCHER_CHANCE = 0.15;
const BRUTE_CHANCE = 0.25;
const CHIEF_CHANCE = 0.5;

export class GoblinSpawnSystem {
    // archetypes : { grunt, brute, archer, chief } (définitions de creatures.json)
    constructor(terrain, archetypes, random = Math.random) {
        this.terrain = terrain;
        this.archetypes = archetypes.grunt ? archetypes : { grunt: archetypes };
        this.random = random;
    }

    update(world, eventBus) {
        const invasion = this.invasionState(world);
        invasion.countdown--;
        if (invasion.countdown > 0) {
            return;
        }
        // le prochain rendez-vous est toujours réarmé (intervalle aléatoire), même si
        // cette alerte tourne à l'accalmie — la difficulté n'avance qu'aux vraies vagues
        invasion.countdown = this.nextInterval(invasion.wave + 1);

        const population = world.query('worker').length;
        if (population === 0) {
            return;
        }
        // fausse alerte occasionnelle : la menace se dissipe sans ennemis (rareté)
        if (invasion.wave >= 1 && this.random() < CALM_CHANCE) {
            return;
        }
        const anchor = randomEdgeTile(this.terrain, { hostile: true });
        if (!anchor) {
            return;
        }
        invasion.wave++;
        const size = this.waveSize(invasion.wave, population, this.richness(world));
        this.waveRoster(invasion.wave, size).forEach((key, i) => {
            const definition = this.archetypes[key] ?? this.archetypes.grunt;
            spawnFromDefinition(world, definition, this.nearAnchor(anchor, i));
        });
        eventBus.emit(EVENTS.GOBLIN_ARRIVED, { count: size });
    }

    // intervalle jitteré autour d'une base qui se resserre lentement avec les vagues
    nextInterval(wave) {
        const base = Math.max(MIN_INTERVAL, BASE_INTERVAL - wave * INTERVAL_ACCEL);
        const jitter = 1 + (this.random() * 2 - 1) * INTERVAL_JITTER;
        return Math.round(base * jitter);
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

    // prospérité militaire et industrielle : ce qui attire les pillards
    richness(world) {
        return (
            world.query('weapon').length +
            world.query('armor').length +
            world.query('workshop').length
        );
    }

    waveSize(wave, population, richness) {
        // progression lente : +1 toutes les 3 vagues seulement
        const fromWave = Math.floor((wave - 1) / 3);
        const fromPopulation = Math.floor(Math.max(0, population - POPULATION_COMFORT) / 4);
        const fromRichness = Math.floor(richness / 5);
        // plafond dérivé : une petite colonie est ménagée, une grande peut être submergée
        const cap = Math.min(MAX_WAVE_SIZE, Math.max(3, population));
        return Math.min(cap, 1 + fromWave + fromPopulation + fromRichness);
    }

    // composition aléatoire : chaque ennemi peut être un spécial selon la vague et un
    // tirage, et un chef mène parfois (pas toujours) les vagues avancées — les brutes,
    // archers et chefs restent rares
    waveRoster(wave, size) {
        const roster = new Array(size).fill('grunt');
        if (wave >= CHIEF_FROM && this.archetypes.chief && this.random() < CHIEF_CHANCE) {
            roster[0] = 'chief';
        }
        for (let i = 0; i < size; i++) {
            if (roster[i] !== 'grunt') {
                continue;
            }
            const roll = this.random();
            if (wave >= ARCHER_FROM && this.archetypes.archer && roll < ARCHER_CHANCE) {
                roster[i] = 'archer';
            } else if (wave >= BRUTE_FROM && this.archetypes.brute && roll < ARCHER_CHANCE + BRUTE_CHANCE) {
                roster[i] = 'brute';
            }
        }
        return roster;
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
