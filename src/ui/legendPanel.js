import { chronicleScore, MILESTONES } from '../systems/chronicleSystem.js';

const TICKS_PER_SECOND = 5;

const DEATH_CAUSES = {
    starvation: 'de faim',
    dehydration: 'de soif',
    brawl: 'dans une rixe',
    bleeding: "vidé de son sang",
    combat: 'au combat',
};

const MILESTONE_LABELS = Object.fromEntries(MILESTONES.map((m) => [m.key, m.label]));

// Lit `chronicle` en lecture seule et affiche la « légende » de la colonie à la
// demande (bilan intermédiaire) ou à l'extinction. Ne touche aucun composant de sim.
export class LegendPanel {
    constructor(element, world) {
        this.element = element;
        this.world = world;
        this.visible = false;
    }

    toggle() {
        this.visible = !this.visible;
        this.render();
    }

    open() {
        this.visible = true;
        this.render();
    }

    render() {
        if (!this.visible) {
            this.element.innerHTML = '';
            return;
        }
        const chronicle = this.chronicle();
        if (!chronicle) {
            this.element.innerHTML = '<div class="legend"><p>La colonie n\'a pas encore d\'histoire.</p></div>';
            return;
        }
        this.element.innerHTML = `
            <div class="legend">
                <h2>${chronicle.ended ? 'Légende de la colonie' : 'Chronique en cours'}</h2>
                <ul class="legend-stats">
                    <li>Durée : ${this.clock(chronicle.ticks)}</li>
                    <li>Hivers traversés : ${chronicle.wintersSurvived}</li>
                    <li>Pic de population : ${chronicle.peakPopulation}</li>
                    <li>Arrivées : ${chronicle.arrivals}</li>
                    <li>Gobelins repoussés : ${chronicle.goblinsSlain}</li>
                    <li>Chefs-d'œuvre : ${chronicle.masterworks}</li>
                    <li>Amitiés nouées : ${chronicle.friendships} · Rivalités : ${chronicle.rivalries}</li>
                    <li>Morts : ${chronicle.deaths}</li>
                </ul>
                ${this.milestonesSection(chronicle)}
                ${this.deathsSection(chronicle)}
                ${this.bondsSection(chronicle)}
                <p class="legend-score">Score final : ${chronicleScore(chronicle)}</p>
            </div>
        `;
    }

    milestonesSection(chronicle) {
        if (chronicle.milestones.length === 0) {
            return '';
        }
        const items = chronicle.milestones
            .map((key) => `<li>${MILESTONE_LABELS[key] ?? key}</li>`)
            .join('');
        return `<h3>Jalons</h3><ul class="legend-list">${items}</ul>`;
    }

    deathsSection(chronicle) {
        if (chronicle.deathsLog.length === 0) {
            return '';
        }
        const items = chronicle.deathsLog
            .map(({ name, cause }) => `<li>${name} — mort ${DEATH_CAUSES[cause] ?? 'de ses blessures'}</li>`)
            .join('');
        return `<h3>Défunts</h3><ul class="legend-list">${items}</ul>`;
    }

    bondsSection(chronicle) {
        const friends = chronicle.friendshipsLog
            .map(({ a, b }) => `<li>${a} & ${b}</li>`)
            .join('');
        const rivals = chronicle.rivalriesLog
            .map(({ a, b }) => `<li>${a} vs ${b}</li>`)
            .join('');
        return `
            ${friends ? `<h3>Amitiés</h3><ul class="legend-list">${friends}</ul>` : ''}
            ${rivals ? `<h3>Rivalités</h3><ul class="legend-list">${rivals}</ul>` : ''}
        `;
    }

    chronicle() {
        const id = this.world.query('chronicle')[0];
        return id !== undefined ? this.world.getComponent(id, 'chronicle') : null;
    }

    clock(ticks) {
        const totalSeconds = Math.max(0, Math.floor(ticks / TICKS_PER_SECOND));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
}
