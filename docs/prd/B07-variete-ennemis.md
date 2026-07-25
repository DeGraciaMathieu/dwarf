# PRD B07 — Variété d'ennemis

**Lot :** B — Tension de combat · **Point :** 7 · **Statut :** ✅ Fait · **Impact / Effort :** Fort / Moyen

## Problème

Il n'existe qu'un seul ennemi (`goblin` dans `creatures.json`), identique à chaque vague. Aucune diversité tactique : le joueur affronte toujours la même menace, ce qui rend le combat prévisible et sans montée en puissance.

## Objectif

Introduire plusieurs archétypes d'ennemis, **majoritairement en data**, pour varier la menace et forcer des réponses différentes (équipement, positionnement).

## Périmètre

**Inclus**
- Nouveaux archétypes via `creatures.json` : ex. **brute** (PV/dégâts élevés, lent), **archer** (attaque à distance), **chef** (buff de vague / plus coriace).
- Composition de vague : le `GoblinSpawnSystem` choisit un mix d'archétypes selon la vague.
- Le minimum de code nécessaire pour l'attaque à distance de l'archer (si retenue).

**Exclus**
- IA de groupe avancée (coordination) — hors périmètre.
- Récompenses de butin spécifiques.

## Exigences fonctionnelles

1. Ajouter des définitions d'ennemis dans `creatures.json` réutilisant les composants existants (`hostile`, `health`, `combat`, `wander`).
2. L'archer nécessite une portée d'attaque > 1 : introduire un champ `combat.range` lu par `combatSystem.js` (défaut 1, rétrocompatible).
3. `GoblinSpawnSystem` compose la vague à partir d'une table d'archétypes pondérée par le numéro de vague.
4. Le chef applique un effet de vague simple (ex. +1 aux dégâts des ennemis présents) via un composant/marqueur, pas de logique en dur.

## Conception technique

- Contenu d'abord (`src/data/creatures.json`), conformément à « ajouter du contenu ne doit pas demander de nouveau code si les composants existent déjà ».
- Étendre `combatSystem.js` pour respecter `combat.range` (portée) — changement minimal et rétrocompatible.
- Étendre la sélection d'archétypes dans `goblinSpawnSystem.js`.
- Réutiliser `kill()` de `death.js` pour toutes les morts d'ennemis.

## Critères d'acceptation

- Une vague avancée contient un mélange d'archétypes visibles à leur glyphe/couleur.
- L'archer inflige des dégâts sans être adjacent.
- La brute encaisse nettement plus qu'un gobelin standard.
- Aucune régression : un ennemi sans `combat.range` frappe toujours au corps à corps.

## Tests

- Scénario `tests/` : archer à distance 3 inflige des dégâts ; gobelin standard (range défaut) non.
- Scénario : la composition de vague inclut les archétypes attendus au-delà d'un certain numéro.
