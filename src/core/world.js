export class World {
    constructor() {
        this.nextEntityId = 1;
        this.components = new Map();
        this.systems = [];
    }

    createEntity() {
        return this.nextEntityId++;
    }

    addComponent(entityId, name, data) {
        if (!this.components.has(name)) {
            this.components.set(name, new Map());
        }
        this.components.get(name).set(entityId, data);
    }

    getComponent(entityId, name) {
        return this.components.get(name)?.get(entityId);
    }

    removeComponent(entityId, name) {
        this.components.get(name)?.delete(entityId);
    }

    destroyEntity(entityId) {
        for (const store of this.components.values()) {
            store.delete(entityId);
        }
    }

    query(...names) {
        const [first, ...rest] = names;
        const base = this.components.get(first);
        if (!base) {
            return [];
        }
        return [...base.keys()].filter((entityId) =>
            rest.every((name) => this.components.get(name)?.has(entityId))
        );
    }

    registerSystem(system) {
        this.systems.push(system);
    }

    tick(eventBus) {
        for (const system of this.systems) {
            system.update(this, eventBus);
        }
        eventBus.flush();
    }
}
