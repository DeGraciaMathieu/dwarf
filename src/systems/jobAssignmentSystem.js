export class JobAssignmentSystem {
    constructor(jobBoard) {
        this.jobBoard = jobBoard;
    }

    update(world) {
        for (const entityId of world.query('worker', 'position')) {
            const activity = world.getComponent(entityId, 'activity');
            const currentJob = world.getComponent(entityId, 'currentJob');
            const working = activity?.type === 'work';
            if (currentJob && !working) {
                this.jobBoard.release(currentJob.job);
                world.removeComponent(entityId, 'currentJob');
                continue;
            }
            if (!currentJob && working) {
                const position = world.getComponent(entityId, 'position');
                const job = this.jobBoard.claim(entityId, position);
                if (job) {
                    world.addComponent(entityId, 'currentJob', { job, path: null, progress: 0 });
                }
            }
        }
    }
}
