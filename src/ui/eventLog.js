import { EVENTS } from '../events/events.js';

const MAX_LINES = 50;

export class EventLog {
    constructor(element, eventBus, world) {
        this.element = element;
        eventBus.on(EVENTS.DWARF_HUNGRY, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a faim !`);
        });
        eventBus.on(EVENTS.DWARF_ATE, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a mangé.`);
        });
        eventBus.on(EVENTS.DWARF_TIRED, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} est épuisé.`);
        });
        eventBus.on(EVENTS.DWARF_ASLEEP, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} s'est endormi.`);
        });
        eventBus.on(EVENTS.DWARF_WOKE, ({ entityId, rested, inBed }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(
                rested && !inBed
                    ? `${identity.name} a mal dormi.`
                    : `${identity.name} s'est réveillé.`
            );
        });
        eventBus.on(EVENTS.WALL_DUG, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a creusé un mur.`);
        });
        eventBus.on(EVENTS.WALL_BUILT, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a bâti un mur.`);
        });
        eventBus.on(EVENTS.TREE_CHOPPED, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a abattu un arbre.`);
        });
        eventBus.on(EVENTS.ITEM_STORED, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a rangé un objet.`);
        });
        eventBus.on(EVENTS.CROP_HARVESTED, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a fait une récolte.`);
        });
        eventBus.on(EVENTS.FISH_CAUGHT, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a pêché un poisson.`);
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
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} détale devant un gobelin !`);
        });
        eventBus.on(EVENTS.DWARF_FIGHTS, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} charge un gobelin !`);
        });
        eventBus.on(EVENTS.DWARF_INJURED, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} est blessé !`);
        });
        eventBus.on(EVENTS.DWARF_THIRSTY, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a soif !`);
        });
        eventBus.on(EVENTS.DWARF_DRANK, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} s'est désaltéré.`);
        });
        eventBus.on(EVENTS.DWARF_STARVING, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} meurt de faim !`);
        });
        eventBus.on(EVENTS.DWARF_DEHYDRATED, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} meurt de soif !`);
        });
        eventBus.on(EVENTS.DWARF_DIED, ({ name, cause }) => {
            const messages = {
                starvation: `${name} est mort de faim.`,
                dehydration: `${name} est mort de soif.`,
            };
            this.append(messages[cause] ?? `${name} a succombé à ses blessures.`);
        });
        eventBus.on(EVENTS.GOBLIN_SLAIN, ({ killerId }) => {
            const identity = world.getComponent(killerId, 'identity');
            this.append(`${identity ? identity.name : 'Un nain'} a terrassé un gobelin !`);
        });
        eventBus.on(EVENTS.DWARF_TANTRUM, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} pète les plombs !`);
        });
        eventBus.on(EVENTS.DWARF_CALMED, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} s'est calmé.`);
        });
        eventBus.on(EVENTS.ITEM_SMASHED, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a détruit un objet dans sa rage.`);
        });
        eventBus.on(EVENTS.FURNITURE_BUILT, ({ entityId, label }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} a fabriqué ${label}.`);
        });
    }

    append(message) {
        const line = document.createElement('li');
        line.textContent = message;
        this.element.prepend(line);
        while (this.element.children.length > MAX_LINES) {
            this.element.lastChild.remove();
        }
    }
}
