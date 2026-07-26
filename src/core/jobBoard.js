// rayon (Chebyshev) autour d'un changement de terrain dans lequel un job
// inaccessible redevient tentable — au-delà, il attend un changement plus proche
const RESET_RADIUS = 6;

export class JobBoard {
    constructor() {
        this.jobs = [];
    }

    post(job) {
        this.jobs.push({ priority: 0, ...job, claimedBy: null, unreachable: false });
    }

    claim(entityId, position) {
        let best = null;
        let bestPriority = -Infinity;
        let bestDistance = Infinity;
        for (const job of this.jobs) {
            if (job.claimedBy !== null || job.unreachable) {
                continue;
            }
            const priority = job.priority ?? 0;
            const distance = Math.max(
                Math.abs(job.target.x - position.x),
                Math.abs(job.target.y - position.y)
            );
            // priorité d'abord, distance ensuite
            if (priority > bestPriority || (priority === bestPriority && distance < bestDistance)) {
                bestPriority = priority;
                bestDistance = distance;
                best = job;
            }
        }
        if (best) {
            best.claimedBy = entityId;
        }
        return best;
    }

    release(job) {
        job.claimedBy = null;
    }

    // reason : 'access' (chemin bloqué, spatial) ou 'supply' (matériau/atelier manquant)
    markUnreachable(job, reason = 'access') {
        job.claimedBy = null;
        job.unreachable = true;
        job.blockedBy = reason;
    }

    // les jobs bloqués par pénurie ('supply') redeviennent toujours tentables (une
    // ressource/un atelier a pu apparaître) ; ceux bloqués par l'accès seulement
    // près du changement de terrain `origin` (rien sans origine)
    resetUnreachable(origin) {
        for (const job of this.jobs) {
            if (!job.unreachable) {
                continue;
            }
            if (job.blockedBy === 'supply') {
                job.unreachable = false;
            } else if (origin && this.nearOrigin(job.target, origin)) {
                job.unreachable = false;
            }
        }
    }

    nearOrigin(target, origin) {
        return Math.max(Math.abs(target.x - origin.x), Math.abs(target.y - origin.y)) <= RESET_RADIUS;
    }

    complete(job) {
        this.jobs = this.jobs.filter((other) => other !== job);
    }

    cancel(job) {
        if (job.claimedBy !== null) {
            return;
        }
        this.jobs = this.jobs.filter((other) => other !== job);
    }

    hasAvailableJobs() {
        return this.jobs.some((job) => job.claimedBy === null && !job.unreachable);
    }

    countAvailable() {
        return this.jobs.filter((job) => job.claimedBy === null && !job.unreachable).length;
    }

    countClaimed() {
        return this.jobs.filter((job) => job.claimedBy !== null).length;
    }

    countUnreachable() {
        return this.jobs.filter((job) => job.unreachable).length;
    }

    hasJobAt(x, y, type) {
        return this.jobs.some(
            (job) => job.type === type && job.target.x === x && job.target.y === y
        );
    }
}
