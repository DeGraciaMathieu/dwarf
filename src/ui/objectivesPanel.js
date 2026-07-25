const BLOCKED_LABELS = {
    'no-workshop': 'bloqué : aucun atelier',
    'no-ingredient': 'bloqué : rien à produire',
};

export class ObjectivesPanel {
    constructor(element, objectives, recipes) {
        this.element = element;
        this.objectives = objectives;
        this.recipes = recipes;
        this.renderedHtml = '';
        // délégation : un seul listener, le DOM peut être régénéré sans perdre les clics
        this.element.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) {
                return;
            }
            const objective = this.objectives[Number(button.dataset.index)];
            if (!objective) {
                return;
            }
            if (button.dataset.action === 'increment') {
                objective.target += 1;
            } else if (button.dataset.action === 'decrement') {
                objective.target = Math.max(0, objective.target - 1);
            }
        });
    }

    render() {
        const html = this.objectives
            .map((objective, index) => this.renderObjective(objective, index))
            .join('');
        if (html === this.renderedHtml) {
            return;
        }
        this.renderedHtml = html;
        this.element.innerHTML = html;
    }

    renderObjective(objective, index) {
        const label = this.recipes[objective.recipe].label;
        const stock = objective.status?.stock ?? 0;
        const blockedLabel = BLOCKED_LABELS[objective.status?.blocked];
        return `
            <div class="objective">
                <span class="objective-label">${label}</span>
                <span class="objective-count">${stock} / ${objective.target}</span>
                <button data-action="decrement" data-index="${index}">−</button>
                <button data-action="increment" data-index="${index}">+</button>
            </div>
            ${blockedLabel ? `<p class="objective-blocked">${blockedLabel}</p>` : ''}
        `;
    }
}
