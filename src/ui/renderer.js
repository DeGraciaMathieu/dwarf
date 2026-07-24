export class Renderer {
    constructor(canvas, terrain, jobBoard, stockpiles, farms, tileSize) {
        this.terrain = terrain;
        this.jobBoard = jobBoard;
        this.stockpiles = stockpiles;
        this.farms = farms;
        this.tileSize = tileSize;
        this.ctx = canvas.getContext('2d');
        canvas.width = terrain.width * tileSize;
        canvas.height = terrain.height * tileSize;
    }

    render(world) {
        const { ctx, terrain, tileSize } = this;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, terrain.width * tileSize, terrain.height * tileSize);

        ctx.fillStyle = '#16283c';
        for (const { x, y } of this.stockpiles.list()) {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
        ctx.fillStyle = '#2e2618';
        for (const { x, y } of this.farms.list()) {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }

        ctx.font = `${tileSize - 4}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const designated = new Set(
            this.jobBoard.jobs
                .filter((job) => job.type === 'dig' || job.type === 'chop')
                .map((job) => job.target.y * terrain.width + job.target.x)
        );
        const buildSites = new Set(
            this.jobBoard.jobs
                .filter((job) => job.type === 'build')
                .map((job) => job.target.y * terrain.width + job.target.x)
        );

        for (let y = 0; y < terrain.height; y++) {
            for (let x = 0; x < terrain.width; x++) {
                const index = y * terrain.width + x;
                const tile = terrain.tileDefinitions[terrain.get(x, y)];
                const glyph = buildSites.has(index) ? '#' : tile.glyph;
                ctx.fillStyle =
                    designated.has(index) || buildSites.has(index) ? '#e8b830' : tile.color;
                ctx.fillText(glyph, x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
            }
        }

        for (const entityId of world.query('position', 'renderable')) {
            const position = world.getComponent(entityId, 'position');
            const renderable = world.getComponent(entityId, 'renderable');
            ctx.fillStyle = renderable.color;
            ctx.fillText(
                renderable.glyph,
                position.x * tileSize + tileSize / 2,
                position.y * tileSize + tileSize / 2
            );
        }

        ctx.font = `${Math.floor(tileSize / 2)}px monospace`;
        ctx.fillStyle = '#8ab4e8';
        for (const entityId of world.query('sleeping', 'position')) {
            const position = world.getComponent(entityId, 'position');
            ctx.fillText('z', (position.x + 1) * tileSize - 4, position.y * tileSize + 5);
        }
        ctx.font = `${tileSize - 4}px monospace`;
    }
}
