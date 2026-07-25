# PRD B09 — Fuite avec destination sûre

**Lot :** B — Tension de combat · **Point :** 9 · **Statut :** ✅ Fait · **Impact / Effort :** Moyen / Moyen

## Problème

`src/systems/fleeSystem.js` fait fuir un nain « loin » du gobelin le plus proche, sans destination. Contre plusieurs ennemis, le nain peut être piégé (toutes les directions mènent vers un ennemi) ou acculé contre le bord du monde. Les fortifications, portes (`blocksHostiles`) et zones sûres n'ont aucun sens tactique puisque personne ne fuit vers elles.

## Objectif

Faire fuir les nains **vers un refuge** (zone sûre / derrière une porte) plutôt que dans la direction opposée immédiate, pour donner une valeur défensive aux constructions.

## Périmètre

**Inclus**
- Définition d'un refuge : case sûre atteignable, éloignée des hostiles, idéalement derrière une tuile `blocksHostiles`.
- Pathfinding de fuite vers le refuge choisi.
- Repli sur le comportement actuel (« s'éloigner ») si aucun refuge n'existe.

**Exclus**
- Nouvelle zone joueur « abri » dédiée (peut réutiliser une zone existante ou une heuristique).
- Comportement de groupe / regroupement coordonné.

## Exigences fonctionnelles

1. Sélectionner une case refuge : maximiser la distance minimale aux hostiles tout en restant atteignable, avec bonus si le chemin passe une porte `blocksHostiles`.
2. Se déplacer vers le refuge via `findPath`, en recalculant si le refuge devient dangereux.
3. Fallback : si aucun refuge valable, conserver l'algorithme `stepAway` actuel.
4. Conserver le malus de moral « fled » existant.

## Conception technique

- Modifier `src/systems/fleeSystem.js`.
- Réutiliser la grille terrain et les tuiles `blocksHostiles` (déjà dans `tiles.json`).
- Garder la fuite comme activité pilotée par l'arbitre (ne pas décider soi-même du changement d'état).

## Critères d'acceptation

- Face à plusieurs ennemis, le nain se dirige vers une case durablement plus sûre plutôt que d'osciller.
- En présence d'une porte `blocksHostiles`, le nain tend à se replier derrière.
- Sans refuge disponible, le comportement reste au moins équivalent à l'actuel (pas de régression).

## Tests

- Scénario `tests/` : nain entre deux ennemis avec une porte à proximité → la trajectoire de fuite converge vers le refuge derrière la porte.
- Scénario : aucun refuge → comportement `stepAway` inchangé.
