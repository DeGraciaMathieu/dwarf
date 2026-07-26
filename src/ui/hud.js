import { SEASONS } from '../systems/seasonSystem.js';

const TICKS_PER_SECOND = 5;
const SEASON_ICONS = ['🌱', '☀', '🍂', '❄'];

export class Hud {
    constructor(element, world, jobBoard, goblinSpawn) {
        this.element = element;
        this.world = world;
        this.jobBoard = jobBoard;
        this.goblinSpawn = goblinSpawn;
        this.renderedHtml = '';
    }

    render(tick) {
        const population = this.world.query('worker').length;
        const wave = this.goblinSpawn.currentWave(this.world);
        const countdown = this.goblinSpawn.nextWaveCountdown(this.world);
        const html = `
            <span title="Temps écoulé">⏱ ${this.clock(tick)}</span>
            <span title="Nains vivants">☺ ${population}</span>
            <span title="Prochaine vague">⚔ ${this.clock(countdown)}${wave > 0 ? ` (vague ${wave})` : ''}</span>
            <span title="Jobs disponibles / en cours / inaccessibles">⚒ ${this.jobBoard.countAvailable()} · ${this.jobBoard.countClaimed()} · ${this.jobBoard.countUnreachable()}</span>
            ${this.season()}
        `;
        if (html === this.renderedHtml) {
            return;
        }
        this.renderedHtml = html;
        this.element.innerHTML = html;
    }

    season() {
        const seasonId = this.world.query('season')[0];
        if (seasonId === undefined) {
            return '';
        }
        const index = this.world.getComponent(seasonId, 'season').index;
        return `<span title="Saison">${SEASON_ICONS[index]} ${SEASONS[index]}</span>`;
    }

    clock(ticks) {
        const totalSeconds = Math.max(0, Math.floor(ticks / TICKS_PER_SECOND));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
}
