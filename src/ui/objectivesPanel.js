const WORKSHOP_LABELS = {
    carpentry: 'menuiserie manquante',
    brewery: 'brasserie manquante',
    masonry: 'atelier de taille manquant',
    forge: 'forge manquante',
};

const INGREDIENT_LABELS = {
    ore: 'minerai',
    stone: 'pierre',
    brewable: 'ingrédient brassable',
};

const WORKSHOP_REQUIRED = {
    carpentry: 'une menuiserie requise',
    masonry: 'un atelier de taille requis',
    brewery: 'une brasserie requise',
    forge: 'une forge requise',
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
        const status = objective.status;
        const stock = status?.stock ?? 0;
        const blocked = this.blockerNote(status);
        const note = blocked ?? this.productionNote(status);
        const noteClass = blocked ? 'objective-blocked' : 'objective-note';
        return `
            <div class="objective">
                <span class="objective-label">${label}</span>
                <span class="objective-count">${stock} / ${objective.target}</span>
                <button data-action="decrement" data-index="${index}">−</button>
                <button data-action="increment" data-index="${index}">+</button>
            </div>
            ${note ? `<p class="${noteClass}">${note}</p>` : ''}
        `;
    }

    blockerNote(status) {
        if (status?.blocker === 'locked') {
            const workshop = status.detail.workshop;
            return `Verrouillé : ${WORKSHOP_REQUIRED[workshop] ?? `${workshop} requis`}`;
        }
        if (status?.blocker === 'no-workshop') {
            const workshop = status.detail.workshop;
            return `Bloqué : ${WORKSHOP_LABELS[workshop] ?? `${workshop} manquant`}`;
        }
        if (status?.blocker === 'no-ingredient') {
            const { ingredient, free } = status.detail;
            const name = INGREDIENT_LABELS[ingredient] ?? ingredient;
            return `Bloqué : ${name} insuffisant (${free} disponible${free > 1 ? 's' : ''})`;
        }
        return null;
    }

    productionNote(status) {
        return status?.pending > 0 ? `En production (${status.pending} en file)` : null;
    }
}
