import { EVENTS } from '../events/events.js';

// signale au journal qu'un chantier vient de devenir inaccessible : émet une
// seule fois à la transition, en gardant la liste des jobs déjà signalés.
// Un job qui redevient atteignable puis se rebloque est re-signalé.
export class JobAlertSystem {
    constructor(jobBoard) {
        this.jobBoard = jobBoard;
        this.reported = new Set();
    }

    update(world, eventBus) {
        const current = new Set();
        for (const job of this.jobBoard.jobs) {
            if (!job.unreachable) {
                continue;
            }
            current.add(job);
            if (!this.reported.has(job)) {
                eventBus.emit(EVENTS.JOB_UNREACHABLE, { job });
            }
        }
        this.reported = current;
    }
}
