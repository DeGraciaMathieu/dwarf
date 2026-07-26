import { isWinter } from './seasonSystem.js';

// proportion des cases d'eau qui gèlent en hiver — le reste demeure de l'eau libre
const FREEZE_RATIO = 0.6;

// Gel hivernal partiel du terrain : à l'entrée de l'hiver, une partie des cases `water`
// devient `ice` (non buvable, non pêchable, visuellement distincte) ; les autres restent
// de l'eau libre. Au dégel, toute la glace redevient de l'eau. L'état vit dans le terrain
// lui-même (sérialisé) : la présence de glace marque « déjà gelé cet hiver », si bien que
// le gel ne se rejoue qu'une fois par hiver. RNG injectable pour des tests déterministes.
export class FreezeSystem {
    constructor(terrain, random = Math.random) {
        this.terrain = terrain;
        this.random = random;
    }

    update(world) {
        if (isWinter(world)) {
            this.freeze();
        } else {
            this.thaw();
        }
    }

    freeze() {
        if (this.hasIce()) {
            return; // le gel a déjà eu lieu cet hiver
        }
        for (let y = 0; y < this.terrain.height; y++) {
            for (let x = 0; x < this.terrain.width; x++) {
                if (this.terrain.get(x, y) === 'water' && this.random() < FREEZE_RATIO) {
                    this.terrain.set(x, y, 'ice');
                }
            }
        }
    }

    thaw() {
        for (let y = 0; y < this.terrain.height; y++) {
            for (let x = 0; x < this.terrain.width; x++) {
                if (this.terrain.get(x, y) === 'ice') {
                    this.terrain.set(x, y, 'water');
                }
            }
        }
    }

    hasIce() {
        for (let y = 0; y < this.terrain.height; y++) {
            for (let x = 0; x < this.terrain.width; x++) {
                if (this.terrain.get(x, y) === 'ice') {
                    return true;
                }
            }
        }
        return false;
    }
}
