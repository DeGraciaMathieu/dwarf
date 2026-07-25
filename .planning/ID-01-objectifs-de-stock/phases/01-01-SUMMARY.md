# Phase 01 Plan 01 : Boucle de réconciliation — Summary

**La boucle de réconciliation des objectifs de stock est en place : un `StewardSystem` générique compare chaque tick le stock observé à la cible déclarée et poste ou retire les jobs de craft nécessaires, avec garde-fous atelier et ingrédient.**

## Accomplishments

- `jobBoard.cancel(job)` : retrait d'un job uniquement s'il n'est pas réclamé — un nain déjà au travail va au bout (service générique, aucune logique métier dans `core/`).
- `src/systems/stewardSystem.js` : réconciliation par objectif `{ recipe, target }`, recomptage complet à chaque tick sans état conservé (convention d'état volatil auto-réparable). Le stock est dérivé des composants de la définition d'objet (`item` + `drink` pour la bière) — aucune chaîne `beer` dans le code du steward. Postage plafonné par les ingrédients libres (mêmes réservations `currentJob.materialId` que `materials.js`, sans réserver), et conditionné à l'existence d'un atelier compatible (même tolérance que `craftSystem` pour les ateliers sans type). Retrait du surplus limité aux jobs non réclamés.
- `src/main.js` : objectifs déclarés comme liste vive `[{ recipe: 'beer', target: 3 }]`, `StewardSystem` enregistré après `MigrantSystem` et avant `ArbiterSystem` pour que les jobs postés soient réclamables au même tick. Bouton « brasser » conservé (retrait prévu en phase 02).
- 4 scénarios macro dans `tests/steward.test.js` : convergence vers la cible, invariant de non-sur-postage vérifié à chaque tick, retrait du surplus non réclamé avec job réclamé allant à son terme, attente silencieuse sans ingrédient puis reprise à l'apparition d'un brassable.

## Files Created/Modified

- `src/core/jobBoard.js` — ajout de `cancel(job)`.
- `src/systems/stewardSystem.js` — nouveau système de réconciliation.
- `src/main.js` — import, donnée d'objectifs, enregistrement dans l'ordre du tick.
- `tests/steward.test.js` — 4 scénarios macro (nouveau).
- `tests/helpers.js` — option `objectives` de `setupColony` (enregistre le steward au même point du tick que `main.js`).

## Decisions Made

- `setupColony` étendu avec une option `objectives` plutôt qu'un enregistrement manuel dans les tests : l'ordre du tick (steward avant arbitre) est ainsi identique en test et en jeu.
- Le steward ne réserve jamais d'ingrédient : il compte seulement les ingrédients libres pour plafonner le postage ; la réservation reste au `craftSystem` à l'exécution.
- La cible du postage utilise la position du premier atelier compatible trouvé (même forme de job que le bouton « brasser ») ; `jobAssignmentSystem` et `craftSystem` gèrent ensuite le trajet réel.

## Issues Encountered

Aucun. Les 3 tâches sont passées sans déviation : suite complète verte (81 tests : 77 existants + 4 nouveaux), aucune mention de `beer` dans le steward, aucun état conservé entre les ticks.

## Next Step

Phase 01 complète → phase 02 « Réglage et visibilité joueur » (UI de réglage de la cible N, affichage stock/cible, retrait du bouton « brasser », mise à jour des skills et de `PATCHNOTES.md`).
