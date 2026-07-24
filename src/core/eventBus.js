export class EventBus {
    constructor() {
        this.handlers = new Map();
        this.queue = [];
    }

    on(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, []);
        }
        this.handlers.get(type).push(handler);
    }

    emit(type, payload) {
        this.queue.push({ type, payload });
    }

    flush() {
        const events = this.queue;
        this.queue = [];
        for (const event of events) {
            for (const handler of this.handlers.get(event.type) ?? []) {
                handler(event.payload);
            }
        }
    }
}
