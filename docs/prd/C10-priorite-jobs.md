# PRD C10 — Priorité de jobs

**Lot :** C — Contrôle joueur · **Point :** 10 · **Statut :** ✅ Fait · **Impact / Effort :** Fort / Moyen

## Problème

`src/core/jobBoard.js` sert le job **disponible le plus proche** (distance Chebyshev), sans notion de priorité. Un job utile posté tard passe après un job ancien peu important. Le joueur n'a aucun moyen de dire « creuse ça en premier » ou « ce mur est urgent ».

## Objectif

Introduire une **priorité de job** ordonnant `claim()` par (priorité, distance), et un outil UI pour marquer une désignation comme prioritaire.

## Périmètre

**Inclus**
- Champ `priority` sur les jobs (défaut = normal).
- `jobBoard.claim()` sélectionne d'abord par priorité, puis par distance.
- Outil de désignation « urgent » dans l'UI (modificateur ou bouton) posant des jobs à priorité élevée.
- Indice visuel des désignations prioritaires (couleur distincte au rendu).

**Exclus**
- Priorités par type de tâche globales / matrice de métiers (relié à C11).
- Réordonnancement automatique par dépendances.

## Exigences fonctionnelles

1. `post(job)` accepte une `priority` (enum simple : haute / normale, extensible).
2. `claim(entityId, position)` trie les jobs disponibles par priorité décroissante puis distance croissante.
3. L'UI (`designation.js`) permet de désigner en mode prioritaire ; les jobs créés portent la priorité haute.
4. `renderer.js` distingue visuellement les désignations prioritaires.

## Conception technique

- Modifier `src/core/jobBoard.js` (tri de `claim`), `src/ui/designation.js` (outil), `src/ui/renderer.js` (rendu).
- Rester rétrocompatible : jobs sans `priority` traités comme normaux.
- `core/` reste générique : la priorité est une donnée sur le job, pas une règle de jeu.

## Critères d'acceptation

- Deux jobs disponibles, l'un prioritaire plus loin, l'autre normal plus proche → le nain réclame le prioritaire.
- À priorité égale, le plus proche est réclamé (comportement actuel préservé).
- Une désignation urgente est visuellement identifiable.

## Tests

- Scénario `tests/` : `claim` retourne le job prioritaire même s'il est plus éloigné ; à priorité égale, retourne le plus proche.
