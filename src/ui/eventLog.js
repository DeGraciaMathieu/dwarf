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
    // importantElement : journal des faits marquants (dangers, jalons) ;
    // routineElement : journal des activités courantes
    constructor(importantElement, routineElement, eventBus, world) {
        this.importantElement = importantElement;
        this.routineElement = routineElement;
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
                    : 'Un gobelin est apparu aux abords de la carte !',
                true,
                true
            );
        });
        eventBus.on(EVENTS.MIGRANT_ARRIVED, ({ name }) => {
            this.append(`Un migrant est arrivé : ${name} !`, false, true);
        });
        eventBus.on(EVENTS.DWARF_FLEES, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} détale devant un gobelin !`, false, true);
        });
        eventBus.on(EVENTS.DWARF_FIGHTS, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} charge un gobelin !`, false, true);
        });
        eventBus.on(EVENTS.DWARF_INJURED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} est blessé !`, false, true);
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
            this.append(`${dwarfName(entityId)} meurt de faim !`, true, true);
        });
        eventBus.on(EVENTS.DWARF_DEHYDRATED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} meurt de soif !`, true, true);
        });
        eventBus.on(EVENTS.DWARF_DIED, ({ name, cause }) => {
            const messages = {
                starvation: `${name} est mort de faim.`,
                dehydration: `${name} est mort de soif.`,
                brawl: `${name} est mort dans une rixe.`,
                bleeding: `${name} s'est vidé de son sang.`,
            };
            this.append(messages[cause] ?? `${name} a succombé à ses blessures.`, true, true);
        });
        eventBus.on(EVENTS.GOBLIN_SLAIN, ({ killerId }) => {
            // le tueur n'est pas toujours un nain (un prédateur peut décimer les hostiles)
            const killer = world.getComponent(killerId, 'identity');
            this.append(
                killer ? `${killer.name} a terrassé un gobelin !` : 'Un gobelin a péri !',
                false,
                true
            );
        });
        eventBus.on(EVENTS.DWARF_TANTRUM, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} pète les plombs !`, true, true);
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
            this.append(`${dwarfName(entityId)} n'a plus accès à l'eau !`, true, true);
        });
        eventBus.on(EVENTS.DWARF_CANNOT_REACH_FOOD, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} ne peut atteindre aucune nourriture !`, true, true);
        });
        eventBus.on(EVENTS.DEMOLISHED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a démoli quelque chose.`);
        });
        eventBus.on(EVENTS.DWARF_DRUNK, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} est ivre !`, true);
        });
        eventBus.on(EVENTS.DWARF_BRAWLS, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} cherche la bagarre !`, true, true);
        });
        eventBus.on(EVENTS.DWARF_SOBERED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} a dessoûlé.`);
        });
        eventBus.on(EVENTS.DWARF_WOUNDED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} s'effondre, grièvement blessé !`, true, true);
        });
        eventBus.on(EVENTS.DWARF_HEALED, ({ entityId }) => {
            this.append(`${dwarfName(entityId)} est soigné et se remet sur pied.`);
        });
        eventBus.on(EVENTS.DWARF_BEFRIENDED, ({ entityId, otherId }) => {
            this.append(`${dwarfName(entityId)} et ${dwarfName(otherId)} sont devenus amis.`, false, true);
        });
        eventBus.on(EVENTS.DWARF_FELL_OUT, ({ entityId, otherId }) => {
            this.append(`${dwarfName(entityId)} et ${dwarfName(otherId)} sont désormais rivaux.`, true, true);
        });
        eventBus.on(EVENTS.FOOD_SPOILED, () => {
            this.append('Un plat s\'est gâté faute de garde-manger.');
        });
        eventBus.on(EVENTS.SEASON_CHANGED, ({ season, isWinter }) => {
            this.append(
                isWinter
                    ? "L'hiver s'installe : les cultures gèlent et les berges se prennent en glace."
                    : `Le climat tourne : voici ${season}.`,
                isWinter,
                true
            );
        });
        eventBus.on(EVENTS.JOB_UNREACHABLE, ({ job }) => {
            const label = JOB_LABELS[job.type] ?? job.type;
            this.append(`Chantier inaccessible : ${label} (${job.target.x}, ${job.target.y}).`, true, true);
        });
        eventBus.on(EVENTS.EVENT_PLAGUE_STRUCK, ({ count }) => {
            this.append(`Une épidémie frappe la colonie : ${count} nain(s) affaibli(s) !`, true, true);
        });
        eventBus.on(EVENTS.EVENT_BEAST_APPEARED, ({ creature, label }) => {
            this.append(
                creature === 'dragon'
                    ? `UN DRAGON surgit et fond sur tout ce qui vit !`
                    : `${this.capitalize(label ?? 'une bête sauvage')} rôde aux abords !`,
                true,
                true
            );
        });
        eventBus.on(EVENTS.EVENT_HARVEST_BOON, () => {
            this.append('Une récolte miraculeuse : toutes les cultures mûrissent d\'un coup !', false, true);
        });
        eventBus.on(EVENTS.EVENT_HARVEST_BLIGHT, () => {
            this.append('Une nuée ravage les champs : les cultures sont perdues !', true, true);
        });
        eventBus.on(EVENTS.EVENT_WANDERER_ARRIVED, ({ name }) => {
            this.append(`Un vagabond rejoint la colonie : ${name} !`, false, true);
        });
        eventBus.on(EVENTS.EVENT_CAVE_IN, ({ x, y }) => {
            this.append(`Un éboulement bloque un passage en (${x}, ${y}) !`, true, true);
        });
    }

    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    // important : range la ligne dans le journal des faits marquants plutôt que le courant
    append(message, alert = false, important = false) {
        const line = document.createElement('li');
        line.textContent = message;
        if (alert) {
            line.className = 'alert';
        }
        const target = important ? this.importantElement : this.routineElement;
        target.prepend(line);
        while (target.children.length > MAX_LINES) {
            target.lastChild.remove();
        }
    }
}
