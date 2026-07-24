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
        eventBus.on(EVENTS.DWARF_WOKE, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} s'est réveillé.`);
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
        eventBus.on(EVENTS.GOBLIN_ARRIVED, () => {
            this.append('Un gobelin est apparu aux abords de la carte !');
        });
        eventBus.on(EVENTS.DWARF_FLEES, ({ entityId }) => {
            const identity = world.getComponent(entityId, 'identity');
            this.append(`${identity.name} détale devant un gobelin !`);
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
