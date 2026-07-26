export class Renderer {
    constructor(canvas, terrain, jobBoard, stockpiles, farms, fishingSpots, graves, infirmary, tileSize) {
        this.terrain = terrain;
        this.jobBoard = jobBoard;
        this.stockpiles = stockpiles;
        this.farms = farms;
        this.fishingSpots = fishingSpots;
        this.graves = graves;
        this.infirmary = infirmary;
        this.tileSize = tileSize;
        this.ctx = canvas.getContext('2d');
        canvas.width = terrain.width * tileSize;
        canvas.height = terrain.height * tileSize;
    }

    render(world) {
        const { ctx, terrain, tileSize } = this;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, terrain.width * tileSize, terrain.height * tileSize);

        const stockpileColors = { food: '#3c2a16', materials: '#28321a' };
        for (const { x, y, kind } of this.stockpiles.list()) {
            ctx.fillStyle = stockpileColors[kind] ?? '#16283c';
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
        ctx.fillStyle = '#2e2618';
        for (const { x, y } of this.farms.list()) {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
        ctx.fillStyle = '#144048';
        for (const { x, y } of this.fishingSpots.list()) {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
        ctx.fillStyle = '#2a2230';
        for (const { x, y } of this.graves.list()) {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
        ctx.fillStyle = '#3c1a1a';
        for (const { x, y } of this.infirmary.list()) {
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
        const ghosts = new Map(
            this.jobBoard.jobs
                .filter((job) => job.ghost)
                .map((job) => [job.target.y * terrain.width + job.target.x, job.ghost])
        );
        const urgent = new Set(
            this.jobBoard.jobs
                .filter((job) => (job.priority ?? 0) > 0 && (job.ghost || job.type === 'dig' || job.type === 'chop'))
                .map((job) => job.target.y * terrain.width + job.target.x)
        );

        for (let y = 0; y < terrain.height; y++) {
            for (let x = 0; x < terrain.width; x++) {
                const index = y * terrain.width + x;
                const tile = terrain.tileDefinitions[terrain.get(x, y)];
                const glyph = ghosts.get(index) ?? tile.glyph;
                ctx.fillStyle = urgent.has(index)
                    ? '#e85030'
                    : designated.has(index) || ghosts.has(index)
                      ? '#e8b830'
                      : tile.color;
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

        this.drawWorkerStatus(world);
        this.drawDemolitionMarks();
    }

    drawDemolitionMarks() {
        const { ctx, tileSize } = this;
        ctx.fillStyle = '#e04040';
        for (const job of this.jobBoard.jobs) {
            if (job.type !== 'demolish') {
                continue;
            }
            ctx.fillText('×', job.target.x * tileSize + tileSize / 2, job.target.y * tileSize + tileSize / 2);
        }
    }

    // repères de danger au-dessus des nains, pour un coup d'œil sans sélection
    drawWorkerStatus(world) {
        const { tileSize } = this;
        for (const entityId of world.query('worker', 'position')) {
            const position = world.getComponent(entityId, 'position');
            const x = position.x * tileSize;
            const y = position.y * tileSize;
            this.drawHealthBar(world, entityId, x, y);
            this.drawMoraleDot(world, entityId, x, y);
        }
    }

    drawHealthBar(world, entityId, x, y) {
        const health = world.getComponent(entityId, 'health');
        if (!health || health.value >= health.max) {
            return;
        }
        const { ctx, tileSize } = this;
        const width = tileSize - 4;
        const ratio = Math.max(0, health.value / health.max);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 2, y + 1, width, 3);
        ctx.fillStyle = ratio > 0.5 ? '#5ac05a' : ratio > 0.25 ? '#c0a030' : '#c05030';
        ctx.fillRect(x + 2, y + 1, width * ratio, 3);
    }

    drawMoraleDot(world, entityId, x, y) {
        const morale = world.getComponent(entityId, 'morale');
        const tantruming = world.getComponent(entityId, 'tantruming');
        if (!tantruming && !(morale && morale.value <= morale.low)) {
            return;
        }
        const { ctx } = this;
        ctx.fillStyle = tantruming ? '#e04040' : '#d0a030';
        ctx.beginPath();
        ctx.arc(x + 5, y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
