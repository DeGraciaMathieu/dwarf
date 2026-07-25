export class JobBoard {
    constructor() {
        this.jobs = [];
    }

    post(job) {
        this.jobs.push({ ...job, claimedBy: null, unreachable: false });
    }

    claim(entityId, position) {
        let best = null;
        let bestDistance = Infinity;
        for (const job of this.jobs) {
            if (job.claimedBy !== null || job.unreachable) {
                continue;
            }
            const distance = Math.max(
                Math.abs(job.target.x - position.x),
                Math.abs(job.target.y - position.y)
            );
            if (distance < bestDistance) {
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

    markUnreachable(job) {
        job.claimedBy = null;
        job.unreachable = true;
    }

    resetUnreachable() {
        for (const job of this.jobs) {
            job.unreachable = false;
        }
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

    hasJobAt(x, y, type) {
        return this.jobs.some(
            (job) => job.type === type && job.target.x === x && job.target.y === y
        );
    }
}
