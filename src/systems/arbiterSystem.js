const FLEE_SCORE = 200;
const FLEE_RANGE = 6;
const TANTRUM_SCORE = 150;
const TANTRUM_EXIT_MARGIN = 15;
const WORK_SCORE = 10;
const WANDER_SCORE = 1;

export class ArbiterSystem {
    constructor(jobBoard) {
        this.jobBoard = jobBoard;
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
        const scores = [
            { type: 'fight', score: this.fightScore(world, entityId, hostilePositions) },
            { type: 'flee', score: this.fleeScore(world, entityId, hostilePositions) },
            { type: 'tantrum', score: this.tantrumScore(world, entityId) },
            { type: 'eat', score: this.eatScore(world, entityId, foodAvailable) },
            { type: 'drink', score: this.drinkScore(world, entityId) },
            { type: 'sleep', score: this.sleepScore(world, entityId) },
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

    workScore(world, entityId) {
        const hasJob = world.getComponent(entityId, 'currentJob') !== undefined;
        return hasJob || this.jobBoard.hasAvailableJobs() ? WORK_SCORE : 0;
    }
}
