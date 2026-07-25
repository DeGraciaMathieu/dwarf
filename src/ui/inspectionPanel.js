const ACTIVITY_LABELS = {
    fight: 'Combat !',
    flee: 'Fuit !',
    tantrum: 'Rage !',
    eat: 'Va manger',
    drink: 'Va boire',
    sleep: 'Dort',
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
            ${this.gauge('Santé', health && { ...health, threshold: health.max * 0.35 }, true)}
            ${this.gauge('Moral', morale && { ...morale, threshold: morale.low }, true)}
            ${this.gauge('Faim', this.world.getComponent(this.selectedId, 'hunger'))}
            ${this.gauge('Soif', this.world.getComponent(this.selectedId, 'thirst'))}
            ${this.gauge('Fatigue', this.world.getComponent(this.selectedId, 'fatigue'))}
        `;
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
