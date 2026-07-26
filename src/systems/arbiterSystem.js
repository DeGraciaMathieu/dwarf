const FLEE_SCORE = 200;
const FLEE_RANGE = 6;
const PROVOKED_SCORE = 190;
const DRUNK_BRAWL_SCORE = 90;
const BRAWL_RANGE = 5;
const TANTRUM_SCORE = 150;
const TANTRUM_EXIT_MARGIN = 15;
const HEAL_SCORE = 62;
const RESCUE_SCORE = 60;
const SOCIALIZE_SCORE = 50;
const WORK_SCORE = 10;
const WANDER_SCORE = 1;

export class ArbiterSystem {
    constructor(jobBoard, infirmary) {
        this.jobBoard = jobBoard;
        this.infirmary = infirmary;
    }

    update(world) {
        const foodAvailable = world.query('food', 'position').length > 0;
        const hostilePositions = world
            .query('hostile', 'position')
            .map((hostileId) => world.getComponent(hostileId, 'position'));
        for (const entityId of world.query('worker', 'position')) {
            const best = this.pickActivity(world, entityId, foodAvailable, hostilePositions);
            const activity = world.getComponent(entityId, 'activity');
            if (activity) {
                activity.type = best;
            } else {
                world.addComponent(entityId, 'activity', { type: best });
            }
        }
    }

    pickActivity(world, entityId, foodAvailable, hostilePositions) {
        // un blessé est incapacité : il reste au sol, aucune activité active
        if (world.getComponent(entityId, 'injury')) {
            return 'incapacitated';
        }
        const scores = [
            { type: 'fight', score: this.fightScore(world, entityId, hostilePositions) },
            { type: 'flee', score: this.fleeScore(world, entityId, hostilePositions) },
            { type: 'brawl', score: this.brawlScore(world, entityId) },
            { type: 'tantrum', score: this.tantrumScore(world, entityId) },
            { type: 'eat', score: this.eatScore(world, entityId, foodAvailable) },
            { type: 'drink', score: this.drinkScore(world, entityId) },
            { type: 'sleep', score: this.sleepScore(world, entityId) },
            { type: 'heal', score: this.healScore(world) },
            { type: 'rescue', score: this.rescueScore(world) },
            { type: 'socialize', score: this.socializeScore(world, entityId) },
            { type: 'work', score: this.workScore(world, entityId) },
            { type: 'wander', score: WANDER_SCORE },
        ];
        scores.sort((a, b) => b.score - a.score);
        return scores[0].type;
    }

    fightScore(world, entityId, hostilePositions) {
        if (!this.dangerNear(world, entityId, hostilePositions)) {
            return 0;
        }
        return this.isBrave(world, entityId) ? FLEE_SCORE : 0;
    }

    fleeScore(world, entityId, hostilePositions) {
        if (!this.dangerNear(world, entityId, hostilePositions)) {
            return 0;
        }
        return this.isBrave(world, entityId) ? 0 : FLEE_SCORE;
    }

    tantrumScore(world, entityId) {
        const morale = world.getComponent(entityId, 'morale');
        if (!morale) {
            return 0;
        }
        const tantruming = world.getComponent(entityId, 'tantruming');
        const raging =
            morale.value <= morale.tantrum ||
            (tantruming && morale.value < morale.tantrum + TANTRUM_EXIT_MARGIN);
        return raging ? TANTRUM_SCORE : 0;
    }

    // riposte (on m'a frappé) prime sur l'ivresse (je cherche la bagarre)
    brawlScore(world, entityId) {
        const provoked = world.getComponent(entityId, 'provoked');
        if (provoked && world.getComponent(provoked.by, 'position')) {
            return PROVOKED_SCORE;
        }
        if (world.getComponent(entityId, 'drunk') && this.rivalNear(world, entityId)) {
            return DRUNK_BRAWL_SCORE;
        }
        return 0;
    }

    rivalNear(world, entityId) {
        const position = world.getComponent(entityId, 'position');
        return world.query('worker', 'position').some((otherId) => {
            if (otherId === entityId) {
                return false;
            }
            const other = world.getComponent(otherId, 'position');
            return (
                Math.max(Math.abs(other.x - position.x), Math.abs(other.y - position.y)) <=
                BRAWL_RANGE
            );
        });
    }

    dangerNear(world, entityId, hostilePositions) {
        const position = world.getComponent(entityId, 'position');
        return hostilePositions.some(
            (hostile) =>
                Math.max(Math.abs(hostile.x - position.x), Math.abs(hostile.y - position.y)) <=
                FLEE_RANGE
        );
    }

    isBrave(world, entityId) {
        const health = world.getComponent(entityId, 'health');
        const combat = world.getComponent(entityId, 'combat');
        if (!health || !combat || combat.courage === undefined) {
            return false;
        }
        return health.value / health.max >= combat.courage;
    }

    eatScore(world, entityId, foodAvailable) {
        const hunger = world.getComponent(entityId, 'hunger');
        if (!hunger || !foodAvailable || hunger.value < hunger.threshold) {
            return 0;
        }
        if (world.getComponent(entityId, 'noFoodAccess')) {
            return 0;
        }
        return hunger.value;
    }

    drinkScore(world, entityId) {
        const thirst = world.getComponent(entityId, 'thirst');
        if (!thirst || thirst.value < thirst.threshold) {
            return 0;
        }
        if (world.getComponent(entityId, 'noWaterAccess')) {
            return 0;
        }
        return thirst.value;
    }

    sleepScore(world, entityId) {
        const fatigue = world.getComponent(entityId, 'fatigue');
        if (!fatigue) {
            return 0;
        }
        const sleeping = world.getComponent(entityId, 'sleeping');
        const wantsSleep =
            fatigue.value >= fatigue.threshold || (sleeping && fatigue.value > 0);
        return wantsSleep ? Math.max(fatigue.value, fatigue.threshold) : 0;
    }

    // soigner un blessé déjà à l'infirmerie prime sur le secourir depuis le champ
    healScore(world) {
        return this.hasWounded(world, true) ? HEAL_SCORE : 0;
    }

    // secourir : un blessé gît hors de l'infirmerie et une infirmerie existe pour l'accueillir
    rescueScore(world) {
        return this.hasWounded(world, false) ? RESCUE_SCORE : 0;
    }

    hasWounded(world, inInfirmary) {
        if (!this.infirmary || this.infirmary.list().length === 0) {
            return false;
        }
        return world.query('injury', 'position').some((woundedId) => {
            const position = world.getComponent(woundedId, 'position');
            return this.infirmary.has(position.x, position.y) === inInfirmary;
        });
    }

    // besoin social : sous le seuil de solitude, on cherche un camarade — mais
    // seulement si un autre nain existe (sinon on reste au travail). Hystérésis via
    // le marqueur 'socializing' : on continue jusqu'à combler le besoin (valeur 0).
    socializeScore(world, entityId) {
        const social = world.getComponent(entityId, 'social');
        if (!social) {
            return 0;
        }
        const socializing = world.getComponent(entityId, 'socializing');
        const wantsCompany =
            social.value >= social.threshold || (socializing && social.value > 0);
        if (!wantsCompany || !this.companionExists(world, entityId)) {
            return 0;
        }
        return SOCIALIZE_SCORE;
    }

    companionExists(world, entityId) {
        return world
            .query('worker', 'position')
            .some((otherId) => otherId !== entityId);
    }

    workScore(world, entityId) {
        const hasJob = world.getComponent(entityId, 'currentJob') !== undefined;
        return hasJob || this.jobBoard.hasAvailableJobs() ? WORK_SCORE : 0;
    }
}
