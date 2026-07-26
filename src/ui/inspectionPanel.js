import { FRIEND_THRESHOLD, RIVAL_THRESHOLD } from '../systems/socializeSystem.js';

const ACTIVITY_LABELS = {
    fight: 'Combat !',
    flee: 'Fuit !',
    tantrum: 'Rage !',
    eat: 'Va manger',
    drink: 'Va boire',
    sleep: 'Dort',
    socialize: 'Discute',
    rescue: 'Secourt un blessé',
    heal: 'Soigne un blessé',
    incapacitated: 'À terre, blessé',
    work: 'Travaille',
    wander: 'Oisif',
};

const JOB_LABELS = {
    dig: 'creuse un mur',
    chop: 'abat un arbre',
    haul: 'transporte un objet',
    plant: 'sème',
    harvest: 'récolte',
    build: 'bâtit un mur',
    craft: "travaille à l'atelier",
    fish: 'pêche',
    equip: "s'équipe",
    bury: 'enterre un corps',
};

const SKILL_LABELS = {
    mining: 'Minage',
    woodcutting: 'Bûcheronnage',
    crafting: 'Artisanat',
    building: 'Construction',
    farming: 'Agriculture',
    fishing: 'Pêche',
};

// nom d'un équipement d'après son glyphe (les items ne portent pas de nom)
const EQUIPMENT_LABELS = {
    '/': 'épée',
    'γ': 'hache',
    '↑': 'lance',
    '[': 'cotte de mailles',
    ']': 'cotte de plates',
    ')': 'bouclier',
};

export class InspectionPanel {
    constructor(element, world) {
        this.element = element;
        this.world = world;
        this.selectedId = null;
    }

    selectAt(x, y) {
        const dwarfId = this.world.query('identity', 'position').find((entityId) => {
            const position = this.world.getComponent(entityId, 'position');
            return position.x === x && position.y === y;
        });
        if (dwarfId !== undefined) {
            this.selectedId = dwarfId;
        }
        return dwarfId !== undefined;
    }

    render() {
        const identity =
            this.selectedId !== null &&
            this.world.getComponent(this.selectedId, 'identity');
        if (!identity) {
            this.element.innerHTML = '<p class="empty">Cliquez sur un nain pour l\'inspecter.</p>';
            return;
        }
        const activity = this.world.getComponent(this.selectedId, 'activity');
        const currentJob = this.world.getComponent(this.selectedId, 'currentJob');
        const status = this.describeActivity(activity, currentJob);
        const health = this.world.getComponent(this.selectedId, 'health');
        const morale = this.world.getComponent(this.selectedId, 'morale');
        this.element.innerHTML = `
            <h3>${identity.name}</h3>
            <p class="status">${status}</p>
            ${this.injuryNotice()}
            ${this.gauge('Santé', health && { ...health, threshold: health.max * 0.35 }, true)}
            ${this.gauge('Moral', morale && { ...morale, threshold: morale.low }, true)}
            ${this.gauge('Faim', this.world.getComponent(this.selectedId, 'hunger'))}
            ${this.gauge('Soif', this.world.getComponent(this.selectedId, 'thirst'))}
            ${this.gauge('Fatigue', this.world.getComponent(this.selectedId, 'fatigue'))}
            ${this.equipment()}
            ${this.aptitudes()}
            ${this.relationships()}
        `;
    }

    // amis et rivaux marquants ; on ignore les affinités vers un nain disparu
    relationships() {
        const relationships = this.world.getComponent(this.selectedId, 'relationships');
        if (!relationships) {
            return '';
        }
        const friends = [];
        const rivals = [];
        for (const [otherId, affinity] of Object.entries(relationships.affinities)) {
            const identity = this.world.getComponent(Number(otherId), 'identity');
            if (!identity) {
                continue;
            }
            if (affinity >= FRIEND_THRESHOLD) {
                friends.push(identity.name);
            } else if (affinity <= -RIVAL_THRESHOLD) {
                rivals.push(identity.name);
            }
        }
        if (friends.length === 0 && rivals.length === 0) {
            return '';
        }
        const parts = [];
        if (friends.length) {
            parts.push(`Amis : ${friends.join(', ')}`);
        }
        if (rivals.length) {
            parts.push(`Rivaux : ${rivals.join(', ')}`);
        }
        return `<p class="relationships">${parts.join(' · ')}</p>`;
    }

    injuryNotice() {
        const injury = this.world.getComponent(this.selectedId, 'injury');
        if (!injury) {
            return '';
        }
        return '<p class="injury">⚠ Blessé, à terre — se vide de son sang</p>';
    }

    equipment() {
        const equipment = this.world.getComponent(this.selectedId, 'equipment');
        if (!equipment) {
            return '';
        }
        const weapon = this.gear(equipment.weapon, 'weapon', 'damage', 'dégâts');
        const armor = this.gear(equipment.armor, 'armor', 'defense', 'déf.');
        return `<p class="equipment">Arme : ${weapon} · Armure : ${armor}</p>`;
    }

    gear(itemId, component, stat, unit) {
        if (itemId === undefined || itemId === null) {
            return 'aucune';
        }
        const data = this.world.getComponent(itemId, component);
        const glyph = this.world.getComponent(itemId, 'renderable')?.glyph;
        const name = EQUIPMENT_LABELS[glyph] ?? component;
        return data ? `${name} (+${data[stat]} ${unit})` : name;
    }

    aptitudes() {
        const skills = this.world.getComponent(this.selectedId, 'skills');
        if (!skills) {
            return '';
        }
        const notable = Object.entries(skills).filter(([, level]) => level > 0);
        const text = notable.length
            ? notable.map(([name, level]) => `${SKILL_LABELS[name] ?? name} niv. ${level}`).join(', ')
            : 'Généraliste';
        return `<p class="aptitudes">${text}</p>`;
    }

    describeActivity(activity, currentJob) {
        if (activity?.type !== 'work') {
            return ACTIVITY_LABELS[activity?.type] ?? '—';
        }
        if (!currentJob) {
            return 'Cherche du travail';
        }
        const label = JOB_LABELS[currentJob.job.type] ?? currentJob.job.type;
        const target = currentJob.job.target;
        const where = target ? ` (${target.x}, ${target.y})` : '';
        return `Travaille : ${label}${where} — ${this.jobStep(currentJob)}`;
    }

    jobStep(currentJob) {
        if (this.world.getComponent(this.selectedId, 'carrying')) {
            return 'livre';
        }
        return currentJob.progress > 0 ? 'en cours' : 'approche';
    }

    gauge(label, need, lowIsBad = false) {
        if (!need) {
            return '';
        }
        const percent = Math.round((need.value / need.max) * 100);
        const critical = lowIsBad ? need.value <= need.threshold : need.value >= need.threshold;
        return `
            <div class="gauge">
                <span>${label}</span>
                <div class="gauge-track">
                    <div class="gauge-fill${critical ? ' critical' : ''}" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }
}
