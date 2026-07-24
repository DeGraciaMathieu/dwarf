export class MovementSystem {
    constructor(terrain) {
        this.terrain = terrain;
    }

    update(world) {
        for (const entityId of world.query('position', 'wander')) {
            const activity = world.getComponent(entityId, 'activity');
            if (activity && activity.type !== 'wander') {
                continue;
            }
            const position = world.getComponent(entityId, 'position');
            const dx = Math.floor(Math.random() * 3) - 1;
            const dy = Math.floor(Math.random() * 3) - 1;
            if (this.terrain.isWalkable(position.x + dx, position.y + dy)) {
                position.x += dx;
                position.y += dy;
            }
        }
    }
}
