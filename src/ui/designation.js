export class DesignationControl {
    constructor({
        canvas,
        toolbar,
        world,
        terrain,
        jobBoard,
        stockpiles,
        farms,
        fishingSpots,
        graves,
        tileSize,
        recipes,
        onDwarfClick,
    }) {
        this.canvas = canvas;
        this.world = world;
        this.terrain = terrain;
        this.jobBoard = jobBoard;
        this.stockpiles = stockpiles;
        this.farms = farms;
        this.fishingSpots = fishingSpots;
        this.graves = graves;
        this.tileSize = tileSize;
        this.recipes = recipes;
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
            if ((tile === 'wall' || tile === 'ore') && !this.jobBoard.hasJobAt(x, y, 'dig')) {
                this.jobBoard.post({ type: 'dig', target: { x, y } });
            } else if (tile === 'tree' && !this.jobBoard.hasJobAt(x, y, 'chop')) {
                this.jobBoard.post({ type: 'chop', target: { x, y } });
            }
            return;
        }
        if (this.mode === 'fishing') {
            if (tile === 'water' && !this.fishingSpots.has(x, y) && this.hasAdjacentBank(x, y)) {
                this.fishingSpots.add(x, y);
            }
            return;
        }
        if (this.mode.startsWith('craft:')) {
            const recipeName = this.mode.slice('craft:'.length);
            const recipe = this.recipes[recipeName];
            if (!recipe || tile !== (recipe.site ?? 'floor')) {
                return;
            }
            if (
                tile === 'floor' &&
                (this.stockpiles.has(x, y) ||
                    this.farms.has(x, y) ||
                    this.graves.has(x, y) ||
                    this.workshopAt(x, y))
            ) {
                return;
            }
            if (!this.jobBoard.hasJobAt(x, y, 'craft')) {
                this.jobBoard.post({
                    type: 'craft',
                    recipe: recipeName,
                    ghost: recipe.ghost,
                    target: { x, y },
                });
            }
            return;
        }
        if (
            tile !== 'floor' ||
            this.stockpiles.has(x, y) ||
            this.farms.has(x, y) ||
            this.graves.has(x, y)
        ) {
            return;
        }
        if (this.mode === 'build') {
            if (!this.jobBoard.hasJobAt(x, y, 'build')) {
                this.jobBoard.post({ type: 'build', ghost: '#', target: { x, y } });
            }
        } else if (this.mode === 'stockpile' || this.mode.startsWith('stockpile:')) {
            this.stockpiles.add(x, y, this.mode.split(':')[1]);
        } else if (this.mode === 'farm') {
            this.farms.add(x, y);
        } else if (this.mode === 'grave') {
            this.graves.add(x, y);
        }
    }

    hasAdjacentBank(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if ((dx !== 0 || dy !== 0) && this.terrain.isWalkable(x + dx, y + dy)) {
                    return true;
                }
            }
        }
        return false;
    }

    workshopAt(x, y) {
        return this.world.query('workshop', 'position').some((workshopId) => {
            const position = this.world.getComponent(workshopId, 'position');
            return position.x === x && position.y === y;
        });
    }
}
