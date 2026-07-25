# PRD B06 — Rééquilibrage des vagues

**Lot :** B — Tension de combat · **Point :** 6 · **Statut :** À faire · **Impact / Effort :** Fort / Moyen

## Problème

Les invasions ne créent pas de tension (`src/systems/goblinSpawnSystem.js`) :
- 1ʳᵉ vague à **tick 500** (~100 s) : les nains sont déjà installés.
- Croissance lente (+1 gobelin toutes les 2 vagues), **plafond de 6** ennemis simultanés.
- Cadence min de 400 ticks entre vagues.
- Spawn sur bords aléatoires éloignés, laissant beaucoup de temps de réaction.

Avec 5 nains équipés, le combat est mathématiquement gagné d'avance.

## Objectif

Recalibrer le rythme, la taille et l'escalade des vagues pour produire une **courbe de menace tangible**, tout en restant paramétrable via des constantes claires.

## Périmètre

**Inclus**
- Ajustement des constantes de timing (première vague plus tôt, cadence plus serrée).
- Escalade de taille plus marquée avec population **et** richesse (équipement/ateliers).
- Relèvement ou suppression du plafond dur de 6.

**Exclus**
- Nouveaux types d'ennemis (PRD B07).
- IA de déplacement (PRD B08, B09).

## Exigences fonctionnelles

1. Constantes de vague regroupées et commentées en tête de `goblinSpawnSystem.js` : `FIRST_WAVE_DELAY`, `BASE_INTERVAL`, `MIN_INTERVAL`, `INTERVAL_ACCEL`, `MAX_WAVE_SIZE`.
2. La taille de vague scale sur un indicateur de richesse (nb d'armes/armures/ateliers) en plus de la population.
3. Le plafond devient élevé ou dérivé (ex. proportionnel à la population) plutôt que figé à 6.
4. Valeurs choisies pour que la 1ʳᵉ vague arrive avant l'installation complète mais après un court sursis.

## Conception technique

- Modifier uniquement `src/systems/goblinSpawnSystem.js`.
- Garder le spawn en clusters de bord existant.
- Exposer le prochain tick de spawn (utile au HUD, PRD A04).

## Critères d'acceptation

- La première vague arrive nettement plus tôt qu'au tick 500.
- Une colonie riche/peuplée subit des vagues sensiblement plus grosses qu'une petite colonie.
- Le nombre d'ennemis simultanés peut dépasser 6 en fin de partie.

## Tests

- Scénario `tests/` : à population et richesse données, la fonction de taille de vague retourne les valeurs attendues (test déterministe de la formule).
- Scénario : le tick de première vague correspond à la nouvelle constante.
