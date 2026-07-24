const ACTIVITY_LABELS = {
    fight: 'Combat !',
    flee: 'Fuit !',
    eat: 'Va manger',
    sleep: 'Dort',
    work: 'Travaille',
    wander: 'Erre',
};

const JOB_LABELS = {
    dig: 'creuser un mur',
    chop: 'abattre un arbre',
    haul: 'transporter un objet',
    plant: 'semer',
    harvest: 'récolter',
    build: 'bâtir un mur',
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
        let status = ACTIVITY_LABELS[activity?.type] ?? '—';
        if (activity?.type === 'work') {
            status = currentJob
                ? `Travaille : ${JOB_LABELS[currentJob.job.type] ?? currentJob.job.type}`
                : 'Cherche du travail';
        }
        const health = this.world.getComponent(this.selectedId, 'health');
        this.element.innerHTML = `
            <h3>${identity.name}</h3>
            <p class="status">${status}</p>
            ${this.gauge('Santé', health && { ...health, threshold: health.max * 0.35 }, true)}
            ${this.gauge('Faim', this.world.getComponent(this.selectedId, 'hunger'))}
            ${this.gauge('Fatigue', this.world.getComponent(this.selectedId, 'fatigue'))}
        `;
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
