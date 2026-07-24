export class DesignationControl {
    constructor(canvas, toolbar, terrain, jobBoard, stockpiles, farms, tileSize, onDwarfClick) {
        this.canvas = canvas;
        this.terrain = terrain;
        this.jobBoard = jobBoard;
        this.stockpiles = stockpiles;
        this.farms = farms;
        this.tileSize = tileSize;
        this.onDwarfClick = onDwarfClick;
        this.mode = 'designate';
        this.dragging = false;

        canvas.addEventListener('mousedown', (event) => {
            this.dragging = true;
            const tile = this.tileAt(event);
            if (!tile) {
                return;
            }
            if (this.onDwarfClick?.(tile.x, tile.y)) {
                return;
            }
            this.apply(tile);
        });
        canvas.addEventListener('mousemove', (event) => {
            if (!this.dragging) {
                return;
            }
            const tile = this.tileAt(event);
            if (tile) {
                this.apply(tile);
            }
        });
        window.addEventListener('mouseup', () => {
            this.dragging = false;
        });

        toolbar.querySelectorAll('button[data-tool]').forEach((button) => {
            button.addEventListener('click', () => {
                toolbar.querySelector('button[data-tool].active')?.classList.remove('active');
                button.classList.add('active');
                this.mode = button.dataset.tool;
            });
        });
    }

    tileAt(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / this.tileSize);
        const y = Math.floor((event.clientY - rect.top) / this.tileSize);
        if (x < 0 || x >= this.terrain.width || y < 0 || y >= this.terrain.height) {
            return null;
        }
        return { x, y };
    }

    apply({ x, y }) {
        const tile = this.terrain.get(x, y);
        if (this.mode === 'designate') {
            if (tile === 'wall' && !this.jobBoard.hasJobAt(x, y, 'dig')) {
                this.jobBoard.post({ type: 'dig', target: { x, y } });
            } else if (tile === 'tree' && !this.jobBoard.hasJobAt(x, y, 'chop')) {
                this.jobBoard.post({ type: 'chop', target: { x, y } });
            }
            return;
        }
        if (tile !== 'floor' || this.stockpiles.has(x, y) || this.farms.has(x, y)) {
            return;
        }
        if (this.mode === 'build') {
            if (!this.jobBoard.hasJobAt(x, y, 'build')) {
                this.jobBoard.post({ type: 'build', target: { x, y } });
            }
        } else if (this.mode === 'stockpile') {
            this.stockpiles.add(x, y);
        } else if (this.mode === 'farm') {
            this.farms.add(x, y);
        }
    }
}
