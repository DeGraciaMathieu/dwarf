const FLEE_SCORE = 200;
const FLEE_RANGE = 6;
const PROVOKED_SCORE = 190;
const DRUNK_BRAWL_SCORE = 90;
const BRAWL_RANGE = 5;
const BRAWL_TEMPER_MIN = 0.5; // en dessous, un ivrogne reste pacifique
const TANTRUM_SCORE = 150;
const TANTRUM_EXIT_MARGIN = 15;
const HEAL_SCORE = 62;
const RESCUE_SCORE = 60;
const SOCIALIZE_SCORE = 50;
// aux aguets : un hostile est proche mais ne peut pas m'atteindre — on cesse de
// travailler/errer (donc on ne dérive pas vers lui) sans pour autant paniquer,
// mais un vrai besoin (faim, soif…) reprend le dessus
const HOLD_SCORE = 20;
const WORK_SCORE = 10;
const WANDER_SCORE = 1;

// bravoure : le seuil de fuite (santé en deçà de laquelle on fuit) part de
// `combat.courage` et se module. La santé reste le facteur dominant ; ces termes ne
// font qu'avancer ou reculer le moment où le nain craque. Seuil planché (on finit
// toujours par fuir très bas) mais non plafonné (courage énorme = fuit toujours).
const COURAGE_FLOOR = 0.15;
const MORALE_COURAGE_INFLUENCE = 0.25; // moral au-dessus/en dessous de la baseline
const PERSONALITY_COURAGE_INFLUENCE = 0.3; // trait `bravery` (0 = trouillard, 1 = tête brûlée)
const ALLY_COURAGE_STEP = 0.08; // par allié combattant à portée
const ALLY_COURAGE_RANGE = 5;
const ALLY_COURAGE_CAP = 0.24; // effet de groupe plafonné (≈ 3 alliés)

export class ArbiterSystem {
    constructor(jobBoard, infirmary, threatField) {
        this.jobBoard = jobBoard;
        this.infirmary = infirmary;
        this.threatField = threatField;
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
            { type: 'fight', score: this.fightScore(world, entityId) },
            { type: 'flee', score: this.fleeScore(world, entityId) },
            { type: 'hold', score: this.holdScore(world, entityId, hostilePositions) },
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

    fightScore(world, entityId) {
        if (!this.dangerNear(world, entityId)) {
            return 0;
        }
        return this.isBrave(world, entityId) ? FLEE_SCORE : 0;
    }

    fleeScore(world, entityId) {
        if (!this.dangerNear(world, entityId)) {
            return 0;
        }
        return this.isBrave(world, entityId) ? 0 : FLEE_SCORE;
    }

    // aux aguets : un hostile est proche à vol d'oiseau mais ne peut pas m'atteindre
    // (muré ou derrière une porte). On ne fuit pas — on n'est pas en danger — mais on
    // tient sa position au lieu d'errer vers lui.
    holdScore(world, entityId, hostilePositions) {
        if (this.dangerNear(world, entityId)) {
            return 0;
        }
        return this.alertNear(world, entityId, hostilePositions) ? HOLD_SCORE : 0;
    }

    alertNear(world, entityId, hostilePositions) {
        const position = world.getComponent(entityId, 'position');
        return hostilePositions.some(
            (hostile) =>
                Math.max(Math.abs(hostile.x - position.x), Math.abs(hostile.y - position.y)) <=
                FLEE_RANGE
        );
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
        if (
            world.getComponent(entityId, 'drunk') &&
            this.isHotHeaded(world, entityId) &&
            this.someoneNear(world, entityId)
        ) {
            return DRUNK_BRAWL_SCORE;
        }
        return 0;
    }

    // caractère : seuls les tempéraments assez vifs cherchent la bagarre (défaut neutre)
    isHotHeaded(world, entityId) {
        const personality = world.getComponent(entityId, 'personality');
        return (personality?.temper ?? 0.5) >= BRAWL_TEMPER_MIN;
    }

    someoneNear(world, entityId) {
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

    // danger réel : un hostile est à portée en distance de cheminement — un ennemi
    // muré ou derrière une porte (distance Infinity) ne provoque ni panique ni charge
    dangerNear(world, entityId) {
        const position = world.getComponent(entityId, 'position');
        return this.threatField.distanceAt(position.x, position.y) <= FLEE_RANGE;
    }

    isBrave(world, entityId) {
        const health = world.getComponent(entityId, 'health');
        const combat = world.getComponent(entityId, 'combat');
        if (!health || !combat || combat.courage === undefined) {
            return false;
        }
        return health.value / health.max >= this.courageThreshold(world, entityId, combat.courage);
    }

    // seuil de fuite effectif : base (data) − ce qui donne du cran (bon moral,
    // tempérament brave, alliés au combat). Planché pour qu'on finisse toujours par
    // fuir à l'agonie, jamais plafonné pour préserver un courage volontairement énorme.
    courageThreshold(world, entityId, base) {
        return Math.max(
            COURAGE_FLOOR,
            base -
                this.moraleCourage(world, entityId) -
                this.personalityCourage(world, entityId) -
                this.allyCourage(world, entityId)
        );
    }

    moraleCourage(world, entityId) {
        const morale = world.getComponent(entityId, 'morale');
        if (!morale) {
            return 0;
        }
        return (MORALE_COURAGE_INFLUENCE * (morale.value - morale.baseline)) / morale.max;
    }

    personalityCourage(world, entityId) {
        const bravery = world.getComponent(entityId, 'personality')?.bravery ?? 0.5;
        return PERSONALITY_COURAGE_INFLUENCE * (bravery - 0.5);
    }

    // effet de groupe : chaque camarade qui se bat déjà à portée rassure (marqueur
    // `fighting`, donc l'état du tick précédent — pas de cascade intra-tick)
    allyCourage(world, entityId) {
        const position = world.getComponent(entityId, 'position');
        let allies = 0;
        for (const otherId of world.query('worker', 'fighting', 'position')) {
            if (otherId === entityId) {
                continue;
            }
            const other = world.getComponent(otherId, 'position');
            if (
                Math.max(Math.abs(other.x - position.x), Math.abs(other.y - position.y)) <=
                ALLY_COURAGE_RANGE
            ) {
                allies++;
            }
        }
        return Math.min(ALLY_COURAGE_CAP, ALLY_COURAGE_STEP * allies);
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
