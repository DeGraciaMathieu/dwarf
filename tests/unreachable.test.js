import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JobBoard } from '../src/core/jobBoard.js';

test('resetUnreachable : un dig ne débloque que les jobs d\'accès proches', () => {
    const board = new JobBoard();
    board.post({ type: 'dig', target: { x: 3, y: 0 } }); // proche de l'origine
    board.post({ type: 'dig', target: { x: 25, y: 0 } }); // à l'autre bout
    const near = board.jobs[0];
    const far = board.jobs[1];
    board.markUnreachable(near); // 'access' par défaut
    board.markUnreachable(far);

    // creuser en (2,0) rouvre le voisinage
    board.resetUnreachable({ x: 2, y: 0 });

    assert.equal(near.unreachable, false, 'le job proche redevient tentable');
    assert.equal(far.unreachable, true, 'le job lointain reste bloqué');
});

test('resetUnreachable : une pénurie débloquée relâche les jobs supply partout', () => {
    const board = new JobBoard();
    board.post({ type: 'build', target: { x: 25, y: 0 } }); // loin de l'origine
    const job = board.jobs[0];
    board.markUnreachable(job, 'supply');

    // un abattage lointain produit une ressource : le job en pénurie redevient tentable
    board.resetUnreachable({ x: 2, y: 0 });

    assert.equal(job.unreachable, false);
});
