import { EVENTS } from '../events/events.js';

const MAX_LINES = 50;

const JOB_LABELS = {
    dig: 'creuser',
    chop: 'abattre',
    haul: 'transporter',
    plant: 'semer',
    harvest: 'récolter',
    build: 'bâtir',
    craft: 'atelier',
    fish: 'pêcher',
    equip: "s'équiper",
    bury: 'enterrer',
};

export class EventLog {
    constructor(element, eventBus, world) {
        this.element = element;
        // l'entité peut avoir été détruite avant le flush de fin de tick
        // (mort dans le même tick que l'événement) : repli sur un nom générique
        const dwarfName = (entityId) => {
            const identity = world.getComponent(entityId, 'identity');
            return identity ? identity.name : 'Un nain';
        };
        eventBus.on(EVENTS.DWARF_HUNGRY, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a faim !`);
        });
        eventBus.on(EVENTS.DWARF_ATE, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a mangé.`);
        });
        eventBus.on(EVENTS.DWARF_TIRED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} est épuisé.`);
        });
        eventBus.on(EVENTS.DWARF_ASLEEP, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} s'est endormi.`);
        });
        eventBus.on(EVENTS.DWARF_WOKE, ({ entityId, rested, inBed }) => {
            this.append(
                rested && !inBed
                    ? `${dwarfName(entityId)} a mal dormi.`
                    : `${dwarfName(entityId)} s'est réveillé.`
            );
        });
        eventBus.on(EVENTS.WALL_DUG, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a creusé un mur.`);
        });
        eventBus.on(EVENTS.WALL_BUILT, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a bâti un mur.`);
        });
        eventBus.on(EVENTS.TREE_CHOPPED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a abattu un arbre.`);
        });
        eventBus.on(EVENTS.ITEM_STORED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a rangé un objet.`);
        });
        eventBus.on(EVENTS.CROP_HARVESTED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a fait une récolte.`);
        });
        eventBus.on(EVENTS.FISH_CAUGHT, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a pêché un poisson.`);
        });
        eventBus.on(EVENTS.GOBLIN_ARRIVED, ({ count }) => {
            this.append(
                count > 1
                    ? `Une bande de ${count} gobelins déferle sur la région !`
                    : 'Un gobelin est apparu aux abords de la carte !'
            );
        });
        eventBus.on(EVENTS.MIGRANT_ARRIVED, ({ name }) => {
            this.append(`Un migrant est arrivé : ${name} !`);
        });
        eventBus.on(EVENTS.DWARF_FLEES, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} détale devant un gobelin !`);
        });
        eventBus.on(EVENTS.DWARF_FIGHTS, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} charge un gobelin !`);
        });
        eventBus.on(EVENTS.DWARF_INJURED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} est blessé !`);
        });
        eventBus.on(EVENTS.DWARF_THIRSTY, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a soif !`);
        });
        eventBus.on(EVENTS.DWARF_DRANK, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} s'est désaltéré.`);
        });
        eventBus.on(EVENTS.DWARF_DRANK_BEER, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a vidé une chope de bière !`);
        });
        eventBus.on(EVENTS.DWARF_STARVING, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} meurt de faim !`);
        });
        eventBus.on(EVENTS.DWARF_DEHYDRATED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} meurt de soif !`);
        });
        eventBus.on(EVENTS.DWARF_DIED, ({ name, cause }) => {
            const messages = {
                starvation: `${name} est mort de faim.`,
                dehydration: `${name} est mort de soif.`,
                brawl: `${name} est mort dans une rixe.`,
            };
            this.append(messages[cause] ?? `${name} a succombé à ses blessures.`);
        });
        eventBus.on(EVENTS.GOBLIN_SLAIN, ({ killerId }) => {
            this.append(`${dwarfName(killerId)} a terrassé un gobelin !`);
        });
        eventBus.on(EVENTS.DWARF_TANTRUM, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} pète les plombs !`);
        });
        eventBus.on(EVENTS.DWARF_CALMED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} s'est calmé.`);
        });
        eventBus.on(EVENTS.ITEM_SMASHED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a détruit un objet dans sa rage.`);
        });
        eventBus.on(EVENTS.FURNITURE_BUILT, ({ entityId, label }) => {
            this.append(`${dwarfName(entityId)} a fabriqué ${label}.`);
        });
        eventBus.on(EVENTS.ITEM_CRAFTED, ({ entityId, label }) => {
            this.append(`${dwarfName(entityId)} a fabriqué ${label}.`);
        });
        eventBus.on(EVENTS.CORPSE_BURIED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a enterré un mort.`);
        });
        eventBus.on(EVENTS.CORPSE_ROTTED, () => {
            this.append('Un cadavre se putréfie à l\'air libre…');
        });
        eventBus.on(EVENTS.DWARF_EQUIPPED, ({ entityId, slot }) => {
            const gear = slot === 'weapon' ? 's\'arme' : 'enfile une armure';
            this.append(`${dwarfName(entityId)} ${gear}.`);
        });
        eventBus.on(EVENTS.DWARF_ISOLATED_FROM_WATER, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} n'a plus accès à l'eau !`, true);
        });
        eventBus.on(EVENTS.DWARF_CANNOT_REACH_FOOD, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} ne peut atteindre aucune nourriture !`, true);
        });
        eventBus.on(EVENTS.DEMOLISHED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a démoli quelque chose.`);
        });
        eventBus.on(EVENTS.DWARF_DRUNK, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} est ivre !`, true);
        });
        eventBus.on(EVENTS.DWARF_BRAWLS, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} cherche la bagarre !`, true);
        });
        eventBus.on(EVENTS.DWARF_SOBERED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a dessoûlé.`);
        });
        eventBus.on(EVENTS.JOB_UNREACHABLE, ({ job }) => {
            const label = JOB_LABELS[job.type] ?? job.type;
            this.append(`Chantier inaccessible : ${label} (${job.target.x}, ${job.target.y}).`, true);
        });
    }

    append(message, alert = false) {
        const line = document.createElement('li');
        line.textContent = message;
        if (alert) {
            line.className = 'alert';
        }
        this.element.prepend(line);
        while (this.element.children.length > MAX_LINES) {
            this.element.lastChild.remove();
        }
    }
}
