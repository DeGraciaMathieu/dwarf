// Surcouche de préparation : collecte le profil et la difficulté choisis, puis
// se retire. Ne construit rien elle-même — elle retourne une configuration que
// main.js utilise pour bâtir le monde (règle « ui/ n'exprime que des intentions »).
export class EmbarkScreen {
    constructor(element, data) {
        this.element = element;
        this.data = data;
    }

    choose() {
        this.render();
        this.element.classList.add('visible');
        return new Promise((resolve) => {
            this.element.querySelector('#embark-start').addEventListener('click', () => {
                const profileId = this.selected('profile');
                const difficultyId = this.selected('difficulty');
                const config = {
                    profile: this.data.profiles.find((profile) => profile.id === profileId),
                    difficulty: this.data.difficulties.find((difficulty) => difficulty.id === difficultyId),
                };
                this.element.classList.remove('visible');
                this.element.innerHTML = '';
                resolve(config);
            });
        });
    }

    selected(group) {
        return this.element.querySelector(`input[name="${group}"]:checked`).value;
    }

    render() {
        this.element.innerHTML = `
            <div class="embark-panel">
                <h1>Fonder une colonie</h1>
                <section>
                    <h2>Profil de départ</h2>
                    ${this.data.profiles.map((profile) => this.option('profile', profile)).join('')}
                </section>
                <section>
                    <h2>Difficulté</h2>
                    ${this.data.difficulties.map((difficulty) => this.option('difficulty', difficulty)).join('')}
                </section>
                <button id="embark-start">Fonder la colonie</button>
            </div>
        `;
    }

    option(group, choice) {
        const checked = choice.default ? ' checked' : '';
        return `
            <label class="embark-option">
                <input type="radio" name="${group}" value="${choice.id}"${checked}>
                <span class="embark-option-label">${choice.label}</span>
                <span class="embark-option-desc">${choice.description}</span>
            </label>
        `;
    }
}
