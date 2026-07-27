import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/world.js';
import { EventBus } from '../src/core/eventBus.js';
import { findPath } from '../src/core/pathfinding.js';
import { generateTerrain, largestWalkableRegion } from '../src/core/terrain.js';
import { data, makeTerrain } from './helpers.js';

test('ECS : cycle de vie des entités et composants', () => {
    const world = new World();
    const a = world.createEntity();
    const b = world.createEntity();
    world.addComponent(a, 'position', { x: 1, y: 2 });
    world.addComponent(a, 'hunger', { value: 5 });
    world.addComponent(b, 'position', { x: 3, y: 4 });

    assert.equal(world.getComponent(a, 'position').x, 1);
    assert.deepEqual(world.query('position', 'hunger'), [a]);
    world.removeComponent(a, 'hunger');
    assert.deepEqual(world.query('position', 'hunger'), []);
    world.destroyEntity(b);
    assert.equal(world.getComponent(b, 'position'), undefined);
});

test('EventBus : les événements sont mis en file puis livrés au flush', () => {
    const bus = new EventBus();
    const seen = [];
    bus.on('a', (payload) => seen.push(payload));
    bus.emit('a', 1);
    bus.emit('a', 2);
    assert.equal(seen.length, 0);
    bus.flush();
    assert.deepEqual(seen, [1, 2]);
});

test('A* : chemin direct de longueur Chebyshev sur terrain ouvert', () => {
    const terrain = makeTerrain(['..........', '..........', '..........']);
    const path = findPath(terrain, { x: 0, y: 0 }, { x: 9, y: 2 });
    assert.equal(path.length, 9);
});

test('A* : contourne un mur en U', () => {
    const terrain = makeTerrain([
        '..........',
        '..######..',
        '..#....#..',
        '..#.##.#..',
        '..#.#..#..',
        '..###..#..',
        '..........',
    ]);
    const path = findPath(terrain, { x: 4, y: 2 }, { x: 9, y: 0 });
    assert.ok(path !== null);
    assert.ok(path.every((step) => terrain.isWalkable(step.x, step.y)));
});

test('A* : retourne null pour une poche isolée', () => {
    const terrain = makeTerrain(['.....#...', '.....#.#.', '.....###.']);
    assert.equal(findPath(terrain, { x: 0, y: 0 }, { x: 6, y: 1 }), null);
});

test('génération : massif montagneux creusable et forêts en bosquets', () => {
    let connectivity = 0;
    for (let i = 0; i < 5; i++) {
        const terrain = generateTerrain(40, 25, data.tiles);
        const counts = { floor: 0, wall: 0, tree: 0, water: 0 };
        for (let y = 0; y < 25; y++) {
            for (let x = 0; x < 40; x++) {
                counts[terrain.get(x, y)]++;
            }
        }
        assert.ok(counts.wall > 0 && counts.tree > 0 && counts.floor > 0);
        assert.ok(counts.water >= 20, `rivière et lacs attendus, ${counts.water} cases d'eau`);
        for (let x = 0; x < 40; x++) {
            assert.equal(terrain.get(x, 0), 'wall');
            assert.equal(terrain.get(x, 24), 'wall');
        }
        const treeShare = counts.tree / (counts.tree + counts.floor);
        assert.ok(treeShare > 0.04 && treeShare < 0.3, `part d'arbres: ${treeShare}`);

        const region = largestWalkableRegion(terrain);
        const regionSet = new Set(region.map((p) => p.y * 40 + p.x));
        // connectivité de la SURFACE : on exclut les grottes (poches de sol scellées
        // côté montagne, hors grande région) — elles sont volontairement déconnectées.
        let caveFloors = 0;
        for (let y = 0; y < 25; y++) {
            for (let x = 20; x < 40; x++) {
                if (terrain.get(x, y) === 'floor' && !regionSet.has(y * 40 + x)) {
                    caveFloors++;
                }
            }
        }
        connectivity += region.length / (counts.floor - caveFloors);

        let diggableFace = false;
        for (let y = 1; y < 24 && !diggableFace; y++) {
            for (let x = 20; x < 39 && !diggableFace; x++) {
                if (terrain.get(x, y) !== 'wall') {
                    continue;
                }
                for (let dy = -1; dy <= 1 && !diggableFace; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (regionSet.has((y + dy) * 40 + (x + dx))) {
                            diggableFace = true;
                            break;
                        }
                    }
                }
            }
        }
        assert.ok(diggableFace, 'le front de montagne doit être atteignable');
    }
    assert.ok(connectivity / 5 > 0.85, `connectivité moyenne: ${connectivity / 5}`);
});

test('génération : des grottes scellées à découvrir dans la montagne', () => {
    let withCaves = 0;
    for (let i = 0; i < 5; i++) {
        const terrain = generateTerrain(40, 25, data.tiles);
        const region = new Set(largestWalkableRegion(terrain).map((p) => p.y * 40 + p.x));
        // du sol praticable, dans la moitié montagne, hors de la grande région = une
        // cavité scellée par la roche (donc à rejoindre au pic, pas accessible à pied)
        let sealedMountainFloor = 0;
        for (let y = 1; y < 24; y++) {
            for (let x = 20; x < 39; x++) {
                if (terrain.get(x, y) === 'floor' && !region.has(y * 40 + x)) {
                    sealedMountainFloor++;
                }
            }
        }
        if (sealedMountainFloor > 0) {
            withCaves++;
        }
    }
    assert.ok(withCaves >= 4, `grottes scellées attendues sur la plupart des cartes, ${withCaves}/5`);
});

test('eau : infranchissable pour tous, sauf par le gué', () => {
    const river = makeTerrain(['....~~....', '....~~....', '..........', '....~~....']);
    assert.equal(river.isWalkable(4, 0), false);
    assert.equal(river.isWalkable(4, 0, { hostile: true }), false);
    const path = findPath(river, { x: 1, y: 0 }, { x: 8, y: 0 });
    assert.ok(path !== null, 'le gué permet la traversée');
    assert.ok(path.some((step) => step.y === 2), 'le chemin passe par la ligne du gué');

    const sealed = makeTerrain(['....~~....', '....~~....', '....~~....']);
    assert.equal(findPath(sealed, { x: 1, y: 1 }, { x: 8, y: 1 }), null, 'sans gué, pas de passage');
});

test('largestWalkableRegion : ignore les poches isolées', () => {
    const terrain = makeTerrain(['...#.', '...#.', '####.']);
    const region = largestWalkableRegion(terrain);
    assert.equal(region.length, 6);
});
