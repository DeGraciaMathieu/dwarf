export function spawnFromDefinition(world, definition, position) {
    const entityId = world.createEntity();
    world.addComponent(entityId, 'position', { x: position.x, y: position.y });
    world.addComponent(entityId, 'renderable', {
        glyph: definition.glyph,
        color: definition.color,
    });
    for (const [componentName, data] of Object.entries(definition.components)) {
        world.addComponent(entityId, componentName, structuredClone(data));
    }
    return entityId;
}
