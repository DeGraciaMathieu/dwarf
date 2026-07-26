# PRD D13 — resetUnreachable ciblé

**Lot :** D — Robustesse · **Point :** 13 · **Statut :** ✅ Fait · **Impact / Effort :** Moyen / Moyen

## Problème

`src/core/jobBoard.js` expose `resetUnreachable()` qui **déverrouille tous** les jobs marqués `unreachable` dès qu'un seul dig/chop/build réussit (appelé depuis `digSystem.js` etc.). Conséquences :
- Des jobs réellement inaccessibles (poche isolée) sont re-tentés puis re-bloqués en boucle, gaspillant des réservations et des cycles.
- Le déverrouillage n'a de sens que pour les jobs **proches** du changement de terrain (une case creusée peut ouvrir un chemin voisin), pas pour tout le plateau.

## Objectif

Restreindre la réinitialisation aux jobs susceptibles d'être réellement débloqués par le changement de terrain qui vient de survenir.

## Périmètre

**Inclus**
- `resetUnreachable(origin)` prend la position du changement de terrain et ne relâche que les jobs dans un rayon pertinent.
- Adaptation des appelants (dig/chop/build) pour transmettre la case modifiée.

**Exclus**
- Recalcul de connectivité complet du terrain (trop coûteux ; le rayon est une heuristique suffisante).
- Suppression automatique des jobs définitivement inaccessibles (pourrait être un PRD ultérieur, relié à A02).

## Exigences fonctionnelles

1. `resetUnreachable(origin)` ne réinitialise `unreachable` que pour les jobs dont la cible est dans un rayon configurable autour de `origin`.
2. Sans argument (rétrocompat), conserver le comportement global OU migrer tous les appelants.
3. Les jobs hors rayon restent `unreachable` jusqu'à un changement pertinent proche.

## Conception technique

- Modifier `src/core/jobBoard.js` et les systèmes qui appellent `resetUnreachable()` (dig, chop, build).
- `core/` reste générique : le rayon est un paramètre, pas une règle de jeu spécifique.
- État `unreachable` reste volatil/auto-réparable.

## Critères d'acceptation

- Creuser une case ne déverrouille que les jobs voisins, pas ceux à l'autre bout du plateau.
- Un job dans une poche isolée reste `unreachable` tant qu'aucun changement proche ne survient.
- Aucune régression : un chemin réellement ouvert par un dig débloque bien le job adjacent.

## Tests

- Scénario `tests/` : deux jobs unreachable, l'un proche d'un dig réussi, l'autre lointain → seul le proche est réinitialisé.
